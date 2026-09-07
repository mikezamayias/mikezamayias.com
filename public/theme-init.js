/* FOUC guard. Reads persisted theme (or system pref) and applies it to
 * <html data-theme=...> AND to the theme-aware chrome elements
 * (<meta name="theme-color">, <link rel="icon">) before paint. Lives
 * in public/ so it loads from 'self' and doesn't need a CSP hash —
 * works on both prerendered and SSR-rendered routes (admin, dynamic
 * blog slugs, error pages).
 *
 * Why imperative chrome updates instead of `media="(prefers-color-
 * scheme: ...)"` on the tags?
 *   1. The site's theme toggle (`composables/useTheme.ts`) writes
 *      `localStorage["codex-theme"]` and flips `<html data-theme>`,
 *      which is INDEPENDENT of OS preference. Media-query-keyed tags
 *      don't see that toggle.
 *   2. iOS Safari caches the initial `theme-color` even when the OS
 *      preference flips mid-session and doesn't re-evaluate the
 *      media query reliably. `setAttribute` works around it.
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

    function applyChrome(theme) {
        document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
        }
        var icons = document.querySelectorAll("link[data-theme-favicon]");
        if (icons.length) {
            icons.forEach(function (icon) {
                icon.setAttribute(
                    "href",
                    faviconHref(theme, icon.getAttribute("data-theme-favicon"))
                );
            });
            return;
        }
        var icon = document.querySelector('link[rel="icon"]');
        if (icon) {
            icon.setAttribute("href", faviconHref(theme, "256"));
        }
    }

    try {
        var stored = localStorage.getItem("codex-theme");
        var preference =
            stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
        var systemTheme =
            window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        var theme = preference === "system" ? systemTheme : preference;
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-theme-preference", preference);
        applyChrome(theme);
    } catch (e) {
        /* private mode + storage-quota throws — silent fallback to default */
    }
})();
