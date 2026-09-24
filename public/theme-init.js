/* FOUC guard. The theme follows the operating system, with no toggle and no
 * stored preference. This applies it to <html data-theme=...> and to
 * <meta name="theme-color"> before paint, and keeps both in sync if the OS
 * setting changes mid-session. It lives in public/ so it loads from 'self'
 * and needs no CSP hash, and it works on prerendered and SSR routes alike
 * (admin, error pages).
 *
 * Why set the chrome imperatively instead of `media="(prefers-color-
 * scheme: ...)"` on the tags? iOS Safari caches the initial theme-color
 * and doesn't reliably re-evaluate the media query when the OS setting
 * flips mid-session. `setAttribute` works around it.
 *
 * Keep the constants below in sync with `composables/useTheme.ts`. */
(function () {
    var THEME_COLOR_LIGHT = "#ffffff"; // matches --bg = --argent
    var THEME_COLOR_DARK = "#1a1a1a"; // matches --bg = --ink

    function apply(theme) {
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.style.colorScheme = theme;
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
        }
    }

    try {
        // The site used to offer a light/dark/system toggle that persisted
        // here. Clear it so an old choice can't linger anywhere.
        localStorage.removeItem("codex-theme");
    } catch (e) {
        /* storage blocked (private mode, cleared site data) */
    }

    var query = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    apply(query && query.matches ? "dark" : "light");
    if (query) {
        var onChange = function (event) {
            apply(event.matches ? "dark" : "light");
        };
        if (query.addEventListener) query.addEventListener("change", onChange);
        else if (query.addListener) query.addListener(onChange);
    }
})();
