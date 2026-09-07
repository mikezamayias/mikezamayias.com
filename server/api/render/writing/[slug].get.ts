// server/api/render/writing/[slug].get.ts
//
// Plan B Task 17 (rev 1.6) — rev 1.3 perf MEDIUM: render Markdown
// server-side, return sanitized HTML. Avoids shipping `marked` +
// `sanitize-html` (~120 KB combined) to the browser. Public read auth:
// same as content endpoints (anonymous OK if the writing entry is
// published; admin Bearer bypass for unpublished is a TODO).
import * as Sentry from "@sentry/nuxt";
import { useFirebaseAdmin } from "~/server/utils/firebase";
import { getCached, setCached } from "~/server/utils/render-cache";
import { renderMarkdown } from "~/server/utils/sanitize";
import { isH3Error } from "~/server/utils/errors";
import { isPreviewMockEnv } from "~/server/utils/preview-mock";

export default defineEventHandler(async (event) => {
    const slug = getRouterParam(event, "slug");
    // Plan I follow-up: EN-only. Param ignored, re-introduce real
    // parsing when EL returns.
    const locale = "en" as const;
    if (!slug) {
        throw createError({ statusCode: 400, message: "missing slug" });
    }

    // Preview / staging / dev: short-circuit to mock sanitized HTML
    // so writing detail pages render a real-looking body in previews
    // without ADC. Unknown slugs still 404 (preserves real-not-found).
    if (isPreviewMockEnv()) {
        const { getMockRenderedPost } = await import("~/server/utils/mock-content");
        const html = getMockRenderedPost(slug, locale);
        if (html === null) throw createError({ statusCode: 404, message: "not found" });
        return html;
    }

    // `useFirebaseAdmin` is a Nuxt composable (`use*` prefix is treated as a
    // hook by lint rules), so it has to run at the top of the handler — not
    // inside the try block below. Same pattern as the OG endpoint.
    const { firestore } = useFirebaseAdmin();

    let data: {
        published?: boolean;
        locale?: Record<string, { body?: string }>;
        updatedAt?: { toMillis?: () => number };
    };
    try {
        const snap = await firestore.doc(`writing/${slug}`).get();
        if (!snap.exists) {
            throw createError({ statusCode: 404, message: "not found" });
        }
        data = snap.data() as typeof data;
        if (!data.published) {
            // Admin token bypass would normally be here; for now treat
            // public-only. Plan C will surface unpublished posts in the
            // admin shell via a separate admin-scoped endpoint.
            throw createError({ statusCode: 404, message: "not found" });
        }
    } catch (err: unknown) {
        // Re-throw any h3-shaped error (404 for missing doc / unpublished,
        // 400 for missing slug, and any future 4xx) so the public surface
        // keeps semantic status codes.
        if (isH3Error(err)) throw err;
        // Narrow scope: only the Firestore read is wrapped. `renderMarkdown`
        // failures (sanitize/marked exceptions) fall outside and propagate
        // as 5xx — render failure means we have content the system can't
        // safely emit, which is a content-integrity signal that needs to
        // page someone, not silently degrade.
        const errorCode = (err as { code?: string | number })?.code;
        const errorMessage = err instanceof Error ? err.message : String(err);
        Sentry.captureException(err, {
            tags: {
                component: "render-post",
                phase: "firestore-read",
                firestoreErrorCode: errorCode !== undefined ? String(errorCode) : "unknown",
            },
            extra: { slug, locale, errorCode, errorMessage },
        });
        // Force `no-store` to override the cache-headers middleware
        // (`s-maxage=300, stale-while-revalidate=600` for /api/render/writing/*).
        // Without this Cloudflare would pin the degraded empty body for up
        // to ~15 minutes after Firestore recovers, holding readers on a
        // blank article past the outage window.
        setHeader(event, "Cache-Control", "no-store, max-age=0");
        // Independent signal (alongside Sentry) — used today only for
        // origin-log queries; alert wiring (CF analytics rule or log-based
        // metric) is a follow-up.
        setHeader(event, "X-Render-Degraded", "firestore");
        // Return an empty string so the consumer (`pages/writing/[slug].vue`,
        // which already wraps the fetch with `.catch(() => "")`) renders a
        // blank body instead of an error page. Better UX than a 5xx that
        // Cloudflare might serve repeatedly during a Firestore blip.
        return "";
    }

    // Render path stays outside the try so sanitize/marked exceptions
    // surface as a normal 5xx (page someone) rather than degrade silently.
    const updatedAt = data.updatedAt?.toMillis?.() ?? 0;
    const cached = getCached(slug, locale, updatedAt);
    if (cached !== null) return cached;
    const body = data.locale?.[locale]?.body ?? "";
    const cleaned = await renderMarkdown(body);
    setCached(slug, locale, updatedAt, cleaned);
    return cleaned;
});
