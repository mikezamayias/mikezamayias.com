// server/middleware/admin-redirect.ts
//
// HTTP-layer redirect for direct loads of `/admin/**`. Multiple
// SSR-suppression attempts (routeRules `/admin/**: { ssr: false }`,
// `<ClientOnly>` wrap in `layouts/admin.vue`, per-page
// `defineRouteRules({ ssr: false })`) all failed to strip the SSR
// shell from `/admin`, `/admin/messages`, `/admin/work`, etc. on the
// built Cloud Function — only `/admin/login` honoured the rule.
// Whatever Nitro is doing with the route-rule glob for the admin tree
// is inconsistent on the deployed function and not reproducible
// locally.
//
// This middleware sidesteps the Nitro routing layer entirely: any
// direct HTTP request for `/admin/*` (or `/el/admin/*`) that ISN'T
// the login page gets a 302 redirect straight to `/admin/login`
// before SSR runs. The admin layout never gets the chance to render
// server-side, so anonymous visitors and SEO crawlers only ever see
// the login page's tiny empty shell.
//
// UX trade-off: authed admins direct-loading a deep link
// (e.g. bookmarking `/admin/messages`) get bounced to `/admin/login`
// first; they then sign in and SPA-navigate to their intended page.
// Subsequent in-session navigation between admin pages runs through
// the client-side Vue router only and never re-hits this middleware,
// so the normal workflow has no extra friction.
//
// Why no session-cookie check: Firebase Auth lives entirely
// client-side and doesn't set a server-visible session cookie. We
// can't differentiate authed vs anon at the SSR layer without adding
// a parallel cookie session model, which is a much larger change.
// The redirect-always behaviour is the simplest fix that fully closes
// the SSR shell leak.
import { defineEventHandler, sendRedirect } from "h3";

export default defineEventHandler((event) => {
    // Prerender must produce real admin shells. This 302 would be written to
    // disk as a meta-refresh stub for every admin route except /admin/login,
    // bouncing a signed-in admin before hydration. Nitro exposes
    // import.meta.prerender during `nuxt generate`; skip the redirect there.
    if (import.meta.prerender) {
        return;
    }

    const path = event.path || "";

    // Strip query / fragment for the match. event.path includes the
    // query string, e.g. `/admin?foo=bar` — keep the match
    // pathname-only so route-rules and cache-bust query params don't
    // confuse the predicate.
    const pathname = path.split("?")[0] ?? "";

    // Match `/admin`, `/admin/**`, `/el/admin`, `/el/admin/**`.
    // i18n locale prefix matches the `prefix_except_default` strategy
    // in nuxt.config.ts — only `el` ever gets a prefix today.
    const isAdmin = /^(?:\/el)?\/admin(?:\/|$)/.test(pathname);
    if (!isAdmin) return;

    // Don't redirect the login page itself or the OAuth/MFA callback —
    // those need to render so the user can actually sign in. The
    // locale-prefixed Greek login (`/el/admin/login`) gets the same
    // pass.
    const isLogin = /^(?:\/el)?\/admin\/login(?:\/|$)/.test(pathname);
    if (isLogin) return;

    // Preserve the original locale so users landing on `/el/admin/foo`
    // get bounced to `/el/admin/login` (not `/admin/login`).
    const localePrefix = pathname.startsWith("/el/") ? "/el" : "";
    return sendRedirect(event, `${localePrefix}/admin/login`, 302);
});
