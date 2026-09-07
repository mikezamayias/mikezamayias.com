import { describe, it, expect, beforeEach, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nuxt", () => ({
    captureException,
}));

// Polyfill localStorage if happy-dom doesn't provide it
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

describe("useConsent", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        captureException.mockClear();
        if (typeof localStorage !== "undefined") localStorage.clear();
    });

    it("starts in needsDecision state with empty storage", async () => {
        const { useConsent } = await import("~/composables/useConsent");
        const { needsDecision, granted } = useConsent();
        expect(needsDecision.value).toBe(true);
        expect(granted.value).toBe(false);
    });

    it("accept() persists granted", async () => {
        const { useConsent } = await import("~/composables/useConsent");
        const c = useConsent();
        c.accept();
        expect(c.granted.value).toBe(true);
        expect(c.needsDecision.value).toBe(false);
        expect(localStorage.getItem("codex.consent")).toBe("granted");
    });

    it("decline() persists denied", async () => {
        const { useConsent } = await import("~/composables/useConsent");
        const c = useConsent();
        c.decline();
        expect(c.granted.value).toBe(false);
        expect(c.needsDecision.value).toBe(false);
        expect(localStorage.getItem("codex.consent")).toBe("denied");
    });

    it("reports storage save failures without blocking the consent state", async () => {
        const error = new Error("blocked storage");
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw error;
        });

        const { useConsent } = await import("~/composables/useConsent");
        const c = useConsent();
        c.accept();

        expect(c.granted.value).toBe(true);
        expect(c.needsDecision.value).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith("[codex] consent save failed", error);
        await vi.waitFor(() => {
            expect(captureException).toHaveBeenCalledWith(error, {
                tags: { component: "consent" },
            });
        });
    });
});
