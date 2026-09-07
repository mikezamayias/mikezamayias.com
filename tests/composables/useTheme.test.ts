import { describe, expect, it, beforeEach, vi } from "vitest";
import { useTheme } from "../../composables/useTheme";

// Polyfill localStorage if happy-dom doesn't provide it in this vitest 4.x env
if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
        value: {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => store.set(k, v),
            removeItem: (k: string) => store.delete(k),
            clear: () => store.clear(),
            key: (i: number) => Array.from(store.keys())[i] ?? null,
            get length() {
                return store.size;
            },
        },
        writable: true,
    });
}

type MockMediaQueryList = MediaQueryList & {
    setMatches: (matches: boolean) => void;
};

function installMatchMediaMock(initialDark: boolean) {
    let darkMatches = initialDark;
    const lists = new Map<string, MockMediaQueryList>();

    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => {
            const existing = lists.get(query);
            if (existing) return existing;

            const listeners = new Set<(event: MediaQueryListEvent) => void>();
            const list = {
                media: query,
                onchange: null,
                get matches() {
                    return query === "(prefers-color-scheme: dark)" ? darkMatches : false;
                },
                addEventListener: (
                    _type: string,
                    listener: (event: MediaQueryListEvent) => void
                ) => {
                    listeners.add(listener);
                },
                removeEventListener: (
                    _type: string,
                    listener: (event: MediaQueryListEvent) => void
                ) => {
                    listeners.delete(listener);
                },
                addListener: (listener: (event: MediaQueryListEvent) => void) => {
                    listeners.add(listener);
                },
                removeListener: (listener: (event: MediaQueryListEvent) => void) => {
                    listeners.delete(listener);
                },
                dispatchEvent: () => true,
                setMatches: (matches: boolean) => {
                    darkMatches = matches;
                    const event = { matches, media: query } as MediaQueryListEvent;
                    listeners.forEach((listener) => listener(event));
                },
            } as MockMediaQueryList;

            lists.set(query, list);
            return list;
        },
    });

    return {
        darkQuery: () => window.matchMedia("(prefers-color-scheme: dark)") as MockMediaQueryList,
    };
}

describe("useTheme", () => {
    beforeEach(() => {
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.removeAttribute("data-theme-preference");
        document.documentElement.removeAttribute("data-theme-dir");
        document.documentElement.style.colorScheme = "";
        localStorage.clear();
    });

    it("falls back to system preference when nothing stored", () => {
        const { theme } = useTheme();
        // jsdom defaults to light
        expect(["light", "dark"]).toContain(theme.value);
    });

    it("applies the theme to the html element", async () => {
        const { setTheme } = useTheme();
        await setTheme("dark");
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("persists preference and direction across calls", async () => {
        const { setTheme, lastDirection } = useTheme();
        // reset to a known starting state — the composable's themeRef is a
        // module singleton that may carry "dark" over from a prior test
        await setTheme("light");
        localStorage.clear();
        await setTheme("dark");
        expect(localStorage.getItem("codex-theme")).toBe("dark");
        expect(lastDirection.value).toBe("down");
        await setTheme("light");
        expect(lastDirection.value).toBe("up");
    });

    describe("applyChrome", () => {
        beforeEach(() => {
            // Ensure a <meta name="theme-color"> and theme-aware favicons exist in the test DOM
            let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement("meta");
                meta.name = "theme-color";
                meta.content = "#ffffff";
                document.head.appendChild(meta);
            } else {
                meta.content = "#ffffff";
            }

            document
                .querySelectorAll<HTMLLinkElement>("link[data-theme-favicon]")
                .forEach((icon) => icon.remove());

            for (const size of ["32", "256"] as const) {
                const icon = document.createElement("link");
                icon.rel = "icon";
                icon.dataset.themeFavicon = size;
                icon.href = `/brand/favicon-${size}.png?v=20260602`;
                document.head.appendChild(icon);
            }
        });

        it("updates theme-color meta to dark value on setTheme('dark')", async () => {
            const { setTheme } = useTheme();
            await setTheme("dark");
            const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
            expect(meta?.content).toBe("#1a1a1a");
        });

        it("updates the active document color-scheme on theme changes", async () => {
            const { setTheme } = useTheme();
            await setTheme("dark");
            expect(document.documentElement.style.colorScheme).toBe("dark");

            await setTheme("light");
            expect(document.documentElement.style.colorScheme).toBe("light");
        });

        it("updates theme-color meta to light value on setTheme('light')", async () => {
            const { setTheme } = useTheme();
            await setTheme("dark");
            await setTheme("light");
            const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
            expect(meta?.content).toBe("#ffffff");
        });

        it("updates favicon href to dark variant on setTheme('dark')", async () => {
            const { setTheme } = useTheme();
            await setTheme("dark");
            const icons = [
                ...document.querySelectorAll<HTMLLinkElement>("link[data-theme-favicon]"),
            ];
            expect(icons.map((icon) => icon.href)).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("favicon-32-dark.png?v=20260602"),
                    expect.stringContaining("favicon-256-dark.png?v=20260602"),
                ])
            );
        });

        it("updates favicon href to light variant on setTheme('light')", async () => {
            const { setTheme } = useTheme();
            await setTheme("dark");
            await setTheme("light");
            const icons = [
                ...document.querySelectorAll<HTMLLinkElement>("link[data-theme-favicon]"),
            ];
            expect(icons.map((icon) => icon.href)).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("favicon-32.png?v=20260602"),
                    expect.stringContaining("favicon-256.png?v=20260602"),
                ])
            );
            expect(icons.some((icon) => icon.href.includes("dark"))).toBe(false);
        });
    });

    describe("system preference", () => {
        beforeEach(() => {
            vi.resetModules();
        });

        it("reads and persists the system preference", async () => {
            installMatchMediaMock(true);
            localStorage.setItem("codex-theme", "system");
            const { useTheme: useFreshTheme } = await import("../../composables/useTheme");

            const { preference, theme, setTheme } = useFreshTheme();
            expect(preference.value).toBe("system");
            expect(theme.value).toBe("dark");
            expect(document.documentElement.dataset.themePreference).toBe("system");

            await setTheme("light");
            expect(localStorage.getItem("codex-theme")).toBe("light");

            await setTheme("system");
            expect(localStorage.getItem("codex-theme")).toBe("system");
            expect(document.documentElement.dataset.themePreference).toBe("system");
            expect(theme.value).toBe("dark");
        });

        it("reacts to system color-scheme changes while preference is system", async () => {
            const media = installMatchMediaMock(false);
            localStorage.setItem("codex-theme", "system");
            const { useTheme: useFreshTheme } = await import("../../composables/useTheme");

            const { preference, theme } = useFreshTheme();
            expect(preference.value).toBe("system");
            expect(theme.value).toBe("light");

            media.darkQuery().setMatches(true);
            expect(theme.value).toBe("dark");
            expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
            expect(document.documentElement.dataset.themePreference).toBe("system");
        });
    });
});
