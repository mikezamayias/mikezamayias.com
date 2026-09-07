// composables/useAdminRealtime.ts
//
// Admin-side realtime snapshot helpers. Public-side equivalents live in
// `useRealtimeContent.ts` but apply published/hidden filters and cap
// reads at 100 rows — the wrong shape for the admin shell, which must
// see drafts, hidden rows, and arbitrary list length so an operator can
// edit every document the site stores.
//
// Lifecycle mirrors the public composable family:
//   1. Initial fetch via the admin server endpoint
//      (`/api/admin/content/{collection}`) — same call AdminCollectionList
//      used pre-realtime, same admin token, same server-side sort. Search
//      engines never reach /admin (it's middleware-gated), but the server
//      fetch still gives us a deterministic first paint and avoids the
//      "snapshot fires before auth is ready" race.
//   2. Client takeover via `onSnapshot` once the user is authenticated.
//      Wrapped in `whenIdle()` so the firestore SDK chunk download
//      doesn't compete with the editor's first paint.
//   3. Cleanup in `onUnmounted` — mandatory, listener leaks across SPA
//      navigations otherwise.
//
// The admin Firestore instance is initialised by
// `plugins/02.firestore.client.ts` (with persistentLocalCache + single-tab
// manager); we just call `getFirestore(app)` here. Snapshots respect the
// rules in `firebase/firestore.rules` — admin reads / writes are gated by
// `isAdmin()` (auth.uid in /settings/main.allowedAdminIds), so the
// snapshot only fires after `useAuth.initAuth()` resolves with a verified
// admin user.

import type { Ref } from "vue";
import { getAdminFirestore } from "~/utils/adminFirestore";

interface AdminSnapshotHandle<T> {
    data: Ref<T | null>;
    pending: Ref<boolean>;
    error: Ref<Error | null>;
    refresh: () => Promise<void>;
}

// Defer realtime subscriptions until the next idle window — matches the
// public composable pattern in `useRealtimeContent.ts`. Returns a cancel
// function so callers can drop the queued callback in `onUnmounted` (or
// before a synchronous reopen).
function whenIdle(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
        .requestIdleCallback;
    if (typeof ric === "function") {
        const handle = ric(() => cb(), { timeout: 2000 });
        return () => {
            const cic = (window as unknown as { cancelIdleCallback?: typeof cancelIdleCallback })
                .cancelIdleCallback;
            if (typeof cic === "function") cic(handle);
        };
    }
    const handle = setTimeout(cb, 500);
    return () => clearTimeout(handle);
}

interface OrderClause {
    field: string;
    direction?: "asc" | "desc";
}

interface AdminListSnapshotOpts<T> {
    /** Firestore collection path, e.g. "skills", "writing", "messages". */
    collection: string;
    /**
     * Optional `orderBy` clauses applied to the snapshot query. Server
     * endpoint already returns rows pre-sorted, but the snapshot SDK
     * also needs them so the in-memory ordering stays stable on updates.
     * Default: no orderBy (raw insertion order from Firestore).
     */
    orderBy?: OrderClause[];
    /** Maximum docs to subscribe to. Admin lists have no hard cap. */
    limit?: number;
    /** Optional client-side comparator used after each snapshot. */
    sort?: (a: T & { id: string }, b: T & { id: string }) => number;
    /**
     * Optional pre-warmed rows to paint immediately while the initial
     * fetch + snapshot wire up. Used by AdminCollectionList to seed
     * from the shared `admin-list-cache` useState (populated by the
     * dashboard's hover-prefetch + by prior visits to this section).
     * Skipping the seed leaves `data` null until the first fetch
     * resolves, which forces the skeleton state.
     */
    initial?: () => Array<T & { id: string }> | undefined;
    /**
     * Custom initial-fetch function for collections not in
     * ALLOWED_CONTENT_COLLECTIONS (e.g. "messages" which has its own
     * dedicated endpoint). When provided, replaces the default
     * `api.listCollection()` call during the initial paint fetch.
     */
    initialFetchFn?: () => Promise<Array<T & { id: string }>>;
}

// Wait for `useAuth.initAuth()` to resolve and surface a signed-in
// admin user. Admin Firestore queries require auth + the allowlist
// check; opening the listener before the user object is ready would
// fire PERMISSION_DENIED.
async function waitForAdminAuth(): Promise<void> {
    const { initAuth, loading, user } = useAuth();
    await initAuth();
    if (!loading.value && user.value) return;
    await new Promise<void>((resolve) => {
        const stop = watch(
            [loading, user],
            ([loadingValue, userValue]) => {
                if (!loadingValue && userValue) {
                    stop();
                    resolve();
                }
            },
            { immediate: true }
        );
    });
}

/**
 * Open a realtime snapshot on a single admin collection.
 *
 * Returns the same `{ data, pending, error, refresh }` shape as the public
 * composables so call sites stay swappable.
 */
