import { ref, type Ref } from "vue";
import { useViewTransition } from "./useViewTransition";

const STORAGE_KEY = "codex-theme";
type Theme = "light" | "dark";
type ThemePreference = Theme | "system";
type Direction = "up" | "down";

// Keep these in sync with `public/theme-init.js`. Kept duplicated rather
// than imported because theme-init.js runs as a plain <script> from
// public/ (no module system) and needs the values pre-paint. If the
// palette shifts, update both files together.
const THEME_COLOR_LIGHT = "#ffffff"; // matches --bg = --argent
const THEME_COLOR_DARK = "#1a1a1a"; // matches --bg = --ink
const FAVICON_VERSION = "?v=20260602";
const FAVICONS = {
    light: {
        "32": `/brand/favicon-32.png${FAVICON_VERSION}`,
        "256": `/brand/favicon-256.png${FAVICON_VERSION}`,
    },
    dark: {
        "32": `/brand/favicon-32-dark.png${FAVICON_VERSION}`,
        "256": `/brand/favicon-256-dark.png${FAVICON_VERSION}`,
    },
} as const;

const themeRef = ref<Theme>("light");
const preferenceRef = ref<ThemePreference>("system");
const directionRef = ref<Direction>("down");
let systemListenerAttached = false;

function readSystem(): Theme {
    if (typeof window === "undefined") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStored(): ThemePreference | null {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : null;
}

function resolvePreference(preference: ThemePreference): Theme {
    return preference === "system" ? readSystem() : preference;
}

function syncSystemTheme() {
    if (preferenceRef.value !== "system") return;
    const next = readSystem();
    if (next === themeRef.value) {
        applyToDom(next);
        return;
    }
    directionRef.value = next === "dark" ? "down" : "up";
    runScanline(directionRef.value);
    themeRef.value = next;
    applyToDom(next);
}

function watchSystemTheme() {
    if (typeof window === "undefined" || systemListenerAttached) return;
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    if (query.addEventListener) query.addEventListener("change", syncSystemTheme);
    else query.addListener?.(syncSystemTheme);
    systemListenerAttached = true;
}

/**
 * Imperatively swap the theme-aware page chrome elements:
 *   - `<meta name="theme-color">` (iOS Safari status-bar tint)
 *   - `<link rel="icon">` (browser tab favicon)
 *
 * The meta tag and theme-aware favicon links are declared in
 * `nuxt.config.ts` and mutated here on each theme change. Media-query-keyed
 * tags can't see the in-app toggle (independent of OS pref), and iOS Safari
 * caches media-query theme-color across mid-session OS changes anyway — see
 * `public/theme-init.js` for the full rationale.
 */
function applyChrome(theme: Theme) {
    if (typeof document === "undefined") return;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
    const icons = document.querySelectorAll<HTMLLinkElement>("link[data-theme-favicon]");
    if (icons.length) {
        icons.forEach((icon) => {
            const size = icon.dataset.themeFavicon === "32" ? "32" : "256";
            icon.href = FAVICONS[theme][size];
        });
        return;
    }
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = FAVICONS[theme]["256"];
}

function applyToDom(theme: Theme) {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.dataset.themePreference = preferenceRef.value;
    document.documentElement.dataset.themeDir = directionRef.value;
    applyChrome(theme);
}

/**
 * Mounts the gold scanline overlay defined in `assets/css/transitions.css`.
 * The element animates one pass (top-to-bottom for "down", bottom-to-top
 * for "up") and removes itself when the animation ends.
 */
function runScanline(direction: Direction) {
    if (typeof document === "undefined") return;
    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const bar = document.createElement("div");
    bar.className = `codex-theme-scan run-${direction}`;
    bar.setAttribute("aria-hidden", "true");
    // Safety net in case animationend never fires (e.g. element detached
    // before animation completes). Cleared on the success path so we don't
    // call .remove() on an already-removed node.
    const safety = setTimeout(() => bar.remove(), 1500);
    bar.addEventListener(
        "animationend",
        () => {
            clearTimeout(safety);
            bar.remove();
        },
        { once: true }
    );
    document.body.appendChild(bar);
}

let initialised = false;

export function useTheme() {
    if (!initialised) {
        preferenceRef.value = readStored() ?? "system";
        themeRef.value = resolvePreference(preferenceRef.value);
        applyToDom(themeRef.value);
        watchSystemTheme();
        initialised = true;
    }
    const { run } = useViewTransition();

    function persist(preference: ThemePreference) {
        if (typeof localStorage === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, preference);
        } catch (err) {
            // Safari private mode + storage-quota errors throw here. The
            // theme still applies to the DOM; we just lose persistence for
            // this session.
            if (import.meta.dev) console.warn("[useTheme] localStorage write failed", err);
        }
    }

    async function setTheme(next: ThemePreference) {
        const nextTheme = resolvePreference(next);
        if (next === preferenceRef.value && nextTheme === themeRef.value) {
            applyToDom(nextTheme);
            return;
        }
        if (next === "system") watchSystemTheme();

        const apply = () => {
            preferenceRef.value = next;
            themeRef.value = nextTheme;
            persist(next);
            applyToDom(nextTheme);
        };

        if (nextTheme === themeRef.value) {
            apply();
            return;
        }

        directionRef.value = nextTheme === "dark" ? "down" : "up";
        runScanline(directionRef.value);
        await run(apply);
    }

    async function toggle() {
        const order: ThemePreference[] = ["light", "dark", "system"];
        const current = order.indexOf(preferenceRef.value);
        await setTheme(order[(current + 1) % order.length] ?? "system");
    }

    return {
        theme: themeRef as Readonly<Ref<Theme>>,
        preference: preferenceRef as Readonly<Ref<ThemePreference>>,
        lastDirection: directionRef as Readonly<Ref<Direction>>,
        setTheme,
        toggle,
    };
}
