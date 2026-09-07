// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
    assertSucceeds,
    assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
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
        storage: {
            rules: readFileSync(resolve(__dirname, "../../firebase/storage.rules"), "utf-8"),
            host: "127.0.0.1",
            port: 9199,
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
    await env.clearStorage();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "settings/main"), {
            allowedAdminIds: [ADMIN_UID],
        });
    });
});

afterAll(async () => {
    if (env) {
        await env.cleanup();
    }
});

describe("storage rules — work", () => {
    it("anonymous read of work/my-project/hero.png succeeds", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx
                .storage()
                .ref("work/my-project/hero.png")
                .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" });
        });
        const anon = env.unauthenticatedContext().storage();
        await assertSucceeds(anon.ref("work/my-project/hero.png").getDownloadURL());
    });

    it("anonymous write to work/my-project/hero.png fails", async () => {
        const anon = env.unauthenticatedContext().storage();
        // put() returns a thenable UploadTask rather than a Promise
        await assertFails(
            Promise.resolve(
                anon
                    .ref("work/my-project/hero.png")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" })
            )
        );
    });

    it("authenticated non-admin write to work/my-project/hero.png fails", async () => {
        const nonAdmin = env.authenticatedContext("regular-user").storage();
        await assertFails(
            Promise.resolve(
                nonAdmin
                    .ref("work/my-project/hero.png")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" })
            )
        );
    });

    it("admin write of a valid png under 5 MB succeeds", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertSucceeds(
            Promise.resolve(
                admin
                    .ref("work/my-project/hero.png")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" })
            )
        );
    });

    it("admin write of valid jpeg and webp under 5 MB succeeds", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertSucceeds(
            Promise.resolve(
                admin
                    .ref("work/my-project/photo.jpeg")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" })
            )
        );
        await assertSucceeds(
            Promise.resolve(
                admin
                    .ref("work/my-project/photo.webp")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/webp" })
            )
        );
    });

    it("admin write with disallowed content type fails", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertFails(
            Promise.resolve(
                admin
                    .ref("work/my-project/hero.gif")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/gif" })
            )
        );
        await assertFails(
            Promise.resolve(
                admin
                    .ref("work/my-project/document.pdf")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "application/pdf" })
            )
        );
    });

    it("admin write over 5 MB fails", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).storage();
        const over5MB = new Uint8Array(5 * 1024 * 1024 + 1);
        await assertFails(
            Promise.resolve(
                admin.ref("work/my-project/hero.png").put(over5MB, { contentType: "image/png" })
            )
        );
    });

    it("path whose slug breaks regex fails both read and write", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx
                .storage()
                .ref("work/My_Project/hero.png")
                .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" });
        });
        const anon = env.unauthenticatedContext().storage();
        await assertFails(anon.ref("work/My_Project/hero.png").getDownloadURL());

        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertFails(
            Promise.resolve(
                admin
                    .ref("work/My_Project/hero.png")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" })
            )
        );
    });
});

describe("storage rules — writing", () => {
    it("anonymous read of writing/my-article/cover.webp succeeds", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx
                .storage()
                .ref("writing/my-article/cover.webp")
                .put(new Uint8Array([1, 2, 3]), { contentType: "image/webp" });
        });
        const anon = env.unauthenticatedContext().storage();
        await assertSucceeds(anon.ref("writing/my-article/cover.webp").getDownloadURL());
    });

    it("admin write to writing/my-article/cover.webp succeeds", async () => {
        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertSucceeds(
            Promise.resolve(
                admin
                    .ref("writing/my-article/cover.webp")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/webp" })
            )
        );
    });
});

describe("storage rules — default deny", () => {
    it("path outside work/ and writing/ fails read and write", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx
                .storage()
                .ref("secret/thing.png")
                .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" });
        });
        const anon = env.unauthenticatedContext().storage();
        await assertFails(anon.ref("secret/thing.png").getDownloadURL());

        const admin = env.authenticatedContext(ADMIN_UID).storage();
        await assertFails(
            Promise.resolve(
                admin
                    .ref("secret/thing.png")
                    .put(new Uint8Array([1, 2, 3]), { contentType: "image/png" })
            )
        );
    });
});
