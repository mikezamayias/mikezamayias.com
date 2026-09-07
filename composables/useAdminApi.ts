import type { Ref } from "vue";
import * as Sentry from "@sentry/nuxt";
import { COLLECTION_SCHEMAS, SINGLETON_SCHEMAS } from "#shared/schemas";
import { compareAdminRowsByOrderThenId } from "~/utils/adminRealtimeSort";
import { getAdminFirestore } from "~/utils/adminFirestore";

type AdminFetchOptions = NonNullable<Parameters<typeof $fetch>[1]>;

export interface AdminMessage {
    id: string;
    name: string;
    email: string;
    subject?: string;
    message: string;
    read?: boolean;
    createdAt?: number;
    userAgent?: string | null;
    source?: string;
}

async function waitForAuthState(loading: Ref<boolean>) {
    if (!loading.value) return;
    await new Promise<void>((resolve) => {
        let resolved = false;

        function finish() {
            if (resolved) return;
            resolved = true;
            stop();
            resolve();
        }

        const stop = watch(loading, (value) => {
            if (!value) {
                finish();
            }
        });
        if (!loading.value) finish();
    });
}

interface OptimisticListItem {
    id: string;
}

/**
 * Mark the optimistic mutation as visually pending. Returns a token the
 * caller can use to clear the pending state. The list / spinner / dim
 * styling is the caller's concern; this just gives a stable signaling
 * primitive.
 */
function markPending(pendingIds: Ref<Set<string>>, id: string): () => void {
    pendingIds.value.add(id);
    return () => pendingIds.value.delete(id);
}

