import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    getCached,
    setCached,
    invalidateCacheBySlug,
    _resetCacheForTests,
} from "~/server/utils/render-cache";

describe("render-cache", () => {
    beforeEach(() => _resetCacheForTests());

    it("returns null on miss", () => {
        expect(getCached("p1", "en", 1)).toBeNull();
    });

    it("set + get round-trip", () => {
        setCached("p1", "en", 1, "<p>hello</p>");
        expect(getCached("p1", "en", 1)).toBe("<p>hello</p>");
    });

    it("invalidates on updatedAt bump (different cache key)", () => {
        setCached("p1", "en", 1, "<p>v1</p>");
        expect(getCached("p1", "en", 2)).toBeNull();
        expect(getCached("p1", "en", 1)).toBe("<p>v1</p>");
    });

    it("keyed independently by locale", () => {
        setCached("p1", "en", 1, "<p>en</p>");
        setCached("p1", "el", 1, "<p>el</p>");
        expect(getCached("p1", "en", 1)).toBe("<p>en</p>");
        expect(getCached("p1", "el", 1)).toBe("<p>el</p>");
    });

    it("eviction kicks in past MAX_ENTRIES", () => {
        for (let i = 0; i < 150; i++) setCached(`p${i}`, "en", 1, "x");
        // Some early entries should be evicted; cache should be bounded.
        // Exact count depends on eviction strategy — assert oldest are gone
        // while newest survive.
        expect(getCached("p149", "en", 1)).toBe("x");
        // At least some early entries should be gone.
        let evicted = 0;
        for (let i = 0; i < 50; i++) if (getCached(`p${i}`, "en", 1) === null) evicted++;
        expect(evicted).toBeGreaterThan(0);
    });

    describe("TTL expiry (5min)", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-05-18T12:00:00.000Z"));
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it("returns cached value within the 5min window", () => {
            setCached("p1", "en", 1, "<p>fresh</p>");
            // 4min 59s — still in-window
            vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);
            expect(getCached("p1", "en", 1)).toBe("<p>fresh</p>");
        });

        it("returns null after 5min and evicts the stale entry", () => {
            setCached("p1", "en", 1, "<p>stale</p>");
            // 5min 1s — past TTL
            vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
            expect(getCached("p1", "en", 1)).toBeNull();
            // Second read confirms the stale entry was removed on the
            // first miss (no resurrection if clock rewinds, no leak).
            vi.setSystemTime(new Date("2026-05-18T12:00:00.000Z"));
            expect(getCached("p1", "en", 1)).toBeNull();
        });
    });

    describe("invalidateCacheBySlug", () => {
        it("removes every locale + updatedAt variant of the given slug", () => {
            setCached("p1", "en", 1, "<p>en v1</p>");
            setCached("p1", "el", 1, "<p>el v1</p>");
            setCached("p1", "en", 2, "<p>en v2</p>");
            invalidateCacheBySlug("p1");
            expect(getCached("p1", "en", 1)).toBeNull();
            expect(getCached("p1", "el", 1)).toBeNull();
            expect(getCached("p1", "en", 2)).toBeNull();
        });

        it("leaves unrelated slugs untouched", () => {
            setCached("p1", "en", 1, "<p>p1</p>");
            setCached("p2", "en", 1, "<p>p2</p>");
            // Adversarial: `p10` shares the `p1` prefix as a raw substring
            // but NOT as a `${slug}:` prefix — must survive.
            setCached("p10", "en", 1, "<p>p10</p>");
            invalidateCacheBySlug("p1");
            expect(getCached("p1", "en", 1)).toBeNull();
            expect(getCached("p2", "en", 1)).toBe("<p>p2</p>");
            expect(getCached("p10", "en", 1)).toBe("<p>p10</p>");
        });

        it("is a no-op when the slug is not cached", () => {
            setCached("p1", "en", 1, "<p>p1</p>");
            invalidateCacheBySlug("nope");
            expect(getCached("p1", "en", 1)).toBe("<p>p1</p>");
        });
    });
});
