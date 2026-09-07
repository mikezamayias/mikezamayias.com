import { describe, expect, it } from "vitest";
import { formatDate, truncateText, commonAnimations, commonColors } from "~/utils/common";

describe("formatDate", () => {
    it("should format a date string correctly", () => {
        const result = formatDate("2023-06-15");
        expect(result).toBe("June 2023");
    });

    it("should handle different date formats", () => {
        const result = formatDate("2022-01-01");
        expect(result).toBe("January 2022");
    });
});

describe("truncateText", () => {
    it("should truncate text longer than maxLength", () => {
        const result = truncateText("This is a long text that needs to be truncated", 20);
        expect(result).toBe("This is a long text ...");
    });

    it("should not truncate text shorter than maxLength", () => {
        const result = truncateText("Short text", 20);
        expect(result).toBe("Short text");
    });

    it("should handle exact length", () => {
        const result = truncateText("Exact", 5);
        expect(result).toBe("Exact");
    });
});

describe("commonAnimations", () => {
    it("should have fadeInUp animation", () => {
        expect(commonAnimations.fadeInUp).toBeDefined();
        expect(commonAnimations.fadeInUp).toContain("transition-all");
    });

    it("should have scaleOnHover animation", () => {
        expect(commonAnimations.scaleOnHover).toBeDefined();
        expect(commonAnimations.scaleOnHover).toContain("hover:scale-105");
    });

    it("should have cardHover animation", () => {
        expect(commonAnimations.cardHover).toBeDefined();
        expect(commonAnimations.cardHover).toContain("hover:shadow-xl");
    });
});

describe("commonColors", () => {
    it("should have primary color class", () => {
        expect(commonColors.primary).toBeDefined();
        expect(commonColors.primary).toContain("text-brand");
    });

    it("should use Plan A semantic aliases (auto-swap via html[data-theme])", () => {
        // No `dark:` variants — theme swap happens at the CSS-variable layer.
        expect(commonColors.primary).not.toContain("dark:");
        expect(commonColors.secondary).not.toContain("dark:");
        expect(commonColors.onBackground).toBe("text-fg");
    });
});
