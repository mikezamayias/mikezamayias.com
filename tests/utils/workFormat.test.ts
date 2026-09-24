import { describe, expect, it } from "vitest";
import { formatWorkFacts, formatWorkRange, formatWorkStack } from "~/utils/workFormat";

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
        expect(formatWorkStack([" flutter ", "", "postgres"])).toBe("Flutter · PostgreSQL");
    });

    it("shows unknown tags as written", () => {
        expect(formatWorkStack(["openai", "Rive"])).toBe("OpenAI · Rive");
    });
});

describe("formatWorkFacts", () => {
    const t = (key: string) => `[${key}]`;

    it("lists stack, platform, then status", () => {
        expect(
            formatWorkFacts({ stack: ["flutter", "openai"], platform: "iOS", status: "testing" }, t)
        ).toBe("Flutter · OpenAI · iOS · [work.status.testing]");
    });

    it("skips missing parts and unknown statuses", () => {
        expect(formatWorkFacts({ stack: ["dart"], status: "shipping" }, t)).toBe("Dart");
        expect(formatWorkFacts({ platform: " Web ", status: "live" }, t)).toBe(
            "Web · [work.status.live]"
        );
    });
});
