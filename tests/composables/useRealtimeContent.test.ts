import { describe, expect, it } from "vitest";
import {
    resolveRealtimeDocSnapshotValue,
    toPublicContentLocale,
} from "~/utils/publicRealtimeContent";

describe("public realtime content helpers", () => {
    it("uses the same canonical public locale as the server API", () => {
        expect(toPublicContentLocale("en")).toBe("en");
        expect(toPublicContentLocale("en-US")).toBe("en");
        expect(toPublicContentLocale("el")).toBe("en");
        expect(toPublicContentLocale(undefined)).toBe("en");
        expect(toPublicContentLocale(null)).toBe("en");
    });

    it("does not let a missing realtime doc erase existing SSR content", () => {
        const current = { id: "peakward", slug: "peakward" };
        const currentWithSlugMatch = { id: "other", slug: "peakward" };
        const next = { id: "healpen", slug: "healpen" };

        expect(resolveRealtimeDocSnapshotValue(current, null)).toBe(current);
        expect(resolveRealtimeDocSnapshotValue(current, null, "peakward")).toBe(current);
        expect(resolveRealtimeDocSnapshotValue(currentWithSlugMatch, null, "peakward")).toBe(
            currentWithSlugMatch
        );
        expect(resolveRealtimeDocSnapshotValue(null, null)).toBeNull();
        expect(resolveRealtimeDocSnapshotValue(current, next)).toBe(next);
    });

    it("does not preserve stale SSR content after a document key changes", () => {
        const current = { id: "peakward", slug: "peakward" };

        expect(resolveRealtimeDocSnapshotValue(current, null, "healpen")).toBeNull();
    });
});