export function useAdminListSnapshot<T extends Record<string, unknown>>(
    opts: AdminListSnapshotOpts<T>
): AdminSnapshotHandle<Array<T & { id: string }>> {
    type Row = T & { id: string };

    const seeded = opts.initial?.();
    // Seed `data` from the pre-warmed cache if the caller provided one
    // so the list paints instantly on mount. The initial fetch + snapshot
    // both still run and will replace the seed once they resolve.
    const data = ref<Row[] | null>(
        seeded && seeded.length
            ? opts.sort
                ? seeded.slice().sort(opts.sort)
                : seeded.slice()
            : null
    ) as Ref<Row[] | null>;
    // pending=true only when we have nothing on screen yet — a seeded
    // mount paints rows immediately, so the parent uses the "refreshing"
    // chip instead of the full skeleton.
    const pending = ref<boolean>(data.value == null);
    const error = ref<Error | null>(null);
    const api = useAdminApi();

    // Once the realtime snapshot lands its first payload, the in-flight
    // initial fetch is no longer authoritative — its server-side rows
    // could be a few hundred ms stale relative to a delete that fired
    // mid-await. Flip this flag inside the snapshot listener so the
    // fetch's `data.value = rows` write skips over the fresher state.
    let snapshotPrimed = false;

    const initialFetch = async (): Promise<void> => {
        try {
            const next = opts.initialFetchFn
                ? await opts.initialFetchFn()
                : await api.listCollection<T>(opts.collection);
            const rows = (next as Row[]).slice();
            if (opts.sort) rows.sort(opts.sort);
            if (!snapshotPrimed) {
                data.value = rows;
                error.value = null;
            }
        } catch (err) {
            if (data.value == null) error.value = err as Error;
        }
    };

    const refresh = async () => {
        pending.value = true;
        try {
            await initialFetch();
        } finally {
            pending.value = false;
        }
    };

    if (!import.meta.env.SSR) {
        let unsub: (() => void) | null = null;
        let active = false;
        let cancelIdle: (() => void) | null = null;

        const open = async () => {
            try {
                await waitForAdminAuth();
                const firestore = await getAdminFirestore();
                const sdk = await import("firebase/firestore");
                let q: import("firebase/firestore").Query = sdk.collection(
                    firestore,
                    opts.collection
                );
                if (opts.orderBy) {
                    for (const clause of opts.orderBy) {
                        q = sdk.query(q, sdk.orderBy(clause.field, clause.direction ?? "asc"));
                    }
                }
                if (opts.limit !== undefined) {
                    q = sdk.query(q, sdk.limit(opts.limit));
                }
                unsub?.();
                if (!active) return;
                unsub = sdk.onSnapshot(
                    q,
                    (snap) => {
                        const rows = snap.docs.map(
                            (d) => ({ id: d.id, ...(d.data() as T) }) as Row
                        );
                        if (opts.sort) rows.sort(opts.sort);
                        data.value = rows;
                        error.value = null;
                        // Mark realtime as primary so a still-in-flight
                        // `initialFetch` doesn't overwrite a fresher
                        // snapshot with stale server-side rows on
                        // resolution.
                        snapshotPrimed = true;
                    },
                    (err) => {
                        // Silent: keep the initial fetch / prior snapshot data on
                        // screen. Surfacing every snapshot blip would whiplash the
                        // admin UI for transient network issues.
                        if (import.meta.dev) {
                            console.warn(
                                `[admin-realtime] snapshot failed for ${opts.collection}`,
                                err
                            );
                        }
                    }
                );
            } catch (err) {
                if (import.meta.dev) {
                    console.warn(`[admin-realtime] open failed for ${opts.collection}`, err);
                }
            }
        };

        onMounted(() => {
            active = true;
            // Fetch the first page eagerly so the list paints fast — the
            // snapshot promotion below replaces it once Firestore wires up.
            void refresh();
            cancelIdle = whenIdle(() => {
                cancelIdle = null;
                if (active) void open();
            });
        });

        onUnmounted(() => {
            active = false;
            cancelIdle?.();
            cancelIdle = null;
            unsub?.();
            unsub = null;
        });
    } else {
        // SSR path. Admin routes are CSR-only (middleware: admin-auth
        // guards them client-side), so this branch isn't actually
        // exercised — but we keep pending=true so a hypothetical SSR
        // render shows the skeleton instead of an empty state.
    }

    return { data, pending, error, refresh };
}

interface AdminSingletonSnapshotOpts {
    /** Singleton name under `/singletons/{name}` — e.g. "hero", "about". */
    name: string;
}

/**
 * Open a realtime snapshot on `/singletons/{name}`. Used by the singleton
 * admin pages (hero, about, roadmap-settings) so a save from another
 * client also live-updates the open editor.
 */
