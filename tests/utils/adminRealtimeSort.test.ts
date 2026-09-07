import { describe, expect, it } from "vitest";
import { compareAdminRowsByOrderThenId } from "~/utils/adminRealtimeSort";

describe("compareAdminRowsByOrderThenId", () => {
    it("sorts by numeric `order` ascending", () => {
        const rows = [
            { id: "c", order: 2 },
            { id: "a", order: 0 },
            { id: "b", order: 1 },
        ];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    });

    it("falls back to id when `order` is equal", () => {
        const rows = [
            { id: "z", order: 0 },
            { id: "a", order: 0 },
            { id: "m", order: 0 },
        ];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["a", "m", "z"]);
    });

    it("sorts rows without `order` by id", () => {
        const rows = [{ id: "beta" }, { id: "alpha" }];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["alpha", "beta"]);
    });

    it("places finite order before missing order", () => {
        const rows = [{ id: "b", order: undefined }, { id: "a", order: 1 }, { id: "c" }];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    });
});
