import { describe, expect, it } from "vitest";
import {
    PUBLIC_READABLE,
    ALLOWED_CONTENT_COLLECTIONS,
    assertPublicReadable,
    assertAllowedCollection,
    isPublicReadable,
    isPubliclyVisible,
    filterPublic,
} from "~/server/utils/content-collections";
import {
    sanitizePublicCollection,
    sanitizePublicHomePayload,
    sanitizePublicSingleton,
} from "~/server/utils/public-portfolio";

/**
 * Unit tests for the public-read filter and allowlist (Plan B / Task 0.5,
 * fix for CRIT-C1: PR #66 leaked unpublished docs and PII via the public
 * `GET /api/content/<collection>` route).
 *
 * The test boots no Nuxt context — instead we exercise the pure helpers
 * that the route handlers delegate to. The handlers themselves are thin
 * wrappers (Firestore fetch + helper call), so covering the helper covers
 * the security surface.
 */

describe("PUBLIC_READABLE allowlist", () => {
    it("does not include `profile` (PII — admin only)", () => {
        expect(PUBLIC_READABLE as readonly string[]).not.toContain("profile");
    });

    it("includes the canonical public-content collections", () => {
        for (const c of [
            "social",
            "experience",
            "skills",
            "education",
            "certifications",
            "contact",
            "work",
            "writing",
            "roadmap",
        ]) {
            expect(PUBLIC_READABLE as readonly string[]).toContain(c);
        }
    });

    it("PUBLIC_READABLE is a strict subset of ALLOWED_CONTENT_COLLECTIONS", () => {
        for (const c of PUBLIC_READABLE) {
            expect(ALLOWED_CONTENT_COLLECTIONS as readonly string[]).toContain(c);
        }
        expect(ALLOWED_CONTENT_COLLECTIONS as readonly string[]).toContain("profile");
    });
});

describe("isPublicReadable", () => {
    it("returns true for whitelisted collections", () => {
        expect(isPublicReadable("writing")).toBe(true);
        expect(isPublicReadable("work")).toBe(true);
    });

    it("returns false for `profile` (admin only)", () => {
        expect(isPublicReadable("profile")).toBe(false);
    });

    it("returns false for unknown collections", () => {
        expect(isPublicReadable("nonsense")).toBe(false);
    });

    it("returns false for legacy names dropped in Plan H.3", () => {
        expect(isPublicReadable("posts")).toBe(false);
        expect(isPublicReadable("projects")).toBe(false);
        expect(isPublicReadable("tasks")).toBe(false);
    });
});

describe("assertPublicReadable", () => {
    it("returns the collection name for an allowed value", () => {
        expect(assertPublicReadable("writing")).toBe("writing");
    });

    it("throws 404 for `profile` (anonymous callers cannot list profile)", () => {
        // anonymous GET /api/content/profile → 404
        expect(() => assertPublicReadable("profile")).toThrow();
        try {
            assertPublicReadable("profile");
        } catch (err) {
            expect((err as { statusCode?: number }).statusCode).toBe(404);
        }
    });

    it("throws 404 for unknown collections", () => {
        expect(() => assertPublicReadable("nonsense")).toThrow();
        try {
            assertPublicReadable("nonsense");
        } catch (err) {
            expect((err as { statusCode?: number }).statusCode).toBe(404);
        }
    });

    it("does NOT distinguish 'admin-only' from 'unknown' (no info leak)", () => {
        // Both 'profile' (admin-only) and 'nonsense' (unknown) must yield the
        // same status + message shape so anonymous callers cannot probe for
        // existence of admin collections.
        let profileErr: unknown;
        let unknownErr: unknown;
        try {
            assertPublicReadable("profile");
        } catch (e) {
            profileErr = e;
        }
        try {
            assertPublicReadable("nonsense");
        } catch (e) {
            unknownErr = e;
        }
        expect((profileErr as { statusCode?: number }).statusCode).toBe(
            (unknownErr as { statusCode?: number }).statusCode
        );
    });
});

describe("assertAllowedCollection (admin superset)", () => {
    it("still accepts `profile` (admin endpoints route on this)", () => {
        expect(assertAllowedCollection("profile")).toBe("profile");
    });
});

describe("isPubliclyVisible", () => {
    describe("writing (published-filtered)", () => {
        it("returns true for published === true", () => {
            expect(isPubliclyVisible("writing", { published: true })).toBe(true);
        });

        it("returns false for published === false", () => {
            expect(isPubliclyVisible("writing", { published: false })).toBe(false);
        });

        it("returns false for missing `published` field (fail-closed)", () => {
            expect(isPubliclyVisible("writing", {})).toBe(false);
        });
    });

    describe("work (published-filtered)", () => {
        it("returns true for published === true", () => {
            expect(isPubliclyVisible("work", { published: true })).toBe(true);
        });

        it("returns false for published === false", () => {
            expect(isPubliclyVisible("work", { published: false })).toBe(false);
        });
    });

    describe("roadmap (hidden-filtered)", () => {
        it("returns true for hidden === false", () => {
            expect(isPubliclyVisible("roadmap", { hidden: false })).toBe(true);
        });

        it("returns false for hidden === true", () => {
            expect(isPubliclyVisible("roadmap", { hidden: true })).toBe(false);
        });

        it("returns false for missing `hidden` field (fail-closed)", () => {
            expect(isPubliclyVisible("roadmap", {})).toBe(false);
        });
    });

    describe("non-filtered collections", () => {
        it("returns true for any doc in `experience`", () => {
            expect(isPubliclyVisible("experience", { title: "x" })).toBe(true);
        });

        it("returns true for any doc in `skills`", () => {
            expect(isPubliclyVisible("skills", {})).toBe(true);
        });
    });
});

