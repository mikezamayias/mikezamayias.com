import { describe, expect, it } from "vitest";
import { pendingWorkLinksFor } from "~/utils/pendingWorkLinks";

describe("pendingWorkLinksFor", () => {
    it("keeps the Healpen Play listing as a label until a public URL exists", () => {
        const [link] = pendingWorkLinksFor("healpen");
        expect(link?.label).toBe("Coming soon to Google Play");
        expect(link?.url).toBe("");
        expect(link?.url).not.toMatch(/play\.google\.com/);
    });

    it("returns nothing for entries without a pending listing", () => {
        expect(pendingWorkLinksFor("headspare")).toEqual([]);
        expect(pendingWorkLinksFor(undefined)).toEqual([]);
    });
});
