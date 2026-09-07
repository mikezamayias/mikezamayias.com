// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
    assertSucceeds,
    assertFails,
} from "@firebase/rules-unit-testing";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let env: RulesTestEnvironment;
const ADMIN_UID = "admin-uid-fixture";

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-codex",
        firestore: {
            rules: readFileSync(resolve(__dirname, "../../firebase/firestore.rules"), "utf-8"),
            host: "127.0.0.1",
            port: 8085,
        },
    });

    // Seed allowedAdminIds bypass-rules
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "settings/main"), {
            allowedAdminIds: [ADMIN_UID],
        });
    });
});

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "settings/main"), {
            allowedAdminIds: [ADMIN_UID],
        });
    });
});

afterAll(async () => env.cleanup());

describe("firestore rules — work", () => {
    it("anonymous can get a published project", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/test"), {
                published: true,
                slug: "test",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertSucceeds(getDoc(doc(anon, "work/test")));
    });

    it("anonymous cannot get an unpublished project", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/test"), {
                published: false,
                slug: "test",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(anon, "work/test")));
    });

    it("admin can write to work", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(
            setDoc(doc(admin, "work/test"), {
                published: true,
                slug: "test",
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("non-admin signed-in user cannot write to work", async () => {
        const someone = env.authenticatedContext("some-other-uid").firestore();
        await assertFails(
            setDoc(doc(someone, "work/test"), {
                published: true,
                slug: "test",
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("anonymous cannot write", async () => {
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(anon, "work/test"), { published: true }));
    });

    // rev 1.7 — list is admin-only. Public reads go through the server
    // endpoint which uses firebase-admin and bypasses rules. Anonymous
    // direct-client list calls must fail so unpublished docs cannot leak.
    it("anonymous cannot list work", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/test"), {
                published: true,
                slug: "test",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDocs(collection(anon, "work")));
    });

    it("admin can list work", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/test"), {
                published: true,
                slug: "test",
            });
        });
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(getDocs(collection(admin, "work")));
    });
});

describe("firestore rules — singletons", () => {
    it("anonymous can get a singleton", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "singletons/hero"), { foo: "bar" });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertSucceeds(getDoc(doc(anon, "singletons/hero")));
    });

    it("anonymous cannot write a singleton", async () => {
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(anon, "singletons/hero"), { foo: "bar" }));
    });
});

describe("firestore rules — roadmap", () => {
    it("anonymous can get a non-hidden roadmap entry", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "roadmap/t1"), { hidden: false, status: "todo" });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertSucceeds(getDoc(doc(anon, "roadmap/t1")));
    });

    it("anonymous cannot get a hidden roadmap entry", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "roadmap/t1"), { hidden: true, status: "todo" });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(anon, "roadmap/t1")));
    });
});

// Additional rev 1.6 coverage — new lockdown rules
describe("firestore rules — settings (rev 1.6 server-only)", () => {
    it("admin cannot write to settings via client SDK", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertFails(setDoc(doc(admin, "settings/main"), { allowedAdminIds: ["evil"] }));
    });
});

describe("firestore rules — messages (rev 1.6 Plan E gate)", () => {
    it("anonymous cannot create messages until App Check ships", async () => {
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(anon, "messages/m1"), { from: "test" }));
    });
});

describe("firestore rules — profile (admin-only)", () => {
    it("anonymous cannot read profile/main", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "profile/main"), { email: "secret@example.com" });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(anon, "profile/main")));
    });

    it("admin can read profile/main", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "profile/main"), { email: "secret@example.com" });
        });
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(getDoc(doc(admin, "profile/main")));
    });
});