export const useAdminApi = () => {
    const { user, loading, initAuth } = useAuth();

    const getIdToken = async () => {
        await initAuth();
        await waitForAuthState(loading);
        if (!user.value) {
            throw new Error("Admin authentication is required.");
        }
        return user.value.getIdToken();
    };

    const adminFetch = async <T>(path: string, options: AdminFetchOptions = {}) => {
        const token = await getIdToken();
        const headers = new Headers(options.headers as HeadersInit | undefined);
        headers.set("Authorization", `Bearer ${token}`);

        return $fetch<T>(path, {
            ...options,
            headers,
        });
    };

    const recordAudit = async (
        db: unknown,
        sdk: typeof import("firebase/firestore"),
        entry: { collection: string; docId: string; action: "upsert" | "delete" }
    ) => {
        const uid = user.value?.uid;
        if (!uid) return;
        try {
            await sdk.addDoc(sdk.collection(db as Parameters<typeof sdk.collection>[0], "audit"), {
                uid,
                ts: sdk.serverTimestamp(),
                collection: entry.collection,
                docId: entry.docId,
                action: entry.action,
            });
        } catch (err) {
            // Audit log is forensic, not transactional. Sentry captures the
            // failure so we still know it happened; caller sees the original
            // (successful) write response.
            Sentry.captureException(err, {
                tags: { component: "audit-log", action: entry.action },
                extra: { collection: entry.collection, docId: entry.docId, uid },
            });
        }
    };

    const listCollection = async <T extends Record<string, unknown>>(
        collection: string
    ): Promise<T[]> => {
        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        const snap = await sdk.getDocs(sdk.collection(db, collection));
        const rows = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as T),
        })) as Array<T & { id: string }>;
        rows.sort(compareAdminRowsByOrderThenId);
        return rows as T[];
    };

    const getCollectionDoc = async <T extends Record<string, unknown>>(
        collection: string,
        id: string
    ): Promise<T> => {
        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        const snap = await sdk.getDoc(sdk.doc(db, collection, id));
        if (!snap.exists()) {
            const err = new Error("Not found");
            (err as unknown as { statusCode?: number }).statusCode = 404;
            throw err;
        }
        return {
            id: snap.id,
            ...(snap.data() as T),
        };
    };

    const saveCollectionDoc = async <T extends Record<string, unknown>>(
        collection: string,
        id: string,
        body: T
    ): Promise<{ success: boolean; id: string }> => {
        const schema = COLLECTION_SCHEMAS[collection as keyof typeof COLLECTION_SCHEMAS];
        if (!schema) {
            throw new Error(`Unknown content collection: ${collection}`);
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const issues = parsed.error.issues
                .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
                .join("; ");
            const err = new Error(`Validation failed: ${issues}`);
            (err as unknown as { statusCode?: number; data?: unknown }).statusCode = 422;
            (err as unknown as { statusCode?: number; data?: unknown }).data =
                parsed.error.format();
            throw err;
        }

        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        await sdk.setDoc(
            sdk.doc(db, collection, id),
            {
                ...parsed.data,
                updatedAt: sdk.serverTimestamp(),
            },
            { merge: true }
        );

        await recordAudit(db, sdk, {
            collection,
            docId: id,
            action: "upsert",
        });

        return { success: true, id };
    };

    const deleteCollectionDoc = async (
        collection: string,
        id: string
    ): Promise<{ success: boolean; id: string }> => {
        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        await sdk.deleteDoc(sdk.doc(db, collection, id));

        await recordAudit(db, sdk, {
            collection,
            docId: id,
            action: "delete",
        });

        return { success: true, id };
    };

    /**
     * Optimistic delete with snapshot-based rollback.
     *
     * Spinner / dim state is signaled via `pendingIds.add(id)` before the
     * await and cleared in `finally`. The row stays in the list during
     * the await so the caller's UI can render a pending state — on
     * success the row is spliced out, on failure it stays and the caller
     * surfaces the error (typically via toast).
     *
     * `listAtRequest` is snapshotted before the await; if `items.value`
     * has been replaced by then (e.g. user navigated to a different
     * section), the splice is skipped so we never mutate the wrong list.
     */
    const optimisticDelete = async <T extends OptimisticListItem>(
        collection: string,
        id: string,
        items: Ref<T[]>,
        pendingIds: Ref<Set<string>>
    ): Promise<boolean> => {
        const listAtRequest = items.value;
        const snapshotRow = listAtRequest.find((x) => x.id === id);
        // Return false when the target row isn't in the list so callers
        // can skip a misleading success toast on a no-op call.
        if (!snapshotRow) return false;

        const clearPending = markPending(pendingIds, id);
        try {
            await deleteCollectionDoc(collection, id);
            if (items.value === listAtRequest) {
                // Object-identity lookup — we splice the exact row we
                // snapshotted, not a different row that happens to share
                // the same id (defensive: a concurrent reload could
                // replace the row instance even while keeping the id).
                const idx = listAtRequest.indexOf(snapshotRow);
                if (idx >= 0) listAtRequest.splice(idx, 1);
            }
            return true;
        } finally {
            clearPending();
        }
    };

    /**
     * Optimistic save (create or update) with snapshot-based rollback.
     *
     * Pre-mutates the local list immediately so the UI reflects the
     * intended state (insert for new docs, replace-in-place for existing).
     * Rolls back on server rejection. The caller is responsible for
     * deciding `isNew` (typically `id === "new"` or `!items.find(...)`).
     */
    const optimisticSave = async <T extends OptimisticListItem & Record<string, unknown>>(
        collection: string,
        id: string,
        body: T,
        items: Ref<T[]>,
        pendingIds: Ref<Set<string>>
    ): Promise<void> => {
        const listAtRequest = items.value;
        const existingIdx = listAtRequest.findIndex((x) => x.id === id);
        // Track insert-vs-update explicitly. If we derived this from
        // `snapshot` truthiness in the rollback path, a brand-new doc
        // whose id happens to collide with an existing row would be
        // classified as an "update" and silently restore the colliding
        // row instead of removing the failed insert — dropping the
        // user's edits without trace.
        const wasInsert = existingIdx < 0;
        const snapshot = wasInsert ? null : listAtRequest[existingIdx];

        if (wasInsert) {
            listAtRequest.unshift(body);
        } else {
            listAtRequest.splice(existingIdx, 1, body);
        }

        const clearPending = markPending(pendingIds, id);
        try {
            await saveCollectionDoc(collection, id, body);
        } catch (error) {
            if (items.value === listAtRequest) {
                const idx = listAtRequest.findIndex((x) => x.id === id);
                if (idx < 0) {
                    // Already removed by some other code path — leave it alone.
                } else if (wasInsert) {
                    listAtRequest.splice(idx, 1);
                } else if (snapshot) {
                    listAtRequest.splice(idx, 1, snapshot);
                }
            }
            throw error;
        } finally {
            clearPending();
        }
    };

    const getSingleton = async <T extends Record<string, unknown>>(name: string): Promise<T> => {
        if (!(name in SINGLETON_SCHEMAS)) {
            const err = new Error(`Unknown singleton: ${name}`);
            (err as unknown as { statusCode?: number }).statusCode = 404;
            throw err;
        }

        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        const snap = await sdk.getDoc(sdk.doc(db, "singletons", name));
        if (!snap.exists()) {
            const err = new Error("Not found");
            (err as unknown as { statusCode?: number }).statusCode = 404;
            throw err;
        }
        return {
            id: snap.id,
            ...(snap.data() as T),
        };
    };

    const saveSingleton = async <T extends Record<string, unknown>>(
        name: string,
        body: T
    ): Promise<{ success: boolean; id: string }> => {
        if (!(name in SINGLETON_SCHEMAS)) {
            const err = new Error(`Unknown singleton: ${name}`);
            (err as unknown as { statusCode?: number }).statusCode = 404;
            throw err;
        }
        const schema = SINGLETON_SCHEMAS[name as keyof typeof SINGLETON_SCHEMAS];
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const issues = parsed.error.issues
                .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
                .join("; ");
            const err = new Error(`Validation failed: ${issues}`);
            (err as unknown as { statusCode?: number; data?: unknown }).statusCode = 422;
            (err as unknown as { statusCode?: number; data?: unknown }).data =
                parsed.error.format();
            throw err;
        }

        const db = await getAdminFirestore();
        const sdk = await import("firebase/firestore");
        await sdk.setDoc(
            sdk.doc(db, "singletons", name),
            {
                ...parsed.data,
                updatedAt: sdk.serverTimestamp(),
            },
            { merge: true }
        );

        await recordAudit(db, sdk, {
            collection: "singletons",
            docId: name,
            action: "upsert",
        });

        return { success: true, id: name };
    };

    type AdminCacheRow = Record<string, unknown> & { id: string };
    const listCache = useState<Record<string, AdminCacheRow[]>>("admin-list-cache", () => ({}));

    // Background-warmer for the admin sidebar's hover-prefetch. Fires
    // the direct list read on the collection and writes the rows into the
    // shared `admin-list-cache` useState. AdminCollectionList reads from
    // the same key via `getter/setter` on `items`, so by the time the user
    // clicks the nav link the list is already populated.
    const prefetchListCollection = async (collection: string): Promise<void> => {
        if (listCache.value[collection]?.length) return;
        try {
            const rows = await listCollection<AdminCacheRow>(collection);
            listCache.value = { ...listCache.value, [collection]: rows };
        } catch {
            // Hover-prefetch is a perf optimization — silent failure
            // keeps the click path identical to the no-prefetch case.
        }
    };

    return {
        adminFetch,
        listCollection,
        prefetchListCollection,
        getCollectionDoc,
        saveCollectionDoc,
        deleteCollectionDoc,
        optimisticDelete,
        optimisticSave,
        getSingleton,
        saveSingleton,
        listMessages: (limit = 50) =>
            adminFetch<AdminMessage[]>("/api/admin/messages", {
                query: { limit },
            }),
        updateMessage: (id: string, read: boolean) =>
            adminFetch<{ success: boolean; id: string }>(
                `/api/admin/messages/${encodeURIComponent(id)}`,
                {
                    method: "PATCH",
                    body: { read },
                }
            ),
    };
};
