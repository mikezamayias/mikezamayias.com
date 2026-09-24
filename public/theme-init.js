/* FOUC guard. The theme follows the operating system, with no toggle and no
 * stored preference. This applies it to <html data-theme=...> and to the
 * theme-aware chrome (<meta name="theme-color">, <link rel="icon">) before
 * paint, and keeps it in sync if the OS setting changes mid-session. It
 * lives in public/ so it loads from 'self' and needs no CSP hash, and it
 * works on prerendered and SSR routes alike (admin, error pages).
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
    var FAVICON_VERSION = "?v=20260602";
    var FAVICONS = {
        light: {
            32: "/brand/favicon-32.png" + FAVICON_VERSION,
            256: "/brand/favicon-256.png" + FAVICON_VERSION,
        },
        dark: {
            32: "/brand/favicon-32-dark.png" + FAVICON_VERSION,
            256: "/brand/favicon-256-dark.png" + FAVICON_VERSION,
        },
    };

    function faviconHref(theme, size) {
        var key = size === "32" ? "32" : "256";
        return FAVICONS[theme === "dark" ? "dark" : "light"][key];
    }

    function apply(theme) {
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.style.colorScheme = theme;
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
        }
        var icons = document.querySelectorAll("link[data-theme-favicon]");
        icons.forEach(function (icon) {
            icon.setAttribute("href", faviconHref(theme, icon.getAttribute("data-theme-favicon")));
        });
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
