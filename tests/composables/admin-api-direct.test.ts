import { ref } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nuxt";

const setDocMock = vi.fn(async () => {});
const deleteDocMock = vi.fn(async () => {});
const addDocMock = vi.fn(async () => ({ id: "audit-1" }));
const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const fetchMock = vi.fn(async () => ({ success: true }));
const serverTimestampSentinel = { _serverTimestamp: true };

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, name) => ({ path: name })),
    doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
    setDoc: setDocMock,
    deleteDoc: deleteDocMock,
    addDoc: addDocMock,
    getDoc: getDocMock,
    getDocs: getDocsMock,
    serverTimestamp: () => serverTimestampSentinel,
}));

vi.mock("~/utils/adminFirestore", () => ({
    getAdminFirestore: vi.fn(async () => ({})),
}));

vi.mock("@sentry/nuxt", () => ({
    captureException: vi.fn(),
}));

const userMock: {
    value: { uid: string; getIdToken: () => Promise<string> } | null;
} = {
    value: { uid: "test-admin-uid", getIdToken: vi.fn(async () => "token-123") },
};
const loadingMock = { value: false };

vi.mock("#app", () => ({
    useAuth: () => ({ user: userMock, loading: loadingMock, initAuth: vi.fn(async () => {}) }),
}));

(globalThis as Record<string, unknown>).useAuth = () => ({
    user: userMock,
    loading: loadingMock,
    initAuth: vi.fn(async () => {}),
});
(globalThis as Record<string, unknown>).watch = () => () => {};
(globalThis as Record<string, unknown>).$fetch = fetchMock;

const stateBag = new Map<string, ReturnType<typeof ref>>();
(globalThis as Record<string, unknown>).useState = (key: string, init?: () => unknown) => {
    if (!stateBag.has(key)) stateBag.set(key, ref(init ? init() : undefined));
    return stateBag.get(key)!;
};

beforeEach(() => {
    vi.clearAllMocks();
    setDocMock.mockReset().mockResolvedValue(undefined);
    deleteDocMock.mockReset().mockResolvedValue(undefined);
    addDocMock.mockReset().mockResolvedValue({ id: "audit-1" });
    fetchMock.mockReset().mockResolvedValue({ success: true });
    stateBag.clear();
    userMock.value = { uid: "test-admin-uid", getIdToken: vi.fn(async () => "token-123") };
    loadingMock.value = false;
});

async function loadComposable() {
    const mod = await import("~/composables/useAdminApi");
    return mod.useAdminApi();
}

