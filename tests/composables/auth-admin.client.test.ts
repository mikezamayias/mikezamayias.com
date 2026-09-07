import { ref } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nuxt";

const getDocMock = vi.fn();
const signOutMock = vi.fn(async () => {});
const onAuthStateChangedMock = vi.fn();
const getAuthMock = vi.fn(() => ({}));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
    getDoc: (...args: unknown[]) => getDocMock(...args),
}));

vi.mock("firebase/auth", () => ({
    getAuth: getAuthMock,
    onAuthStateChanged: onAuthStateChangedMock,
    signOut: signOutMock,
    multiFactor: vi.fn((u: unknown) => ({
        enrolledFactors: (u as { factors?: Array<{ factorId: string }> })?.factors ?? [],
        unenroll: vi.fn(async () => {}),
    })),
    TotpMultiFactorGenerator: {
        FACTOR_ID: "totp",
    },
}));

vi.mock("@sentry/nuxt", () => ({
    captureException: vi.fn(),
}));

vi.mock("~/composables/useFirebaseApp", () => ({
    useFirebaseApp: vi.fn(async () => ({})),
}));

const stateBag = new Map<string, ReturnType<typeof ref>>();
(globalThis as Record<string, unknown>).useState = (key: string, init?: () => unknown) => {
    if (!stateBag.has(key)) stateBag.set(key, ref(init ? init() : undefined));
    return stateBag.get(key)!;
};
(globalThis as Record<string, unknown>).useFirebaseApp = vi.fn(async () => ({}));
const authInstanceRef = ref<unknown>(null);
(globalThis as Record<string, unknown>).useFirebase = () => ({
    auth: authInstanceRef,
});

beforeEach(() => {
    vi.clearAllMocks();
    getDocMock.mockReset();
    signOutMock.mockReset().mockResolvedValue(undefined);
    stateBag.clear();
    authInstanceRef.value = null;
});

async function loadAuth() {
    const mod = await import("~/composables/useAuth");
    return mod.useAuth();
}

interface MockUser {
    uid: string;
    getIdToken: () => Promise<string>;
    factors?: Array<{ factorId: string }>;
}

describe("useAuth.verifyAdminStatus", () => {
    const mockUser: MockUser = {
        uid: "admin-123",
        getIdToken: vi.fn(async () => "token"),
    };

    it("returns true when the settings document lists the uid", async () => {
        getDocMock.mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
                allowedAdminIds: ["admin-123", "other-admin"],
            }),
        });
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(true);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns false when the settings document does not include the uid", async () => {
        getDocMock.mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
                allowedAdminIds: ["different-admin"],
            }),
        });
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(false);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns false when the settings document does not exist", async () => {
        getDocMock.mockResolvedValueOnce({
            exists: () => false,
        });
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(false);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns false and does NOT call Sentry on permission-denied", async () => {
        const permError = new Error("Missing or insufficient permissions.");
        (permError as unknown as { code: string }).code = "permission-denied";
        getDocMock.mockRejectedValueOnce(permError);
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(false);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns false and does NOT call Sentry on firestore/permission-denied", async () => {
        const permError = new Error("Missing or insufficient permissions.");
        (permError as unknown as { code: string }).code = "firestore/permission-denied";
        getDocMock.mockRejectedValueOnce(permError);
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(false);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns false and DOES call Sentry on a generic error", async () => {
        const genericError = new Error("Network offline or timeout");
        (genericError as unknown as { code: string }).code = "unavailable";
        getDocMock.mockRejectedValueOnce(genericError);
        const auth = await loadAuth();

        const result = await auth.verifyAdminStatus(
            mockUser as unknown as import("firebase/auth").User
        );

        expect(result).toBe(false);
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
        expect(Sentry.captureException).toHaveBeenCalledWith(
            genericError,
            expect.objectContaining({
                tags: { component: "verifyAdminStatus" },
                extra: { uid: "admin-123" },
            })
        );
    });

    it("logout signs out and resets user and isAdmin states", async () => {
        const auth = await loadAuth();
        auth.user.value = mockUser as unknown as import("firebase/auth").User;
        auth.isAdmin.value = true;
        authInstanceRef.value = {};

        await auth.logout();

        expect(signOutMock).toHaveBeenCalled();
        expect(auth.user.value).toBeNull();
        expect(auth.isAdmin.value).toBe(false);
    });

    it("hasTotpEnrolled detects TOTP factor", async () => {
        const auth = await loadAuth();
        const userWithTotp = {
            factors: [{ factorId: "totp" }],
        };
        const userWithoutTotp = {
            factors: [{ factorId: "sms" }],
        };

        expect(
            await auth.hasTotpEnrolled(userWithTotp as unknown as import("firebase/auth").User)
        ).toBe(true);
        expect(
            await auth.hasTotpEnrolled(userWithoutTotp as unknown as import("firebase/auth").User)
        ).toBe(false);
        expect(await auth.hasTotpEnrolled(null)).toBe(false);
    });
});
