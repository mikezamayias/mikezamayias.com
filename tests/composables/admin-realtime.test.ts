// tests/composables/admin-realtime.test.ts
//
// Coverage for the admin-side realtime helpers:
//   - `compareAdminRowsByOrderThenId` matches the server's sort contract.
//   - `useAdminListSnapshot` seeds from the prewarm cache on mount so an
//     in-app section nav paints rows instantly instead of skeletons.
//   - The seed sort runs even when the cache holds rows in arbitrary order.
//
// We exercise pure functions here (the snapshot lifecycle is browser-only
// and requires Firestore + Nuxt context, which is out of scope for unit
// tests — that's covered by manual smoke-test in the worktree).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

// Same shim pattern as admin-api-optimistic.test.ts — composable
// references global `useAuth`, `useState`, `$fetch` via Nuxt auto-imports.
const initAuthMock = vi.fn(async () => {});
const userMock = { value: { getIdToken: vi.fn(async () => "token") } };
const loadingMock = { value: false };
(globalThis as Record<string, unknown>).useAuth = () => ({
    user: userMock,
    loading: loadingMock,
    initAuth: initAuthMock,
});
(globalThis as Record<string, unknown>).watch = () => () => {};
// `useAdminRealtime` calls `ref()` at module scope (via auto-import) to
// construct the snapshot handle. Bridge to the real Vue `ref` so the
// composable's reactive primitives behave as in production.
(globalThis as Record<string, unknown>).ref = ref;
const stateBag = new Map<string, ReturnType<typeof ref>>();
(globalThis as Record<string, unknown>).useState = (key: string, init?: () => unknown) => {
    if (!stateBag.has(key)) stateBag.set(key, ref(init ? init() : undefined));
    return stateBag.get(key)!;
};
// Lifecycle hooks are no-ops in the unit-test shell — the test only
// exercises pure constructor behaviour (seed → data/pending) and the
// `compareAdminRowsByOrderThenId` comparator.
(globalThis as Record<string, unknown>).onMounted = () => {};
(globalThis as Record<string, unknown>).onUnmounted = () => {};

// Bridge `useAdminApi` to a minimal shim. The realtime composable only
// reads `listCollection` / `getSingleton` / `getCollectionDoc`; the
// constructor doesn't actually call them (the initial fetch fires
// inside onMounted, which we stub above). Returning empty stubs is
// enough to satisfy the destructure at module-load time.
(globalThis as Record<string, unknown>).useAdminApi = () => ({
    listCollection: vi.fn(async () => []),
    getSingleton: vi.fn(async () => ({})),
    getCollectionDoc: vi.fn(async () => ({})),
});

// import.meta.client is false in the unit-test environment by default —
// keep the snapshot lifecycle branch dormant so we test only the
// synchronous constructor behaviour.

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn(async () => []);
    (globalThis as Record<string, unknown>).$fetch = fetchMock;
});

describe("compareAdminRowsByOrderThenId", () => {
    it("sorts by numeric `order` ascending", async () => {
        const { compareAdminRowsByOrderThenId } = await import("~/composables/useAdminRealtime");
        const rows = [
            { id: "c", order: 2 },
            { id: "a", order: 0 },
            { id: "b", order: 1 },
        ];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    });

    it("falls back to id when `order` is equal", async () => {
        const { compareAdminRowsByOrderThenId } = await import("~/composables/useAdminRealtime");
        const rows = [
            { id: "z", order: 0 },
            { id: "a", order: 0 },
            { id: "m", order: 0 },
        ];
        rows.sort(compareAdminRowsByOrderThenId);
        expect(rows.map((r) => r.id)).toEqual(["a", "m", "z"]);
    });

    it("pushes rows with no `order` to the end", async () => {
        const { compareAdminRowsByOrderThenId } = await import("~/composables/useAdminRealtime");
        const rows = [{ id: "x" }, { id: "y", order: 0 }, { id: "z" }];
        rows.sort(compareAdminRowsByOrderThenId);
        // `y` (numeric order) comes first; `x` and `z` (no order) fall
        // back to id-ascending. Matches the server's behaviour in
        // `compareAdminDocuments` so the snapshot doesn't reshuffle the
        // SSR list once it lands.
        expect(rows.map((r) => r.id)).toEqual(["y", "x", "z"]);
    });

    it("treats non-finite `order` as no order", async () => {
        const { compareAdminRowsByOrderThenId } = await import("~/composables/useAdminRealtime");
        const rows = [
            { id: "a", order: Number.NaN },
            { id: "b", order: 0 },
        ];
        rows.sort(compareAdminRowsByOrderThenId);
        // `b` (real order) first, `a` (NaN) treated as no order, so id-
        // sorted to the back. Prevents a stray NaN from a malformed doc
        // from corrupting the visible ordering.
        expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    });
});

describe("useAdminListSnapshot seeding", () => {
    it("paints seed rows immediately when the prewarm cache has data", async () => {
        const { useAdminListSnapshot, compareAdminRowsByOrderThenId } =
            await import("~/composables/useAdminRealtime");

        const seed = [
            { id: "two", order: 2, name: "Two" },
            { id: "one", order: 1, name: "One" },
        ];

        const handle = useAdminListSnapshot<{ order: number; name: string }>({
            collection: "skills",
            sort: compareAdminRowsByOrderThenId,
            initial: () => seed,
        });

        // Seed lands synchronously — no skeleton frame.
        expect(handle.pending.value).toBe(false);
        expect(handle.data.value?.map((r) => r.id)).toEqual(["one", "two"]);
    });

    it("starts in pending state when the prewarm cache is empty", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");

        const handle = useAdminListSnapshot<{ order: number }>({
            collection: "skills",
            initial: () => undefined,
        });

        expect(handle.pending.value).toBe(true);
        expect(handle.data.value).toBeNull();
    });

    it("starts in pending state when the prewarm cache exists but is empty", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");

        // A cache entry of `[]` is treated as "not yet meaningful" so
        // the parent shows skeletons instead of an "empty" state. The
        // snapshot's eventual fetch will replace the seed when it
        // resolves either way.
        const handle = useAdminListSnapshot<{ order: number }>({
            collection: "skills",
            initial: () => [],
        });

        expect(handle.pending.value).toBe(true);
        expect(handle.data.value).toBeNull();
    });

    it("uses initialFetchFn instead of listCollection when provided", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");
        const customFetch = vi.fn(async () => [{ id: "msg-1", body: "hi" }]);

        const handle = useAdminListSnapshot<{ body: string }>({
            collection: "messages",
            initialFetchFn: customFetch,
        });

        await handle.refresh();

        expect(customFetch).toHaveBeenCalled();
        expect(handle.data.value?.map((r) => r.id)).toEqual(["msg-1"]);
        expect(handle.pending.value).toBe(false);
    });
});
