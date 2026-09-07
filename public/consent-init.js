/* CLS guard for the consent banner padding. The banner is fixed-position
 * (z-80) and the global rule in assets/css/tailwind.css adds
 * padding-bottom to body when html.has-consent-banner is set. That class
 * is added client-side by ConsentBanner.vue's useHead — but the server
 * doesn't know `needsDecision.value` (no localStorage on the server), so
 * without this pre-paint hop the body re-flows after first paint and
 * the contact page (form-dense bottom) reports a measurable CLS.
 *
 * Mirrors theme-init.js: lives in public/ so it loads from 'self', runs
 * synchronously before paint, gracefully no-ops if localStorage throws.
 *
 * Read key matches composables/useConsent.ts STORAGE_KEY ("codex.consent"
 * with values "granted" / "denied"). Banner mounts only when value is
 * null/missing, so that's when we want the class. Admin routes don't
 * mount the banner regardless (app.vue#isAdminContext) — checking the
 * path here avoids reserving padding under the admin layout, which has
 * its own bottom-nav chrome. */
(function () {
    try {
        var path = window.location.pathname || "";
        if (/^(?:\/el)?\/admin(?:\/|$)/.test(path)) return;
        var stored = localStorage.getItem("codex.consent");
        if (stored === "granted" || stored === "denied") return;
        document.documentElement.classList.add("has-consent-banner");
    } catch (e) {
        /* Safari private mode + storage-quota throws — silent fallback;
         * Vue hydration will still add the class on mount, accepting one
         * layout shift instead of failing the page. */
    }
})();