// List rules reference `resource.data` so anonymous queries must carry the
// visibility filter (`where(...)`) or Firestore rejects the whole query.
describe("firestore rules — public list requires visibility filter", () => {
    it("anonymous cannot list writing with limit but no published filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "writing/draft"), {
                published: false,
                slug: "draft",
            });
            await setDoc(doc(ctx.firestore(), "writing/live"), {
                published: true,
                slug: "live",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDocs(query(collection(anon, "writing"), limit(100))));
    });

    it("anonymous can list writing with a published filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "writing/draft"), {
                published: false,
                slug: "draft",
            });
            await setDoc(doc(ctx.firestore(), "writing/live"), {
                published: true,
                slug: "live",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        const snap = await assertSucceeds(
            getDocs(query(collection(anon, "writing"), where("published", "==", true), limit(100)))
        );
        expect(snap.docs.map((d) => d.id)).toEqual(["live"]);
    });

    it("anonymous cannot list work with limit but no published filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/draft"), {
                published: false,
                slug: "draft",
            });
            await setDoc(doc(ctx.firestore(), "work/live"), {
                published: true,
                slug: "live",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDocs(query(collection(anon, "work"), limit(100))));
    });

    it("anonymous can list work with a published filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "work/draft"), {
                published: false,
                slug: "draft",
            });
            await setDoc(doc(ctx.firestore(), "work/live"), {
                published: true,
                slug: "live",
            });
        });
        const anon = env.unauthenticatedContext().firestore();
        const snap = await assertSucceeds(
            getDocs(query(collection(anon, "work"), where("published", "==", true), limit(100)))
        );
        expect(snap.docs.map((d) => d.id)).toEqual(["live"]);
    });

    it("anonymous cannot list roadmap with limit but no hidden filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "roadmap/t1"), { hidden: true, status: "todo" });
            await setDoc(doc(ctx.firestore(), "roadmap/t2"), { hidden: false, status: "done" });
        });
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(getDocs(query(collection(anon, "roadmap"), limit(100))));
    });

    it("anonymous can list roadmap with a hidden filter", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "roadmap/t1"), { hidden: true, status: "todo" });
            await setDoc(doc(ctx.firestore(), "roadmap/t2"), { hidden: false, status: "done" });
        });
        const anon = env.unauthenticatedContext().firestore();
        const snap = await assertSucceeds(
            getDocs(query(collection(anon, "roadmap"), where("hidden", "==", false), limit(100)))
        );
        expect(snap.docs.map((d) => d.id)).toEqual(["t2"]);
    });
});

