// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ssr: true,
    runtimeConfig: {
        // Contact form (server-only — never exposed to client)
        brevoApiKey: process.env.BREVO_API_KEY || "",
        contactEmail: process.env.CONTACT_EMAIL || "",
        contactFromEmail: process.env.CONTACT_FROM_EMAIL || "noreply@auth.mikezamayias.com",
        contactBccEmail: process.env.CONTACT_BCC_EMAIL || "",

        public: {
            firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || "",
            firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
            firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || "",
            firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
            firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
            firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || "",
            // Sentry observability (Plan B Task 2.6) — public DSN ships to browser
            sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN ?? "",
            turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
            // Firebase Analytics (GA4) — consent-gated init in plugins/05.analytics.client.ts
            firebaseMeasurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
            // Deployment environment — production / staging / development. Set
            // by the deploy workflow (deploy.yml → production, ci.yml → staging)
            // so Sentry init can gate ingestion to the production tracker only.
            // `NODE_ENV` is "production" for every Nuxt build (incl. preview deploys
            // and CI artifacts), so it cannot distinguish prod from staging.
            appEnv: process.env.NUXT_PUBLIC_APP_ENV ?? "development",
        },
    },
    sentry: {
        sourceMapsUploadOptions: {
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
        },
    },
    app: {
        head: {
            // FOUC + CLS guards — both scripts live in public/ so they load
            // from 'self' and bypass the CSP unsafe-inline restriction that
            // nuxt-security enforces on SSR routes (the SSG hash plugin only
            // hashes during prerender).
            //
            // `/theme-init.js` applies the persisted theme (or system pref)
            // to <html data-theme=...> before paint.
            //
            // `/consent-init.js` adds `has-consent-banner` to <html> if no
            // consent decision is stored yet, so the body `padding-bottom`
            // reserve from assets/css/tailwind.css applies on first paint
            // instead of flipping in post-mount (CLS hit on form-dense
            // pages, see PR #82 review follow-up).
            script: [
                {
                    src: "/theme-init.js",
                    tagPosition: "head",
                    tagPriority: "critical",
                },
                {
                    src: "/consent-init.js",
                    tagPosition: "head",
                    tagPriority: "critical",
                },
            ],
            title: "mz · Mike Zamayias",
            meta: [
                { charset: "utf-8" },
                { name: "viewport", content: "width=device-width, initial-scale=1" },
                { name: "format-detection", content: "telephone=no" },
                // Single theme-color tag, set at runtime by
                // `public/theme-init.js` (pre-paint and on OS theme
                // changes) and `useTheme.ts`. A pair of media-query-keyed
                // tags would be simpler, but iOS Safari caches the initial
                // theme-color when the OS setting flips mid-session.
                // `#ffffff` matches the light --bg; the dark value is
                // swapped in at runtime.
                { name: "theme-color", content: "#ffffff" },
                // `apple-mobile-web-app-capable` is the original iOS PWA
                // declaration; the W3C-standard equivalent is `mobile-web-
                // app-capable`. iOS still reads its prefixed version, but
                // Chrome / Edge / Safari 17+ warn when the standard name
                // is missing. Ship both for full coverage + silence the
                // deprecation warning.
                { name: "mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-status-bar-style", content: "default" },
                {
                    name: "description",
                    content:
                        "Mike Zamayias, mobile engineer in Heraklion, Crete. Flutter and native Android apps.",
                },
                // Open Graph
                { property: "og:title", content: "mz · Mike Zamayias" },
                {
                    property: "og:description",
                    content:
                        "Mike Zamayias, mobile engineer in Heraklion, Crete. Flutter and native Android apps.",
                },
                { property: "og:type", content: "website" },
                { property: "og:url", content: "https://mikezamayias.com" },
                {
                    property: "og:image",
                    content: "https://mikezamayias.com/brand/og-default.png?v=20260924",
                },
                { property: "og:image:width", content: "1200" },
                { property: "og:image:height", content: "630" },
                { property: "og:locale", content: "en_US" },
                // Twitter Card
                { name: "twitter:card", content: "summary_large_image" },
                { name: "twitter:site", content: "@mikezamayias" },
                { name: "twitter:creator", content: "@mikezamayias" },
                { name: "twitter:title", content: "mz · Mike Zamayias" },
                {
                    name: "twitter:description",
                    content:
                        "Mike Zamayias, mobile engineer in Heraklion, Crete. Flutter and native Android apps.",
                },
                {
                    name: "twitter:image",
                    content: "https://mikezamayias.com/brand/og-default.png?v=20260924",
                },
            ],
            htmlAttrs: {
                lang: "en",
            },
            link: [
                // The SVG favicon is adaptive: it carries its own
                // prefers-color-scheme styles, so no script has to swap it.
                // PNG and ICO cover browsers without SVG favicons. The
                // version query busts Safari's sticky tab-icon cache.
                {
                    rel: "icon",
                    type: "image/svg+xml",
                    href: "/brand/favicon.svg?v=20260924",
                },
                {
                    rel: "icon",
                    type: "image/png",
                    sizes: "32x32",
                    href: "/brand/favicon-32.png?v=20260924",
                },
                {
                    rel: "shortcut icon",
                    href: "/favicon.ico?v=20260924",
                },
                {
                    rel: "apple-touch-icon",
                    href: "/apple-touch-icon.png?v=20260924",
                },
                {
                    rel: "alternate",
                    type: "application/rss+xml",
                    title: "Writing · Mike Zamayias",
                    href: "/rss.xml",
                },
            ],
        },
        baseURL: "/",
    },
    // `@fortawesome/fontawesome-svg-core/styles.css` was previously
    // bundled here too. The plugin at `plugins/fontawesome.ts` sets
    // `config.autoAddCss = true`, which makes FA inject its own
    // styles at runtime via a <style> tag. Loading the same file in
    // `css[]` re-bundled the rules into the global `entry.css`,
    // bloating the render-blocking critical path on every route
    // (Lighthouse measured 100% of entry.css unused on the home
    // page). Removing the duplicate cuts ~15 KB off entry.css and
    // lets FA's runtime injection ship the CSS only to clients that
    // actually mount `<FaIcon>`.
    css: ["~/assets/css/tailwind.css"],
    plugins: ["~/plugins/fontawesome.ts", "~/plugins/schema.ts", "~/plugins/codex-reveal.ts"],
    modules: [
        "@nuxt/eslint",
        "@nuxtjs/google-fonts",
        "@nuxtjs/tailwindcss",
        "@nuxtjs/sitemap",
        "shadcn-nuxt",
        "nuxt-security",
        "@nuxtjs/i18n",
        "@sentry/nuxt/module",
    ],
    i18n: {
        // Plan F SEO: absolute baseUrl required for valid hreflang/canonical
        // tags emitted by useLocaleHead. Lighthouse `hreflang` audit fails on
        // empty/relative hrefs (categories.seo dropped from 0.95 → 0.92).
        baseUrl: "https://mikezamayias.com",
        strategy: "prefix_except_default",
        defaultLocale: "en",
        // Greek dropped post-Plan-I. Keeping `@nuxtjs/i18n` wired with a
        // single English locale so `useI18n()` / `useLocaleHead()` /
        // `<NuxtLink>` localePath behaviour stays in place — re-adding
        // EL later is just one entry in this array.
        locales: [{ code: "en", language: "en-US", file: "en.json", name: "English" }],
        langDir: "locales/",
        // One locale: no browser-language redirect and no `i18n_redirected` cookie.
        detectBrowserLanguage: false,
    },
    shadcn: {
        prefix: "",
        componentDir: "./components/ui",
    },
    site: {
        url: "https://mikezamayias.com",
    },
    sitemap: {
        // One locale: no hreflang alternates in the sitemap.
        autoI18n: false,
        // Admin surfaces are private — never advertise them via sitemap.
        // The `noindex` meta on layouts/admin.vue + pages/admin/login.vue
        // covers crawlers that find admin URLs through other channels;
        // the sitemap exclusion just stops us actively pointing crawlers
        // at them.
        exclude: ["/admin/**", "/auth-redirect"],
    },
    security: {
        // Disable security headers in dev: nuxt-security's CSP blocks Vite's
        // inline HMR scripts, which prevents Vue from hydrating during
        // `nuxt dev`. Production builds (SSR + prerender) still get full CSP.
        enabled: process.env.NODE_ENV === "production",
        // Enable per-request nonces so SSR-rendered pages can ship their
        // inline `window.__NUXT__.config` bootstrap script under CSP.
        // Without nonces (and without `'unsafe-inline'`), the bootstrap
        // is blocked → Vue never hydrates → admin/login renders the SSR
        // form HTML but Sign In does nothing (verified via headless
        // browser: __vue_app__ === undefined on /admin/login despite the
        // form being in the DOM).
        //
        // `ssg.hashScripts: true` below continues to handle prerendered
        // routes (`/`, `/work`, etc.) which can't carry per-request
        // nonces. The two strategies coexist on different route types.
        nonce: true,
        ssg: {
            meta: true,
            hashScripts: true,
            // `hashStyles: false` because the CSP spec causes browsers to
            // ignore `'unsafe-inline'` whenever any hash or nonce is present
            // in `style-src`. Vue scoped styles and Headless UI transitions
            // inject inline <style> tags at runtime that we cannot pre-hash,
            // so we keep `'unsafe-inline'` and skip emitting style hashes.
            hashStyles: false,
        },
        // No CSP `report-to`/`report-uri` is configured: there is no collector
        // endpoint set up for this project. Add one (e.g. report-uri.com or a
        // self-hosted Nitro route) before enabling reporting in production.
        headers: {
            contentSecurityPolicy: {
                "default-src": ["'none'"],
                // `'unsafe-inline'` removed from script-src per security review.
                // `hashScripts: true` covers prerendered inline scripts (e.g. the
                // JSON-LD block in plugins/schema.ts).
                // `'nonce-{{nonce}}'` is the nuxt-security placeholder that gets
                // replaced per-request with a fresh nonce, matching the `nonce`
                // attribute the module auto-adds to every `<script>` tag. SSR
                // pages need this token in the policy so their inline bootstrap
                // (`window.__NUXT__.config`) can run; without it Vue never
                // hydrates on admin/login. Prerendered routes still match via
                // their per-script SHA-384 hashes (nuxt-security adds those
                // alongside the nonce when both `ssg.hashScripts` and
                // `nonce: true` are enabled).
                "script-src": [
                    "'self'",
                    "'nonce-{{nonce}}'",
                    "https://apis.google.com",
                    "https://challenges.cloudflare.com",
                    "https://www.gstatic.com",
                    "https://www.googletagmanager.com",
                ],
                "script-src-attr": ["'none'"],
                // `'unsafe-inline'` is retained for style-src because Vue scoped
                // styles and runtime style injections (Headless UI transitions,
                // etc.) emit inline <style> tags during SSR/hydration that
                // hashStyles cannot cover. Removing it breaks rendering.
                "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                "img-src": [
                    "'self'",
                    "data:",
                    "https://mikezamayias.com",
                    "https://*.googleusercontent.com",
                    "https://www.google-analytics.com",
                ],
                "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
                "connect-src": [
                    "'self'",
                    "https://firestore.googleapis.com",
                    "https://firebaseinstallations.googleapis.com",
                    "https://identitytoolkit.googleapis.com",
                    "https://securetoken.googleapis.com",
                    "https://www.googleapis.com",
                    "https://apis.google.com",
                    "https://challenges.cloudflare.com",
                    "https://*.firebaseio.com",
                    "wss://*.firebaseio.com",
                    // Sentry ingest endpoints (Plan B Task 2.6 follow-up):
                    // @sentry/nuxt client SDK posts events to the region-
                    // specific subdomain encoded in the DSN. Allowlist the
                    // global + US + DE regions so the right one wins per DSN.
                    // Without this, browser CSP blocks the request and 100%
                    // of client errors are lost.
                    "https://*.ingest.sentry.io",
                    "https://*.ingest.us.sentry.io",
                    "https://*.ingest.de.sentry.io",
                    "https://*.ingest.eu.sentry.io",
                    // Firebase Analytics (GA4) — consent-gated; see
                    // plugins/05.analytics.client.ts. Endpoints cover the
                    // GA4 collect + Tag Manager loader + region-sharded
                    // analytics domains.
                    "https://www.google-analytics.com",
                    "https://*.google-analytics.com",
                    "https://www.googletagmanager.com",
                    "https://*.analytics.google.com",
                ],
                // frame-src scoped to specific Firebase Auth + Turnstile endpoints
                // instead of the broad https://www.google.com (security review).
                "frame-src": [
                    "'self'",
                    "https://mikezamayias.firebaseapp.com",
                    "https://challenges.cloudflare.com",
                    "https://apis.google.com",
                ],
                "object-src": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
                "frame-ancestors": ["'none'"],
                "upgrade-insecure-requests": true,
            },
            xFrameOptions: "DENY",
            xContentTypeOptions: "nosniff",
            referrerPolicy: "strict-origin-when-cross-origin",
            strictTransportSecurity: {
                maxAge: 31536000,
                includeSubdomains: true,
                preload: false, // Set to true only after verifying at hstspreload.org
            },
            permissionsPolicy: {
                camera: [],
                microphone: [],
                geolocation: [],
            },
        },
    },
    experimental: {
        payloadExtraction: true,
    },
    // Per-component CSS extraction into inline <style> tags on SSR HTML.
    // Keeps `entry.css` to truly global styles (Tailwind base/utilities,
    // tokens.css, transitions, codex-patterns) and ships each component's
    // scoped CSS inline with the markup that uses it — better TTFP and
    // smaller render-blocking critical path on SSR + prerendered routes.
    // See docs/superpowers/plans/2026-05-22-plan-perf-tailwind-bloat.md
    // (Option A).
    features: {
        inlineStyles: true,
    },
    googleFonts: {
        prefetch: true,
        preconnect: true,
        preload: true,
        useStylesheet: true,
        // font-display: optional. With `swap`, text painted in the
        // fallback font re-flowed when the web font arrived: Lighthouse
        // measured a 0.15 layout shift on the home hero as the GFS fonts
        // loaded. `optional` gives the font a ~100 ms block period and then
        // never swaps, so nothing moves after first paint. With `preload`
        // above, the self-hosted files usually arrive in time; on a slow
        // first visit the fallback stays for that page view, and the
        // cached font is used from then on. It also satisfies Lighthouse's
        // `font-display` audit, which only flags `auto`/`block`.
        display: "optional",
        // `base64: true` previously inlined every woff2 as base64 inside
        // the generated `/css/nuxt-google-fonts.css` — that file ballooned
        // to 2.37 MB across 5 families × every weight × every unicode
        // subset, and it loaded synchronously in the critical path. Set
        // to false so fonts ship as external woff2 files (cacheable,
        // requestable in parallel, and not bytes Lighthouse counts
        // against FCP/LCP/Speed Index). The Cumulative-Layout-Shift cost
        // is handled by `font-display: optional` plus `preload: true`
        // above issuing rel=preload for each subset.
        base64: false,
        inject: true,
        download: true,
        overwriting: false,
        // Inter was retained as a legacy fallback (see CLAUDE.md
        // "Google Fonts" section) but no component or stylesheet
        // references it directly — five Inter weights were being
        // downloaded for nothing. Dropped here; if a future component
        // needs Inter, add it back with the minimum weight set.
        families: {
            // Literata: the letter on the home page, and the logo's face.
            Literata: { wght: [400, 500, 600], ital: [400, 500] },
            "JetBrains+Mono": { wght: [400, 500, 600, 700] },
            "GFS+Didot": { wght: [400] },
            "GFS+Neohellenic": { wght: [400, 700] },
            "Cormorant+Garamond": { wght: [400, 700] },
        },
    },
    vite: {
        build: {
            chunkSizeWarningLimit: 2000,
        },
        optimizeDeps: {
            // Pre-bundled so Vite doesn't trigger a mid-boot reload to
            // discover them at first request. Without this, `bun run dev`
            // serves SSR HTML, then the first browser hit pulls these
            // bare-import chunks and Vite forces a refresh that lands
            // mid-hydration on `error.vue` ("Something went wrong").
            // List mirrors Vite's own "Pre-bundle them in your
            // nuxt.config.ts" runtime suggestion (see dev-server log).
            include: [
                "@fortawesome/fontawesome-svg-core",
                "@fortawesome/free-solid-svg-icons",
                "@fortawesome/free-brands-svg-icons",
                "@fortawesome/vue-fontawesome",
                "firebase/analytics",
                "firebase/app",
                "firebase/auth",
                "firebase/firestore",
            ],
        },
    },
    routeRules: {
        "/admin/**": { ssr: false },
        "/api/**": { prerender: false },
        "/auth-redirect": { prerender: false },
        // Admin routes are prerendered as client-only shells (ssr: false).
        // The earlier blank-page failure is solved because nuxt-security's
        // `ssg.hashScripts: true` hashes the inline bootstrap script for
        // prerendered pages. Dynamic admin routes are served by the Cloudflare
        // Worker's scoped fallback to the /admin shell.
    },
    nitro: {
        preset: "firebase",
        firebase: {
            gen: 2,
            nodeVersion: "22",
            httpsOptions: {
                region: "europe-west1",
                // Plan B+ cost-cap: minInstances: 0 saves ~$60/month flat
                // (warm Cloud Function billing). `/` is prerendered (Plan A),
                // so first-paint never hits Cloud Function. SSR routes absorb
                // ~1.2s cold-start on the first daily visitor — acceptable
                // for portfolio scope.
                minInstances: 0,
                // maxInstances kept at 1 for rate-limit coherence: the
                // in-memory token bucket (server/middleware/rate-limit.ts)
                // divides across instances if N > 1.
                maxInstances: 1,
            },
        },
        prerender: {
            // Every public route is prerendered from the build-time content
            // snapshot (`scripts/snapshot-content.ts` → `content/*.json`).
            // Nothing reads Firestore on the client, so admin edits go live
            // with the next Deploy run. `crawlLinks` follows the work and
            // writing links on the index pages to prerender each detail page.
            crawlLinks: true,
            ignore: [(route) => route.startsWith("/api") || route.startsWith("/auth-redirect")],
            routes: [
                "/",
                "/work",
                "/writing",
                "/rss.xml",
                "/about",
                "/contact",
                "/privacy/peakward",
                "/privacy/budget-coach",
                "/privacy/healpen",
                "/privacy/lsom",
                "/terms",
                "/admin",
                "/admin/about",
                "/admin/certifications",
                "/admin/contact",
                "/admin/education",
                "/admin/experience",
                "/admin/hero",
                "/admin/login",
                "/admin/messages",
                "/admin/profile",
                "/admin/roadmap",
                "/admin/roadmap-settings",
                "/admin/security",
                "/admin/skills",
                "/admin/social",
                "/admin/translations",
                "/admin/work",
                "/admin/write",
                "/admin/writing",
            ],
        },
    },
});