export function useAdminSingletonSnapshot<T extends Record<string, unknown>>(
    opts: AdminSingletonSnapshotOpts
): AdminSnapshotHandle<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const pending = ref<boolean>(true);
    const error = ref<Error | null>(null);
    const api = useAdminApi();
    let snapshotPrimed = false;

    const initialFetch = async (): Promise<void> => {
        try {
            // Cast through `T | null`: `api.getSingleton<T>` returns Nitro's
            // `TypedInternalResponse<..., T, "get">` wrapper, not `T` directly,
            // so the assignment trips TS2322 even though the runtime value
            // already IS the parsed payload. Same pattern in the collection-doc
            // composable below.
            const doc = (await api.getSingleton<T>(opts.name)) as unknown as T | null;
            if (!snapshotPrimed) {
                data.value = doc;
                error.value = null;
            }
        } catch (err) {
            if (data.value == null) error.value = err as Error;
        }
    };

    const refresh = async () => {
        pending.value = true;
        try {
            await initialFetch();
        } finally {
            pending.value = false;
        }
    };

    if (!import.meta.env.SSR) {
        let unsub: (() => void) | null = null;
        let active = false;
        let cancelIdle: (() => void) | null = null;

        const open = async () => {
            try {
                await waitForAdminAuth();
                const firestore = await getAdminFirestore();
                const sdk = await import("firebase/firestore");
                const ref = sdk.doc(firestore, "singletons", opts.name);
                unsub?.();
                if (!active) return;
                unsub = sdk.onSnapshot(
                    ref,
                    (snap) => {
                        if (!snap.exists()) {
                            data.value = null;
                            error.value = null;
                            snapshotPrimed = true;
                            return;
                        }
                        data.value = snap.data() as unknown as T;
                        error.value = null;
                        snapshotPrimed = true;
                    },
                    (err) => {
                        if (import.meta.dev) {
                            console.warn(
                                `[admin-realtime] singleton snapshot failed for ${opts.name}`,
                                err
                            );
                        }
                    }
                );
            } catch (err) {
                if (import.meta.dev) {
                    console.warn(`[admin-realtime] singleton open failed for ${opts.name}`, err);
                }
            }
        };

        onMounted(() => {
            active = true;
            void refresh();
            cancelIdle = whenIdle(() => {
                cancelIdle = null;
                if (active) void open();
            });
        });

        onUnmounted(() => {
            active = false;
            cancelIdle?.();
            cancelIdle = null;
            unsub?.();
            unsub = null;
        });
    }

    return { data, pending, error, refresh };
}

interface AdminCollectionDocSnapshotOpts {
    /** Collection path, e.g. "contact", "profile". */
    collection: string;
    /** Document id inside the collection, e.g. "main". */
    docId: string;
}

/**
 * Open a realtime snapshot on a specific document inside a collection.
 * Used by the singleton-style admin pages that are backed by a
 * collectionDoc rather than `/singletons/*` (contact/main, profile/main).
 */
export function useAdminCollectionDocSnapshot<T extends Record<string, unknown>>(
    opts: AdminCollectionDocSnapshotOpts
): AdminSnapshotHandle<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const pending = ref<boolean>(true);
    const error = ref<Error | null>(null);
    const api = useAdminApi();
    let snapshotPrimed = false;

    const initialFetch = async (): Promise<void> => {
        try {
            // See comment on the singleton variant above re: Nitro typed-fetch cast.
            const doc = (await api.getCollectionDoc<T>(
                opts.collection,
                opts.docId
            )) as unknown as T | null;
            if (!snapshotPrimed) {
                data.value = doc;
                error.value = null;
            }
        } catch (err) {
            if (data.value == null) error.value = err as Error;
        }
    };

    const refresh = async () => {
        pending.value = true;
        try {
            await initialFetch();
        } finally {
            pending.value = false;
        }
    };

    if (!import.meta.env.SSR) {
        let unsub: (() => void) | null = null;
        let active = false;
        let cancelIdle: (() => void) | null = null;

        const open = async () => {
            try {
                await waitForAdminAuth();
                const firestore = await getAdminFirestore();
                const sdk = await import("firebase/firestore");
                const ref = sdk.doc(firestore, opts.collection, opts.docId);
                unsub?.();
                if (!active) return;
                unsub = sdk.onSnapshot(
                    ref,
                    (snap) => {
                        if (!snap.exists()) {
                            data.value = null;
                            error.value = null;
                            snapshotPrimed = true;
                            return;
                        }
                        data.value = snap.data() as unknown as T;
                        error.value = null;
                        snapshotPrimed = true;
                    },
                    (err) => {
                        if (import.meta.dev) {
                            console.warn(
                                `[admin-realtime] doc snapshot failed for ${opts.collection}/${opts.docId}`,
                                err
                            );
                        }
                    }
                );
            } catch (err) {
                if (import.meta.dev) {
                    console.warn(
                        `[admin-realtime] doc open failed for ${opts.collection}/${opts.docId}`,
                        err
                    );
                }
            }
        };

        onMounted(() => {
            active = true;
            void refresh();
            cancelIdle = whenIdle(() => {
                cancelIdle = null;
                if (active) void open();
            });
        });

        onUnmounted(() => {
            active = false;
            cancelIdle?.();
            cancelIdle = null;
            unsub?.();
            unsub = null;
        });
    }

    return { data, pending, error, refresh };
}

export { compareAdminRowsByOrderThenId } from "~/utils/adminRealtimeSort";
