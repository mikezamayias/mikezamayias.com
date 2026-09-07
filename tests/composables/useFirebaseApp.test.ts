// tests/composables/useFirebaseApp.test.ts
//
// I5 (code-reviewer) follow-up: useFirebaseApp now fails fast when
// any required Firebase config field is missing — previously it would
// pass empty strings into initializeApp() and the next SDK call would
// throw the cryptic "auth/invalid-api-key". The validation throws
// happen BEFORE the dynamic `await import("firebase/app")`, so the
// tests only need to stub useRuntimeConfig — no firebase/* mocking
// required, and the module's module-scope `app` singleton stays untouched.

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useFirebaseApp", () => {
    beforeEach(() => {
        // Reset module cache so the module-scope `let app` singleton
        // doesn't carry across cases — each test gets a fresh import
        // with its own stubbed useRuntimeConfig.
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("throws when apiKey is missing", async () => {
        vi.stubGlobal("useRuntimeConfig", () => ({
            public: {
                firebaseApiKey: "",
                firebaseAuthDomain: "test.firebaseapp.com",
                firebaseProjectId: "test-project",
                firebaseStorageBucket: "test.appspot.com",
                firebaseMessagingSenderId: "123",
                firebaseAppId: "1:123:web:abc",
            },
        }));
        const { useFirebaseApp } = await import("../../composables/useFirebaseApp");
        await expect(useFirebaseApp()).rejects.toThrow(/required apiKey\/projectId\/appId/);
    });

    it("throws when projectId is missing", async () => {
        vi.stubGlobal("useRuntimeConfig", () => ({
            public: {
                firebaseApiKey: "test-key",
                firebaseAuthDomain: "test.firebaseapp.com",
                firebaseProjectId: "",
                firebaseStorageBucket: "test.appspot.com",
                firebaseMessagingSenderId: "123",
                firebaseAppId: "1:123:web:abc",
            },
        }));
        const { useFirebaseApp } = await import("../../composables/useFirebaseApp");
        await expect(useFirebaseApp()).rejects.toThrow(/required apiKey\/projectId\/appId/);
    });

    it("throws when appId is missing", async () => {
        vi.stubGlobal("useRuntimeConfig", () => ({
            public: {
                firebaseApiKey: "test-key",
                firebaseAuthDomain: "test.firebaseapp.com",
                firebaseProjectId: "test-project",
                firebaseStorageBucket: "test.appspot.com",
                firebaseMessagingSenderId: "123",
                firebaseAppId: "",
            },
        }));
        const { useFirebaseApp } = await import("../../composables/useFirebaseApp");
        await expect(useFirebaseApp()).rejects.toThrow(/required apiKey\/projectId\/appId/);
    });
});