describe("firestore rules — coarse field shape & audit writes (Step 4)", () => {
    it("an admin write carrying an unexpected extra key is denied", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertFails(
            setDoc(doc(admin, "work/test-extra"), {
                published: true,
                slug: "test-extra",
                updatedAt: serverTimestamp(),
                unrecognizedProperty: "malicious-payload",
            })
        );
    });

    it("the equivalent write without the extra key is allowed", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(
            setDoc(doc(admin, "work/test-valid"), {
                published: true,
                slug: "test-valid",
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("a non-admin still cannot write", async () => {
        const someone = env.authenticatedContext("some-other-uid").firestore();
        await assertFails(
            setDoc(doc(someone, "work/test-valid"), {
                published: true,
                slug: "test-valid",
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("an admin can create an audit entry with their own uid", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(
            setDoc(doc(admin, "audit/audit-1"), {
                uid: ADMIN_UID,
                action: "upsert",
                collection: "work",
                docId: "test-valid",
                ts: serverTimestamp(),
            })
        );
    });

    it("an admin cannot create an audit entry carrying someone else's uid", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertFails(
            setDoc(doc(admin, "audit/audit-2"), {
                uid: "forged-uid",
                action: "upsert",
                collection: "work",
                docId: "test-valid",
                ts: serverTimestamp(),
            })
        );
    });

    it("an admin cannot update or delete an audit entry", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "audit/audit-immutable"), {
                uid: ADMIN_UID,
                action: "upsert",
                collection: "work",
                docId: "test-valid",
                ts: new Date(),
            });
        });
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertFails(
            updateDoc(doc(admin, "audit/audit-immutable"), {
                action: "delete",
            })
        );
        await assertFails(deleteDoc(doc(admin, "audit/audit-immutable")));
    });
});

describe("firestore rules — production shape and affectedKeys allowlist", () => {
    beforeEach(async () => {
        // Seed documents matching real production shapes (bypassing rules via security rules disabled)
        await env.withSecurityRulesDisabled(async (ctx) => {
            // Seed 1: doc with createdAt, legacy start key, etc.
            await setDoc(doc(ctx.firestore(), "work/legacy-prod-work"), {
                createdAt: new Date("2023-01-01"),
                glyph: "code",
                links: [],
                locale: {
                    en: { name: "Legacy Project", desc: "Desc", long: "Long desc" },
                },
                locales_available: ["en"],
                order: 1,
                published: true,
                slug: "legacy-prod-work",
                stack: "Flutter",
                start: "2023-01",
                updatedAt: new Date("2023-01-02"),
                yr: "2023",
            });

            // Seed 2: doc carrying literal dotted keys locale.en.demoLabel and locale.en.demoUrl
            await setDoc(doc(ctx.firestore(), "work/dotted-prod-work"), {
                createdAt: new Date("2023-01-01"),
                glyph: "code",
                links: [],
                locale: {
                    en: { name: "Dotted Project", desc: "Desc", long: "Long desc" },
                },
                locales_available: ["en"],
                order: 2,
                published: true,
                slug: "dotted-prod-work",
                stack: "Kotlin",
                start: "2023-05",
                updatedAt: new Date("2023-01-02"),
                yr: "2023",
                "locale.en.demoLabel": "Live Demo",
                "locale.en.demoUrl": "https://example.com/demo",
            });
        });
    });

    it("1. an admin merge-update of a legacy-shaped document succeeds, changing only allow-listed keys, while untouched legacy and dotted keys survive", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();

        // Merge-update on legacy document with createdAt & start
        await assertSucceeds(
            setDoc(
                doc(admin, "work/legacy-prod-work"),
                {
                    published: false,
                    order: 10,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            )
        );

        const snap1 = await getDoc(doc(admin, "work/legacy-prod-work"));
        const data1 = snap1.data();
        expect(data1?.published).toBe(false);
        expect(data1?.order).toBe(10);
        expect(data1?.createdAt).toBeDefined();
        expect(data1?.start).toBe("2023-01");

        // Merge-update on document with literal dotted keys
        await assertSucceeds(
            setDoc(
                doc(admin, "work/dotted-prod-work"),
                {
                    published: false,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            )
        );

        const snap2 = await getDoc(doc(admin, "work/dotted-prod-work"));
        const data2 = snap2.data();
        expect(data2?.published).toBe(false);
        expect(data2?.["locale.en.demoLabel"]).toBe("Live Demo");
        expect(data2?.["locale.en.demoUrl"]).toBe("https://example.com/demo");
        expect(data2?.createdAt).toBeDefined();

        // Also test a merge-update that legitimately leaves updatedAt untouched
        await assertSucceeds(
            setDoc(
                doc(admin, "work/legacy-prod-work"),
                {
                    order: 99,
                },
                { merge: true }
            )
        );
        const snap3 = await getDoc(doc(admin, "work/legacy-prod-work"));
        expect(snap3.data()?.order).toBe(99);
    });

    it("2. an admin update that introduces a key outside the allow-list is denied", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();

        // setDoc merge with forbidden key
        await assertFails(
            setDoc(
                doc(admin, "work/legacy-prod-work"),
                {
                    unauthorizedKey: "malicious",
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            )
        );

        // updateDoc with forbidden key
        await assertFails(
            updateDoc(doc(admin, "work/legacy-prod-work"), {
                unauthorizedKey: "malicious",
            })
        );
    });

    it("3. an admin create whose payload carries a key outside the allow-list is denied", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();

        await assertFails(
            setDoc(doc(admin, "work/new-with-extra"), {
                slug: "new-with-extra",
                published: true,
                order: 3,
                updatedAt: serverTimestamp(),
                unauthorizedKey: "malicious",
            })
        );
    });

    it("4. an admin create with a clean payload succeeds", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();

        await assertSucceeds(
            setDoc(doc(admin, "work/new-clean-work"), {
                slug: "new-clean-work",
                published: true,
                order: 3,
                updatedAt: serverTimestamp(),
            })
        );
    });

    it("5. a non-admin is still denied on both create and update", async () => {
        const someone = env.authenticatedContext("some-other-uid").firestore();
        const anon = env.unauthenticatedContext().firestore();

        // Non-admin authenticated user denied on create
        await assertFails(
            setDoc(doc(someone, "work/new-by-user"), {
                slug: "new-by-user",
                published: true,
                order: 1,
                updatedAt: serverTimestamp(),
            })
        );

        // Non-admin authenticated user denied on update
        await assertFails(
            setDoc(
                doc(someone, "work/legacy-prod-work"),
                {
                    published: false,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            )
        );

        // Anonymous user denied on create
        await assertFails(
            setDoc(doc(anon, "work/new-by-anon"), {
                slug: "new-by-anon",
                published: true,
                order: 1,
                updatedAt: serverTimestamp(),
            })
        );

        // Anonymous user denied on update
        await assertFails(
            setDoc(
                doc(anon, "work/legacy-prod-work"),
                {
                    published: false,
                },
                { merge: true }
            )
        );
    });

    it("an admin can update a singleton with allow-listed keys", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "singletons/hero"), {
                cycle: { en: ["a"], el: ["b"] },
                lede: {
                    en: { before: "1", highlight: "2", after: "3" },
                    el: { before: "1", highlight: "2", after: "3" },
                },
                meta: {
                    en: { stack: "s", location: "l", audience: "a" },
                    el: { stack: "s", location: "l", audience: "a" },
                },
                cta: {
                    en: { primary: "p", secondary: "s" },
                    el: { primary: "p", secondary: "s" },
                },
                updatedAt: new Date(),
            });
        });
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertSucceeds(
            setDoc(
                doc(admin, "singletons/hero"),
                {
                    cta: {
                        en: { primary: "p2", secondary: "s2" },
                        el: { primary: "p2", secondary: "s2" },
                    },
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            )
        );
    });

    it("an admin cannot update a singleton with disallowed keys", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).firestore();
        await assertFails(
            setDoc(
                doc(admin, "singletons/hero"),
                {
                    extraHeroKey: "evil",
                },
                { merge: true }
            )
        );
    });
});
