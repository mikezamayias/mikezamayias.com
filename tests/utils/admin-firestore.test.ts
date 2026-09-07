import { describe, expect, it, vi } from "vitest";

const getFirestoreMock = vi.fn((app: unknown) => ({ app }));

vi.mock("firebase/firestore", () => ({
    getFirestore: (app: unknown) => getFirestoreMock(app),
}));

vi.mock("~/composables/useFirebaseApp", () => ({
    useFirebaseApp: vi.fn(async () => ({ name: "mock-app" })),
}));

(globalThis as Record<string, unknown>).useFirebaseApp = vi.fn(async () => ({ name: "mock-app" }));

describe("getAdminFirestore", () => {
    it("obtains the firestore instance using useFirebaseApp", async () => {
        const { getAdminFirestore } = await import("~/utils/adminFirestore");
        const db = await getAdminFirestore();

        expect(getFirestoreMock).toHaveBeenCalledWith({ name: "mock-app" });
        expect(db).toEqual({ app: { name: "mock-app" } });
    });
});
