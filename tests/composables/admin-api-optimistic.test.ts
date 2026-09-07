import { ref } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";

// `useAdminApi` lives in `composables/` and pulls in `useAuth` /
// Firestore SDK. Stub the auth wrapper + Firestore so we can exercise
// the optimistic helpers in isolation without booting Nuxt.

const initAuthMock = vi.fn(async () => {});
const userMock = { value: { uid: "test-admin", getIdToken: vi.fn(async () => "token") } };
const loadingMock = { value: false };

const setDocMock = vi.fn(async () => {});
const deleteDocMock = vi.fn(async () => {});
const addDocMock = vi.fn(async () => ({ id: "audit-1" }));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn((_db, name) => ({ path: name })),
    doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
    setDoc: setDocMock,
    deleteDoc: deleteDocMock,
    addDoc: addDocMock,
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

vi.mock("~/utils/adminFirestore", () => ({
    getAdminFirestore: vi.fn(async () => ({})),
}));

vi.mock("#app", () => ({
    useAuth: () => ({ user: userMock, loading: loadingMock, initAuth: initAuthMock }),
}));

// Composable references global `useAuth` (Nuxt auto-import). Provide a
// shim on globalThis so the import resolves.
(globalThis as Record<string, unknown>).useAuth = () => ({
    user: userMock,
    loading: loadingMock,
    initAuth: initAuthMock,
});
(globalThis as Record<string, unknown>).watch = () => () => {};
// `useAdminApi` now keeps a `useState`-backed list cache for the
// hover-prefetch surface (`prefetchListCollection`). The optimistic
// helpers under test never read that cache, so a minimal shim that
// returns a regular Vue ref is enough to satisfy the singleton
// lookup without booting Nuxt.
const stateBag = new Map<string, ReturnType<typeof ref>>();
(globalThis as Record<string, unknown>).useState = (key: string, init?: () => unknown) => {
    if (!stateBag.has(key)) stateBag.set(key, ref(init ? init() : undefined));
    return stateBag.get(key)!;
};

beforeEach(() => {
    setDocMock.mockReset().mockResolvedValue(undefined);
    deleteDocMock.mockReset().mockResolvedValue(undefined);
    addDocMock.mockReset().mockResolvedValue({ id: "audit-1" });
});

async function loadComposable() {
    const mod = await import("~/composables/useAdminApi");
    return mod.useAdminApi();
}

interface Row {
    id: string;
    name: string;
}

function mockWritingDoc(id: string, title = "Title") {
    return {
        id,
        slug: id,
        date: "2026-09-07",
        tags: ["tech"],
        read: 5,
        order: 0,
        published: true,
        locales_available: ["en"] as ["en"],
        locale: {
            en: { title, sub: "", body: "Body content" },
        },
    };
}

describe("useAdminApi.optimisticDelete", () => {
    it("splices the row out on success and clears the pending marker", async () => {
        const api = await loadComposable();
        const items = ref<Row[]>([
            { id: "a", name: "A" },
            { id: "b", name: "B" },
            { id: "c", name: "C" },
        ]);
        const pendingIds = ref(new Set<string>());

        await api.optimisticDelete("writing", "b", items, pendingIds);

        expect(items.value.map((x) => x.id)).toEqual(["a", "c"]);
        expect(pendingIds.value.has("b")).toBe(false);
    });

    it("keeps the row in place on failure and surfaces the error", async () => {
        deleteDocMock.mockRejectedValueOnce(new Error("boom"));
        const api = await loadComposable();
        const items = ref<Row[]>([
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ]);
        const pendingIds = ref(new Set<string>());

        await expect(api.optimisticDelete("writing", "b", items, pendingIds)).rejects.toThrow(
            "boom"
        );
        expect(items.value.map((x) => x.id)).toEqual(["a", "b"]);
        expect(pendingIds.value.has("b")).toBe(false);
    });

    it("returns false (no-op) if the row was already removed before the request", async () => {
        const api = await loadComposable();
        const items = ref<Row[]>([{ id: "a", name: "A" }]);
        const pendingIds = ref(new Set<string>());

        const result = await api.optimisticDelete("writing", "missing", items, pendingIds);

        expect(result).toBe(false);
        expect(items.value.map((x) => x.id)).toEqual(["a"]);
        expect(deleteDocMock).not.toHaveBeenCalled();
    });

    it("returns true when the row is removed", async () => {
        const api = await loadComposable();
        const items = ref<Row[]>([{ id: "a", name: "A" }]);
        const pendingIds = ref(new Set<string>());

        const result = await api.optimisticDelete("writing", "a", items, pendingIds);
        expect(result).toBe(true);
    });

    it("skips the splice if the list reference changed during the await", async () => {
        let resolveDelete: () => void = () => {};
        const deletePromise = new Promise<void>((r) => {
            resolveDelete = r;
        });
        deleteDocMock.mockImplementationOnce(() => deletePromise);

        const api = await loadComposable();
        const items = ref<Row[]>([
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ]);
        const pendingIds = ref(new Set<string>());

        const inflight = api.optimisticDelete("writing", "b", items, pendingIds);

        // Mid-flight section switch: parent reloads with a different list
        // (same id space but different rows).
        items.value = [{ id: "b", name: "Other-Section-B" }];

        resolveDelete();
        await inflight;

        // The replaced list is preserved untouched — we never spliced into it.
        expect(items.value).toEqual([{ id: "b", name: "Other-Section-B" }]);
    });
});