describe("filterPublic", () => {
    const writing = [
        { id: "a", published: true, title: "A" },
        { id: "b", published: false, title: "B" },
        { id: "c", published: true, title: "C" },
        { id: "d", title: "D (no flag)" },
    ];

    it("returns only published writing for anonymous callers", () => {
        const result = filterPublic(writing, "writing", false);
        expect(result.map((d) => d.id)).toEqual(["a", "c"]);
    });

    it("returns ALL writing for an admin caller", () => {
        const result = filterPublic(writing, "writing", true);
        expect(result.map((d) => d.id)).toEqual(["a", "b", "c", "d"]);
    });

    it("returns only non-hidden roadmap entries for anonymous callers", () => {
        const roadmap = [
            { id: "t1", hidden: false },
            { id: "t2", hidden: true },
            { id: "t3", hidden: false },
        ];
        const result = filterPublic(roadmap, "roadmap", false);
        expect(result.map((d) => d.id)).toEqual(["t1", "t3"]);
    });

    it("returns all docs for non-filtered collections (anonymous)", () => {
        const skills = [{ id: "s1" }, { id: "s2" }];
        const result = filterPublic(skills, "skills", false);
        expect(result.map((d) => d.id)).toEqual(["s1", "s2"]);
    });
});

describe("public portfolio sanitizers", () => {
    it("removes consultant/indie roadmap copy for anonymous callers", () => {
        const result = sanitizePublicCollection(
            "roadmap",
            [
                {
                    id: "private-roadmap-item",
                    hidden: false,
                    locale: {
                        en: {
                            title: "/consulting page",
                            note: "Fixed-scope Flutter and Nuxt audits.",
                        },
                    },
                },
                {
                    id: "og-image-route",
                    hidden: false,
                    locale: {
                        en: {
                            title: "OG image route",
                            note: "Per-post share images.",
                        },
                    },
                },
            ],
            false
        );

        expect(result.map((entry) => entry.id)).toEqual(["og-image-route"]);
    });

    it("keeps all roadmap docs for admins", () => {
        const result = sanitizePublicCollection(
            "roadmap",
            [{ id: "consulting-page", locale: { en: { title: "/consulting page" } } }],
            true
        );

        expect(result).toHaveLength(1);
    });

    it("neutralizes public roadmap singleton copy", () => {
        const result = sanitizePublicSingleton("roadmap", {
            id: "roadmap",
            goal: { en: "paid audits + templates live" },
            intro: { en: "Paid audits and indie templates live by Q3." },
        });

        expect(result.goal.en).toBe("Apps, writing, and site updates");
        expect(result.intro.en).not.toMatch(/audit|indie/i);
    });

    it("removes old independent-position experience from public reads", () => {
        const result = sanitizePublicCollection(
            "experience",
            [
                { id: "independent-software-engineer" },
                {
                    id: "atfirstsite-flutter-developer",
                    achievements: [{ en: "Collaborated with the founders." }],
                },
            ],
            false
        );

        expect(result).toEqual([
            {
                id: "atfirstsite-flutter-developer",
                achievements: [{ en: "Collaborated with the product team." }],
            },
        ]);
    });

    it("does not rewrite hyphenated founder compounds", () => {
        const result = sanitizePublicCollection(
            "experience",
            [
                {
                    id: "mobile-engineer",
                    achievements: [
                        { en: "Partnered with a co-founder and the founders on mobile UX." },
                    ],
                },
            ],
            false
        );

        expect(result).toEqual([
            {
                id: "mobile-engineer",
                achievements: [
                    {
                        en: "Partnered with a co-founder and the product team on mobile UX.",
                    },
                ],
            },
        ]);
    });

    it("sanitizes the home payload roadmap before SSR serializes it", () => {
        const result = sanitizePublicHomePayload({
            hero: null,
            about: null,
            roadmap_meta: {
                goal: { en: "paid audits + templates live" },
                intro: { en: "Paid audits and indie templates live by Q3." },
                target: { en: "Q3 2026" },
            },
            work: [],
            writing: [],
            roadmap: [
                {
                    id: "consulting-page",
                    href: "/consulting",
                    hidden: false,
                    order: 0,
                    priority: "high",
                    status: "todo",
                    locale: { en: { title: "consulting page", note: "audits" } },
                },
            ],
        });

        expect(result.roadmap).toEqual([]);
        expect(result.roadmap_meta?.intro.en).not.toMatch(/audit|indie/i);
    });
});
