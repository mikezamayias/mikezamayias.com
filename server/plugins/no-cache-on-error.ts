// server/plugins/no-cache-on-error.ts
//
// Strips cache headers on 4xx/5xx responses so transient backend
// failures (Firestore blips, OG renderer throws, etc.) don't get
// edge-cached and replayed for s-maxage minutes. The cache-headers
// middleware sets `Cache-Control: public, s-maxage=N` BEFORE the
// route handler runs, which means a handler that subsequently
// throws/returns an error inherits those cacheable defaults —
// Cloudflare then caches the error for up to s-maxage and serves it
// to every subsequent request until the entry expires.
//
// Defense in depth alongside the per-route admin-bypass no-store
// branch in server/middleware/cache-headers.ts. Codex P2 finding
// from PR #70 review.
//
// Hook reference: Nitro 2.x `beforeResponse` runs after the handler
// resolves but before the response is sent, so res.statusCode is
// already final at this point. Forwarded from h3's
// `app.options.onBeforeResponse`.

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook("beforeResponse", (event) => {
        const status = event.node.res.statusCode;
        if (status >= 400) {
            setHeader(event, "Cache-Control", "no-store");
        }
    });
});
