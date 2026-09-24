import { ref, type Ref } from "vue";

type Theme = "light" | "dark";

// The theme follows the operating system and nothing else: there is no
// toggle and no stored preference. `public/theme-init.js` applies it before
// first paint; this composable keeps it in sync when the OS setting changes
// mid-session and exposes the current value to components that need it in
// script (the admin Markdown editor).
//
// Keep these in sync with `public/theme-init.js`, which runs as a plain
// <script> from public/ (no module system) and needs the values pre-paint.
const THEME_COLOR_LIGHT = "#ffffff"; // matches --bg = --argent
const THEME_COLOR_DARK = "#1a1a1a"; // matches --bg = --ink

const themeRef = ref<Theme>("light");
let initialised = false;

function readSystem(): Theme {
    if (typeof window === "undefined") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Sets `<html data-theme>` (tokens.css swaps the semantic aliases on it),
 * `color-scheme`, and `<meta name="theme-color">`. iOS Safari caches a
 * media-query-keyed theme-color across mid-session OS changes, so the meta
 * tag is updated imperatively instead.
 */
function applyToDom(theme: Theme) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}

function sync() {
    themeRef.value = readSystem();
    applyToDom(themeRef.value);
}

export function useTheme() {
    if (!initialised) {
        sync();
        if (typeof window !== "undefined") {
            const query = window.matchMedia?.("(prefers-color-scheme: dark)");
            if (query?.addEventListener) query.addEventListener("change", sync);
            else query?.addListener?.(sync);
        }
        initialised = true;
    }
    return {
        theme: themeRef as Readonly<Ref<Theme>>,
    };
}