describe("useAdminApi.optimisticSave", () => {
    it("inserts at the head when the id is not yet in the list", async () => {
        const api = await loadComposable();
        const items = ref([mockWritingDoc("a", "A")]);
        const pendingIds = ref(new Set<string>());

        await api.optimisticSave(
            "writing",
            "new",
            mockWritingDoc("new", "Fresh"),
            items,
            pendingIds
        );

        expect(items.value.map((x) => x.id)).toEqual(["new", "a"]);
    });

    it("replaces in place when the id already exists", async () => {
        const api = await loadComposable();
        const items = ref([mockWritingDoc("a", "A"), mockWritingDoc("b", "B-old")]);
        const pendingIds = ref(new Set<string>());

        await api.optimisticSave("writing", "b", mockWritingDoc("b", "B-new"), items, pendingIds);

        expect(items.value).toEqual([mockWritingDoc("a", "A"), mockWritingDoc("b", "B-new")]);
    });

    it("rolls back to the snapshot on failure (update path)", async () => {
        setDocMock.mockRejectedValueOnce(new Error("server-rejected"));
        const api = await loadComposable();
        const items = ref([mockWritingDoc("a", "A"), mockWritingDoc("b", "B-old")]);
        const pendingIds = ref(new Set<string>());

        await expect(
            api.optimisticSave("writing", "b", mockWritingDoc("b", "B-new"), items, pendingIds)
        ).rejects.toThrow("server-rejected");

        expect(items.value).toEqual([mockWritingDoc("a", "A"), mockWritingDoc("b", "B-old")]);
    });

    it("rolls back by removing the row on failure (create path)", async () => {
        setDocMock.mockRejectedValueOnce(new Error("server-rejected"));
        const api = await loadComposable();
        const items = ref([mockWritingDoc("a", "A")]);
        const pendingIds = ref(new Set<string>());

        await expect(
            api.optimisticSave("writing", "new", mockWritingDoc("new", "X"), items, pendingIds)
        ).rejects.toThrow("server-rejected");

        expect(items.value).toEqual([mockWritingDoc("a", "A")]);
    });

    // Regression for the rollback-by-truthiness bug. If the caller fires
    // an update that fails, the rollback must restore the original row;
    // if the caller fires an insert that fails, the rollback must remove
    // the inserted row. Deciding between them via `snapshot` truthiness
    // breaks when an inserted id collides with an existing row.
    it("update-path rollback restores the pre-existing row in place", async () => {
        setDocMock.mockRejectedValueOnce(new Error("server-rejected"));
        const api = await loadComposable();
        const items = ref([mockWritingDoc("x", "pre-existing")]);
        const pendingIds = ref(new Set<string>());

        await expect(
            api.optimisticSave("writing", "x", mockWritingDoc("x", "user-edits"), items, pendingIds)
        ).rejects.toThrow("server-rejected");

        // The optimistic update wrote `user-edits`, the failure restored
        // `pre-existing`. Verify the original row is back in its slot.
        expect(items.value).toEqual([mockWritingDoc("x", "pre-existing")]);
    });
});
