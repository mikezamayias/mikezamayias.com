// server/api/og/[type]/[slug].get.ts
//
// Server-side OG image renderer. Output: 1200x630 PNG. Cached at edge
// (5min s-maxage) via the Cache-Control middleware (Plan F Task 2).
//
// Font loading: JetBrains Mono is read from Nitro's serverAssets storage
// (server/assets/fonts/...). This is the only path that survives the
// Firebase Functions Gen2 bundle — `public/` only ships to Hosting, the
// function package has no copy of it at runtime.
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as Sentry from "@sentry/nuxt";
import { useFirebaseAdmin } from "~/server/utils/firebase";
import { isH3Error } from "~/server/utils/errors";

const TYPES = new Set(["work", "writing"]);
// Plan I follow-up: EN-only. Type kept as a single-member union so
// re-adding EL later is a one-line change.
type SupportedLocale = "en";
type LocalizedOgFields = { name?: string; title?: string; desc?: string; sub?: string };

async function loadFont(): Promise<Buffer> {
    const storage = useStorage("assets:server");
    const data = await storage.getItemRaw<Buffer | Uint8Array>("fonts/JetBrainsMono-Regular.ttf");
    if (!data) {
        throw createError({
            statusCode: 500,
            message: "OG font asset missing",
        });
    }
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export default defineEventHandler(async (event) => {
    const type = getRouterParam(event, "type");
    const slug = getRouterParam(event, "slug");
    const requestedLocale: SupportedLocale = "en";
    if (!type || !slug || !TYPES.has(type)) {
        throw createError({ statusCode: 404, message: "Unknown OG type" });
    }

    // Resolve Firestore-backed title/subtitle when possible; degrade to a
    // slug-only card if Firestore is unavailable (no ADC during prerender,
    // CI smoke without credentials, transient outage). Social crawlers
    // cache 5xx for hours, so a degraded image beats a broken preview.
    // Real not-found / unpublished still returns 404 so we don't silently
    // mint cards for missing docs.
    // `useFirebaseAdmin` is a Nuxt composable (`use*` prefix is treated as a
    // hook by lint rules), so it has to run at the top of the handler — not
    // inside the try block below. Today it only throws when the runtime
    // config is missing `firebaseProjectId` AND no ADC is available, which
    // means env vars weren't injected; that is an operator misconfiguration
    // and should fail loudly rather than degrade silently.
    const { firestore } = useFirebaseAdmin();
    const collection = type === "work" ? "work" : "writing";
    let title: string = slug;
    let subtitle = "";
    let degraded = false;

    try {
        const snap = await firestore.doc(`${collection}/${slug}`).get();
        if (!snap.exists) throw createError({ statusCode: 404 });
        const data = snap.data() as {
            published?: boolean;
            locale?: Partial<Record<SupportedLocale, LocalizedOgFields>>;
        };
        if (!data.published) throw createError({ statusCode: 404 });

        const localized = data.locale?.[requestedLocale] ?? data.locale?.en;
        title = localized?.name ?? localized?.title ?? slug;
        subtitle = localized?.desc ?? localized?.sub ?? "";
    } catch (err: unknown) {
        // Re-throw any h3-shaped error (404 for missing doc / unpublished,
        // and any future 4xx like 410 archived). Narrow filtering on 404
        // alone would silently degrade those into a card for content that
        // does not exist.
        if (isH3Error(err)) throw err;
        // Tag the gRPC status code so Sentry groups transient outages
        // (UNAVAILABLE, DEADLINE_EXCEEDED) separately from real bugs
        // (PERMISSION_DENIED, INVALID_ARGUMENT). Without this the capture
        // frequency becomes one undifferentiated number.
        const errorCode = (err as { code?: string | number })?.code;
        const errorMessage = err instanceof Error ? err.message : String(err);
        Sentry.captureException(err, {
            tags: {
                component: "og-image",
                phase: "firestore-read",
                firestoreErrorCode: errorCode !== undefined ? String(errorCode) : "unknown",
            },
            extra: { type, slug, requestedLocale, errorCode, errorMessage },
        });
        degraded = true;
    }

    const font = await loadFont();

    // Silent-failure fix (I1): wrap the Satori + Resvg render path. Without
    // this, a corrupt glyph / OOM in @resvg / unexpected emoji bubbles as
    // an uncaught 500 with no Sentry breadcrumb. Social crawlers (Twitter,
    // LinkedIn, Discord) cache 500s for hours, so a silent failure here
    // permanently breaks link previews until the cache rolls. Return 502
    // with a Sentry capture so we know which doc broke.
    try {
        const svg = await satori(
            {
                type: "div",
                props: {
                    style: {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        width: "100%",
                        height: "100%",
                        padding: "60px",
                        background: "#f5f4ee",
                        color: "#1a1a1a",
                        fontFamily: "JetBrains Mono",
                    },
                    children: [
                        {
                            type: "div",
                            props: {
                                style: { fontSize: 28, opacity: 0.6 },
                                children: "mike zamayias",
                            },
                        },
                        {
                            type: "div",
                            props: {
                                style: { display: "flex", flexDirection: "column", gap: 24 },
                                children: [
                                    {
                                        type: "div",
                                        props: {
                                            style: { fontSize: 72, fontWeight: 700 },
                                            children: title,
                                        },
                                    },
                                    {
                                        type: "div",
                                        props: {
                                            style: { fontSize: 32, opacity: 0.7 },
                                            children: subtitle,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            type: "div",
                            props: {
                                style: { fontSize: 24, opacity: 0.5 },
                                children: type,
                            },
                        },
                    ],
                },
            },
            {
                width: 1200,
                height: 630,
                fonts: [
                    {
                        name: "JetBrains Mono",
                        data: font,
                        weight: 400,
                        style: "normal",
                    },
                ],
            }
        );

        const png = new Resvg(svg, { background: "#f5f4ee" }).render().asPng();
        setHeader(event, "Content-Type", "image/png");
        if (degraded) {
            // Force `no-store` to override the cache-headers middleware
            // (`s-maxage=300, stale-while-revalidate=600` for /api/og/*).
            // Without this Cloudflare would pin the degraded slug-only PNG
            // for up to ~15 minutes after Firestore recovers, so the proper
            // localized card wouldn't appear until cache rolls.
            setHeader(event, "Cache-Control", "no-store, max-age=0");
            // Independent signal (alongside Sentry) — used today only for
            // origin-log queries; alert wiring is a follow-up.
            setHeader(event, "X-OG-Degraded", "firestore");
        }
        return png;
    } catch (err) {
        Sentry.captureException(err, {
            tags: { component: "og-image" },
            extra: {
                type,
                slug,
                requestedLocale,
                title,
                subtitle: subtitle.slice(0, 100),
            },
        });
        throw createError({
            statusCode: 502,
            message: "OG render failed",
        });
    }
});
