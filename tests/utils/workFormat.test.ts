import { describe, expect, it } from "vitest";
import { formatWorkRange, formatWorkStack } from "~/utils/workFormat";

describe("formatWorkRange", () => {
    it("formats completed month ranges", () => {
        expect(formatWorkRange({ start: "2023-01", end: "2023-12" })).toBe("Jan 2023 → Dec 2023");
    });

    it("labels start-only work as present", () => {
        expect(formatWorkRange({ start: "2023-01" })).toBe("Jan 2023 → Present");
    });

    it("falls back to legacy year labels", () => {
        expect(formatWorkRange({ yr: "2024" })).toBe("2024");
    });
});

describe("formatWorkStack", () => {
    it("joins stack items without leading separators", () => {
        expect(formatWorkStack([" flutter ", "", "postgres"])).toBe("flutter · postgres");
    });
});
