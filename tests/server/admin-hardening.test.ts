import { describe, it, expect } from "vitest";
import {
    WorkSchema,
    WritingSchema,
    ProfileSchema,
    COLLECTION_SCHEMAS,
    SINGLETON_SCHEMAS,
} from "~/server/utils/schemas";

describe("WorkSchema", () => {
    it("accepts a valid work entry", () => {
        const v = WorkSchema.safeParse({
            slug: "ok-slug",
            yr: "2024",
            stack: "x",
            glyph: "X",
            order: 0,
            published: true,
            locales_available: ["en"],
            locale: { en: { name: "n", desc: "d", long: "" } },
        });
        expect(v.success).toBe(true);
    });
    it("accepts an entry as the admin saves it: stack tags, start/end, no yr", () => {
        const v = WorkSchema.safeParse({
            slug: "efimeries",
            start: "2024-01",
            stack: ["nuxt", "typescript"],
            order: 5,
            published: true,
            status: "live",
            platform: "Web",
            locales_available: ["en"],
            locale: { en: { name: "Efimeries", desc: "d", long: "" } },
            links: [{ kind: "live", url: "https://efimeries.pages.dev" }],
        });
        expect(v.success).toBe(true);
        // start/end survive parsing, since the admin writes parsed.data.
        expect(v.success && v.data.start).toBe("2024-01");
    });
    it("rejects a malformed start month", () => {
        const v = WorkSchema.safeParse({
            slug: "ok",
            start: "2024-13",
            stack: [],
            order: 0,
            published: true,
            locales_available: ["en"],
            locale: { en: { name: "n", desc: "d", long: "" } },
        });
        expect(v.success).toBe(false);
    });
    it("rejects bad slug", () => {
        const v = WorkSchema.safeParse({
            slug: "BAD UPPERCASE",
            yr: "",
            stack: "",
            glyph: "",
            order: 0,
            published: true,
            locales_available: ["en"],
            locale: { en: { name: "n", desc: "d", long: "" } },
        });
        expect(v.success).toBe(false);
    });
    it("rejects missing both locales", () => {
        const v = WorkSchema.safeParse({
            slug: "ok",
            yr: "",
            stack: "",
            glyph: "",
            order: 0,
            published: true,
            locales_available: ["en"],
            locale: {},
        });
        expect(v.success).toBe(false);
    });
    it("rejects invalid link kind enum", () => {
        const v = WorkSchema.safeParse({
            slug: "ok",
            yr: "",
            stack: "",
            glyph: "",
            order: 0,
            published: true,
            locales_available: ["en"],
            locale: { en: { name: "n", desc: "d", long: "" } },
            links: [{ kind: "bogus", url: "https://example.com" }],
        });
        expect(v.success).toBe(false);
    });
});

describe("WritingSchema", () => {
    it("accepts a valid writing entry", () => {
        const v = WritingSchema.safeParse({
            slug: "hello-world",
            date: "2026-05-10",
            tags: ["nuxt", "firebase"],
            read: 5,
            order: 1,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: { title: "Hello", sub: "world", body: "body" },
            },
        });
        expect(v.success).toBe(true);
    });
    it("rejects bad date format", () => {
        const v = WritingSchema.safeParse({
            slug: "ok",
            date: "10-05-2026",
            tags: [],
            read: 5,
            order: 1,
            published: true,
            locales_available: ["en"],
            locale: { en: { title: "t", sub: "", body: "b" } },
        });
        expect(v.success).toBe(false);
    });
    it("rejects empty locales_available", () => {
        const v = WritingSchema.safeParse({
            slug: "ok",
            date: "2026-05-10",
            tags: [],
            read: 5,
            order: 1,
            published: true,
            locales_available: [],
            locale: { en: { title: "t", sub: "", body: "b" } },
        });
        expect(v.success).toBe(false);
    });
});

describe("ProfileSchema", () => {
    it("accepts a valid profile", () => {
        const v = ProfileSchema.safeParse({
            headline: { en: "Engineer" },
            summary: { en: "About me" },
            email: "mike@example.com",
            location: { en: "Heraklion" },
        });
        expect(v.success).toBe(true);
    });
    it("rejects bad email", () => {
        const v = ProfileSchema.safeParse({
            headline: { en: "Engineer" },
            summary: { en: "About me" },
            email: "not-an-email",
            location: { en: "Heraklion" },
        });
        expect(v.success).toBe(false);
    });
});

describe("COLLECTION_SCHEMAS coverage", () => {
    it("covers all 10 admin collections under canonical names", () => {
        const keys = Object.keys(COLLECTION_SCHEMAS).sort();
        expect(keys).toEqual([
            "certifications",
            "contact",
            "education",
            "experience",
            "profile",
            "roadmap",
            "skills",
            "social",
            "work",
            "writing",
        ]);
    });
});

describe("SINGLETON_SCHEMAS coverage", () => {
    it("covers all 3 singletons", () => {
        expect(Object.keys(SINGLETON_SCHEMAS).sort()).toEqual(["about", "hero", "roadmap"]);
    });
});
