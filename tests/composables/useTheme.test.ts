import { describe, expect, it, beforeEach, vi } from "vitest";

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
        vi.resetModules();
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.style.colorScheme = "";
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }
        meta.content = "";
    });

    async function freshTheme() {
        const { useTheme } = await import("../../composables/useTheme");
        return useTheme();
    }

    it("follows a light system setting", async () => {
        installMatchMediaMock(false);
        const { theme } = await freshTheme();
        expect(theme.value).toBe("light");
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
        expect(document.documentElement.style.colorScheme).toBe("light");
        expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
            "#ffffff"
        );
    });

    it("follows a dark system setting", async () => {
        installMatchMediaMock(true);
        const { theme } = await freshTheme();
        expect(theme.value).toBe("dark");
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        expect(document.documentElement.style.colorScheme).toBe("dark");
        expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
            "#1a1a1a"
        );
    });

    it("ignores a preference stored by the old theme toggle", async () => {
        installMatchMediaMock(false);
        localStorage.setItem("codex-theme", "dark");
        const { theme } = await freshTheme();
        expect(theme.value).toBe("light");
        localStorage.removeItem("codex-theme");
    });

    it("updates when the system setting changes mid-session", async () => {
        const media = installMatchMediaMock(false);
        const { theme } = await freshTheme();
        expect(theme.value).toBe("light");

        media.darkQuery().setMatches(true);
        expect(theme.value).toBe("dark");
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

        media.darkQuery().setMatches(false);
        expect(theme.value).toBe("light");
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
});
