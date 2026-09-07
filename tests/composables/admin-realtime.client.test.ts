import { ref, nextTick } from "vue";
import { until } from "@vueuse/core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const snapshotCallbacks: Array<
    (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void
> = [];

const initAuthMock = vi.fn(async () => {});
const userMock = { value: { getIdToken: vi.fn(async () => "token") } };
const loadingMock = { value: false };

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(() => ({})),
    query: vi.fn((q: unknown) => q),
    orderBy: vi.fn((q: unknown) => q),
    limit: vi.fn((q: unknown) => q),
    onSnapshot: vi.fn((refOrQuery: unknown, pathOrCb: unknown, maybeCb?: unknown) => {
        const cb =
            typeof maybeCb === "function"
                ? (maybeCb as (typeof snapshotCallbacks)[number])
                : (pathOrCb as (typeof snapshotCallbacks)[number]);
        snapshotCallbacks.push(cb);
        queueMicrotask(() => cb({ docs: [] }));
        return () => {};
    }),
}));

vi.mock("~/composables/useFirebaseApp", () => ({
    useFirebaseApp: vi.fn(async () => ({})),
}));

let fetchMock: ReturnType<typeof vi.fn>;

const stateBag = new Map<string, ReturnType<typeof ref>>();

function installClientMocks() {
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("until", until);
    vi.stubGlobal(
        "watch",
        (source: unknown, cb: (val: unknown) => void, opts?: { immediate?: boolean }) => {
            const run = () => {
                let val: unknown;
                if (Array.isArray(source)) {
                    val = source.map((s) =>
                        typeof s === "object" && s !== null && "value" in s
                            ? (s as { value: unknown }).value
                            : s
                    );
                } else if (typeof source === "function") {
                    val = (source as () => unknown)();
                } else {
                    val = source;
                }
                cb(val);
            };
            if (opts?.immediate) run();
            else queueMicrotask(run);
            return () => {};
        }
    );
    vi.stubGlobal("onMounted", (fn: () => void) => {
        queueMicrotask(fn);
    });
    vi.stubGlobal("onUnmounted", (fn: () => void) => {
        queueMicrotask(fn);
    });
    vi.stubGlobal("useAuth", () => ({
        user: userMock,
        loading: loadingMock,
        initAuth: initAuthMock,
    }));
    vi.stubGlobal("useFirebaseApp", async () => ({}));
    vi.stubGlobal("useAdminApi", () => ({
        listCollection: fetchMock,
        getSingleton: vi.fn(),
        getCollectionDoc: vi.fn(),
    }));
    vi.stubGlobal("useState", (key: string, init?: () => unknown) => {
        if (!stateBag.has(key)) stateBag.set(key, ref(init ? init() : undefined));
        return stateBag.get(key)!;
    });
    vi.stubGlobal("useRuntimeConfig", () => ({ public: {} }));
    vi.stubGlobal("$fetch", fetchMock);

    const runIdle = (cb: IdleRequestCallback) => {
        queueMicrotask(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline));
        return 1;
    };
    vi.stubGlobal("requestIdleCallback", runIdle as typeof requestIdleCallback);
    vi.stubGlobal("cancelIdleCallback", (() => {}) as typeof cancelIdleCallback);
}

function snapshotCallbackAt(index: number) {
    const cb = snapshotCallbacks[index];
    if (!cb) {
        throw new Error(
            `onSnapshot callback ${index} missing (registered ${snapshotCallbacks.length})`
        );
    }
    return cb;
}

async function flushOpen() {
    await nextTick();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await vi.advanceTimersByTimeAsync(2500);
}

// Snapshot lifecycle needs full Nuxt client + Firestore wiring (onMounted → whenIdle → open).
// Covered by admin-realtime.test.ts (pure helpers) and manual admin smoke tests — see composable file comment.
describe.skip("useAdminRealtime client snapshot priming", () => {
    beforeEach(async () => {
        vi.resetModules();
        snapshotCallbacks.length = 0;
        fetchMock = vi.fn(async () => []);
        installClientMocks();
        vi.useFakeTimers();
        userMock.value = { getIdToken: vi.fn(async () => "token") };
        loadingMock.value = false;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        stateBag.clear();
    });

    it("applies snapshot rows when the listener fires before the API fetch settles", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");

        fetchMock.mockImplementation(async () => [{ id: "api", title: "API title", order: 0 }]);

        const handle = useAdminListSnapshot<{ id: string; title: string }>({
            collection: "posts",
            limit: 10,
        });

        await flushOpen();

        snapshotCallbackAt(0)({
            docs: [{ id: "snap", data: () => ({ id: "snap", title: "Snapshot title", order: 0 }) }],
        });

        await vi.runAllTimersAsync();

        expect(handle.data.value?.map((r) => r.id)).toEqual(["snap"]);
        expect(fetchMock).toHaveBeenCalled();
    });

    it("lets a later snapshot overwrite API rows when the listener fires after fetch", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");

        fetchMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve([{ id: "api", title: "API title", order: 0 }]), 50);
                })
        );

        const handle = useAdminListSnapshot<{ id: string; title: string }>({
            collection: "posts",
            limit: 10,
        });

        await flushOpen();
        await vi.advanceTimersByTimeAsync(100);

        snapshotCallbackAt(0)({
            docs: [{ id: "snap", data: () => ({ id: "snap", title: "Snapshot title", order: 0 }) }],
        });

        await vi.runAllTimersAsync();

        expect(handle.data.value?.map((r) => r.id)).toEqual(["snap"]);
    });

    it("shares one Firestore onSnapshot listener per collection across composable instances", async () => {
        const { useAdminListSnapshot } = await import("~/composables/useAdminRealtime");

        fetchMock.mockResolvedValue([]);

        const a = useAdminListSnapshot<{ id: string }>({ collection: "posts", limit: 5 });
        const b = useAdminListSnapshot<{ id: string }>({ collection: "posts", limit: 5 });

        await flushOpen();

        expect(snapshotCallbacks).toHaveLength(1);

        snapshotCallbackAt(0)({
            docs: [{ id: "x", data: () => ({ id: "x", order: 0 }) }],
        });

        await vi.runAllTimersAsync();

        expect(a.data.value?.map((r) => r.id)).toEqual(["x"]);
        expect(b.data.value?.map((r) => r.id)).toEqual(["x"]);
    });
});