describe("useAdminApi direct firestore operations", () => {
    it("save validates with zod and rejects an invalid body without ever calling setDoc", async () => {
        const api = await loadComposable();
        const invalidBody = {
            slug: "invalid-writing",
        };

        await expect(
            api.saveCollectionDoc(
                "writing",
                "invalid-writing",
                invalidBody as unknown as Record<string, unknown>
            )
        ).rejects.toThrow(/Validation failed/);

        expect(setDocMock).not.toHaveBeenCalled();
        expect(addDocMock).not.toHaveBeenCalled();
    });

    it("saveCollectionDoc throws for unknown collection", async () => {
        const api = await loadComposable();

        await expect(api.saveCollectionDoc("unknown-collection", "doc-1", {})).rejects.toThrow(
            "Unknown content collection: unknown-collection"
        );
    });

    it("save calls setDoc with merge: true and a serverTimestamp updatedAt", async () => {
        const api = await loadComposable();
        const validBody = {
            slug: "hello-world",
            date: "2026-09-07",
            tags: ["news"],
            read: 5,
            order: 1,
            published: true,
            locales_available: ["en"],
            locale: { en: { title: "Hello", sub: "Subtitle", body: "Long body" } },
        };

        const result = await api.saveCollectionDoc("writing", "hello-world", validBody);

        expect(result).toEqual({ success: true, id: "hello-world" });
        expect(setDocMock).toHaveBeenCalledTimes(1);
        const firstCall = setDocMock.mock.calls[0] as unknown as [unknown, unknown, unknown];
        const [docRef, data, options] = firstCall;
        expect(docRef).toEqual({ path: "writing/hello-world" });
        expect(data).toEqual({
            ...validBody,
            updatedAt: serverTimestampSentinel,
        });
        expect(options).toEqual({ merge: true });

        expect(addDocMock).toHaveBeenCalledWith(
            { path: "audit" },
            expect.objectContaining({
                uid: "test-admin-uid",
                ts: serverTimestampSentinel,
                collection: "writing",
                docId: "hello-world",
                action: "upsert",
            })
        );
    });

    it("delete calls deleteDoc and resolves { success: true, id }", async () => {
        const api = await loadComposable();

        const result = await api.deleteCollectionDoc("writing", "doc-to-delete");

        expect(result).toEqual({ success: true, id: "doc-to-delete" });
        expect(deleteDocMock).toHaveBeenCalledTimes(1);
        const deleteCall = deleteDocMock.mock.calls[0] as unknown as [unknown];
        const [docRef] = deleteCall;
        expect(docRef).toEqual({ path: "writing/doc-to-delete" });

        expect(addDocMock).toHaveBeenCalledWith(
            { path: "audit" },
            expect.objectContaining({
                uid: "test-admin-uid",
                ts: serverTimestampSentinel,
                collection: "writing",
                docId: "doc-to-delete",
                action: "delete",
            })
        );
    });

    it("an audit write failure does not fail the caller's delete", async () => {
        addDocMock.mockRejectedValueOnce(new Error("audit-delete-failed"));
        const api = await loadComposable();

        const result = await api.deleteCollectionDoc("writing", "doc-to-delete");
        expect(result).toEqual({ success: true, id: "doc-to-delete" });
        expect(Sentry.captureException).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                tags: { component: "audit-log", action: "delete" },
                extra: { collection: "writing", docId: "doc-to-delete", uid: "test-admin-uid" },
            })
        );
    });

    it("an audit write failure does not fail the caller's save", async () => {
        addDocMock.mockRejectedValueOnce(new Error("audit-write-failed"));
        const api = await loadComposable();
        const validBody = {
            slug: "hello-world",
            date: "2026-09-07",
            tags: ["news"],
            read: 5,
            order: 1,
            published: true,
            locales_available: ["en"],
            locale: { en: { title: "Hello", sub: "Subtitle", body: "Long body" } },
        };

        const result = await api.saveCollectionDoc("writing", "hello-world", validBody);

        expect(result).toEqual({ success: true, id: "hello-world" });
        expect(setDocMock).toHaveBeenCalledTimes(1);
        expect(Sentry.captureException).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                tags: { component: "audit-log", action: "upsert" },
                extra: { collection: "writing", docId: "hello-world", uid: "test-admin-uid" },
            })
        );
    });

    it("getCollectionDoc throws 404 error when document does not exist", async () => {
        getDocMock.mockResolvedValueOnce({
            exists: () => false,
        });
        const api = await loadComposable();

        await expect(api.getCollectionDoc("writing", "missing")).rejects.toThrow("Not found");
    });

    it("getCollectionDoc returns document data when exists", async () => {
        getDocMock.mockResolvedValueOnce({
            id: "doc-1",
            exists: () => true,
            data: () => ({ slug: "doc-1", title: "Doc 1" }),
        });
        const api = await loadComposable();

        const doc = await api.getCollectionDoc("writing", "doc-1");
        expect(doc).toEqual({ id: "doc-1", slug: "doc-1", title: "Doc 1" });
    });

    it("listCollection returns sorted documents by order then id", async () => {
        getDocsMock.mockResolvedValueOnce({
            docs: [
                { id: "zulu", data: () => ({}) },
                { id: "beta", data: () => ({ order: 2 }) },
                { id: "alpha", data: () => ({ order: 2 }) },
                { id: "charlie", data: () => ({ order: 1 }) },
            ],
        });
        const api = await loadComposable();

        const rows = await api.listCollection("writing");
        expect(rows.map((r) => r.id)).toEqual(["charlie", "alpha", "beta", "zulu"]);
    });

    it("getSingleton throws 404 for unknown singleton name", async () => {
        const api = await loadComposable();

        await expect(api.getSingleton("unknown-single")).rejects.toThrow(
            "Unknown singleton: unknown-single"
        );
    });

    it("getSingleton throws 404 when document does not exist", async () => {
        getDocMock.mockResolvedValueOnce({
            exists: () => false,
        });
        const api = await loadComposable();

        await expect(api.getSingleton("hero")).rejects.toThrow("Not found");
    });

    it("getSingleton returns document data when exists", async () => {
        getDocMock.mockResolvedValueOnce({
            id: "hero",
            exists: () => true,
            data: () => ({ cycle: { en: ["a"], el: ["b"] } }),
        });
        const api = await loadComposable();

        const doc = await api.getSingleton("hero");
        expect(doc).toEqual({ id: "hero", cycle: { en: ["a"], el: ["b"] } });
    });

    it("saveSingleton validates and saves to singletons/{name}", async () => {
        const api = await loadComposable();
        const validRoadmapMeta = {
            goal: { en: "Goal" },
            target: { en: "Target" },
            intro: { en: "Intro" },
        };

        const result = await api.saveSingleton("roadmap", validRoadmapMeta);

        expect(result).toEqual({ success: true, id: "roadmap" });
        expect(setDocMock).toHaveBeenCalledWith(
            { path: "singletons/roadmap" },
            {
                ...validRoadmapMeta,
                updatedAt: serverTimestampSentinel,
            },
            { merge: true }
        );
    });

    it("saveSingleton throws 404 for unknown singleton name", async () => {
        const api = await loadComposable();

        await expect(api.saveSingleton("unknown-single", {})).rejects.toThrow(
            "Unknown singleton: unknown-single"
        );
    });

    it("saveSingleton rejects invalid body with validation error", async () => {
        const api = await loadComposable();

        await expect(
            api.saveSingleton("roadmap", {} as unknown as Record<string, unknown>)
        ).rejects.toThrow(/Validation failed/);
    });

    it("prefetchListCollection caches rows and silently catches errors", async () => {
        getDocsMock.mockResolvedValueOnce({
            docs: [{ id: "row-1", data: () => ({ slug: "row-1" }) }],
        });
        const api = await loadComposable();

        await api.prefetchListCollection("writing");

        const cache = (
            globalThis as unknown as {
                useState: (key: string) => { value: Record<string, unknown> };
            }
        ).useState("admin-list-cache").value;
        expect(cache.writing).toEqual([{ id: "row-1", slug: "row-1" }]);

        // Calling a second time should return early from cache without fetching again
        getDocsMock.mockClear();
        await api.prefetchListCollection("writing");
        expect(getDocsMock).not.toHaveBeenCalled();

        // Failure in fetch should be caught silently
        getDocsMock.mockRejectedValueOnce(new Error("network-fail"));
        await expect(api.prefetchListCollection("skills")).resolves.toBeUndefined();
    });

    it("adminFetch sets authorization header and calls $fetch", async () => {
        const api = await loadComposable();

        await api.adminFetch("/api/admin/messages");

        expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages", {
            headers: expect.any(Headers),
        });
        const firstCall = fetchMock.mock.calls[0] as unknown as [string, { headers: Headers }];
        const headers = firstCall[1].headers;
        expect(headers.get("Authorization")).toBe("Bearer token-123");
    });

    it("adminFetch throws if user is not authenticated", async () => {
        userMock.value = null;
        const api = await loadComposable();

        await expect(api.adminFetch("/api/admin/messages")).rejects.toThrow(
            "Admin authentication is required."
        );
    });

    it("listMessages and updateMessage delegate to adminFetch", async () => {
        const api = await loadComposable();

        await api.listMessages(20);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/admin/messages",
            expect.objectContaining({
                query: { limit: 20 },
            })
        );

        await api.updateMessage("msg-1", true);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/admin/messages/msg-1",
            expect.objectContaining({
                method: "PATCH",
                body: { read: true },
            })
        );
    });
});
