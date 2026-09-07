// server/middleware/cache-headers.ts
//
// Layer Cache-Control onto public GET responses so Cloudflare can edge-
// cache them. Plan B+ Cloudflare analytics showed 1.25% cache hit rate;
// SSR routes and /api/content/** were emitting cache-buster defaults.
//
// Tuning:
//   /api/content/home          public-read, low write rate → 60s + SWR
//   /api/content/{collection}  same
//   /api/content/singletons/*  almost-never-write → 5min + SWR
//   /api/render/writing/{slug} server-rendered markdown → 5min + SWR
//   /api/og/{type}/{slug}      Satori-rendered OG PNGs   → 5min + SWR
//   HTML SSR pages             30s + SWR (admin updates surface fast)
//
// Admin / mutating routes get no-store via the explicit early return.
//
// Vary: Authorization caveat —
// The Bearer-token early return below only fires when a request reaches
// origin. Cloudflare's edge cache can serve a cached anonymous response
// BEFORE origin sees the admin Bearer request. `Vary: Authorization` is
// descriptive metadata — on Cloudflare's free tier the cache key is
// derived from URL only and Vary is NOT honored, so the anon variant
// would still be returned for an admin Bearer GET until s-maxage expires.
//
// For routes that support admin-bypass filtering (returning unpublished/
// hidden docs when the caller is admin) — work, writing, roadmap —
// we MUST force `no-store` so Cloudflare never serves a cached anon
// response to an admin request. Other content routes (singletons,
// social, experience, skills, etc.) have no admin variant and stay
// cacheable. When traffic justifies it we can configure Cloudflare
// Cache Rules to include Authorization in the cache key (Workers /
// Pages Rules / Enterprise) and revisit; documented in
// docs/superpowers/specs/2026-05-11-cloudflare-hardening.md.
import type { H3Event } from "h3";
import { getHeader, getRequestURL, setHeader } from "h3";

function setCacheable(event: H3Event, maxAge: number, swr: number, vary = true) {
    setHeader(
        event,
        "Cache-Control",
        `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}, no-transform`
    );
    if (vary) setHeader(event, "Vary", "Authorization");
}

function stripLocalePrefix(path: string) {
    const stripped = path.replace(/^\/(?:en|el)(?=\/|$)/, "");
    return stripped === "" ? "/" : stripped;
}

function isRouteOrChild(path: string, route: string) {
    return path === route || path.startsWith(`${route}/`);
}

export default defineEventHandler((event) => {
    const method = event.method ?? "GET";
    const url = getRequestURL(event).pathname;

    // Admin or non-GET → no caching ever
    if (method !== "GET" || url.startsWith("/api/admin/")) {
        setHeader(event, "Cache-Control", "no-store");
        return;
    }

    // Authenticated requests (Bearer token) → no caching ever. Admin
    // reads via /api/content/** must NEVER share a Cloudflare cache key
    // with anonymous traffic, or unpublished docs leak. Cache poison risk.
    const auth = getHeader(event, "authorization") ?? "";
    const hasBearer = /^Bearer\s+\S+/i.test(auth);
    if (hasBearer) {
        setHeader(event, "Cache-Control", "no-store");
        return;
    }

    // Admin-bypass routes: server endpoints support a Bearer-token
    // override that returns unpublished/hidden docs. Cloudflare's free-
    // tier cache key uses URL only, so Vary: Authorization alone won't
    // separate anon vs admin responses at the edge — an anon cache entry
    // could be served to an admin GET before the request reaches origin.
    // Force no-store on these specific routes. Plan B Task 0.5 lists the
    // admin-bypass collections (work, writing, roadmap).
    if (
        url.startsWith("/api/content/work") ||
        url.startsWith("/api/content/writing") ||
        url.startsWith("/api/content/roadmap")
    ) {
        setHeader(event, "Cache-Control", "no-store");
        return;
    }

    // API surface — explicit per-route policies
    if (url.startsWith("/api/content/singletons/")) {
        setCacheable(event, 300, 600);
        return;
    }
    if (url.startsWith("/api/render/writing/")) {
        setCacheable(event, 300, 600);
        return;
    }
    if (url.startsWith("/api/og/")) {
        // No Authorization sensitivity on OG — pure content render. Skip Vary.
        setCacheable(event, 300, 600, false);
        return;
    }
    // Plan I: the batched home endpoint fans out 6 firebase-admin
    // reads — the single most expensive public route. Aggressive
    // SWR (5 min cache + 30 min revalidate window) lets Cloudflare
    // serve the cached payload to repeat visitors while the
    // onSnapshot listener on the client handles any in-tab freshness
    // expectations. Public list endpoints are nearly as expensive
    // (Firestore query + serialization), so they get the same treatment.
    if (url.startsWith("/api/content/home")) {
        setCacheable(event, 300, 1800);
        return;
    }
    if (url.startsWith("/api/content/")) {
        setCacheable(event, 60, 300);
        return;
    }

    // HTML SSR routes
    const ssrPath = stripLocalePrefix(url);
    if (
        ssrPath === "/" ||
        isRouteOrChild(ssrPath, "/work") ||
        isRouteOrChild(ssrPath, "/writing") ||
        ssrPath === "/about" ||
        ssrPath === "/contact"
    ) {
        setHeader(
            event,
            "Cache-Control",
            "public, s-maxage=30, stale-while-revalidate=120, no-transform"
        );
    }
});
