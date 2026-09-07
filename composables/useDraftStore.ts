import Dexie, { type Table } from "dexie";

/**
 * IndexedDB-backed draft store for the admin document editor.
 *
 * Each draft is keyed by `${section}:${docId}` (e.g. `"writing:my-slug"`,
 * `"work:new"`) — the same shape the bottom-sheet composable uses
 * for `section`. Drafts auto-clear on successful save; restore is gated
 * by a banner so a stale draft from a different editor session is never
 * silently applied.
 *
 * Stored payload:
 *   {
 *     key: "writing:my-slug",
 *     data: { …flattened draft fields… },
 *     savedAt: 1717248000000,           // ms epoch — when WE saved
 *     baseUpdatedAt: 1717247000000      // ms epoch — server doc's
 *                                       // `updatedAt` at the time the
 *                                       // draft was opened. null for
 *                                       // brand-new docs.
 *   }
 *
 * Storage footprint: typical admin draft is < 5 KB (locale.en.body is
 * the heaviest field). A 30-day TTL prune runs lazily on `loadDraft`,
 * triggered only when more than 50 drafts accumulate.
 */

export interface AdminDraftRecord {
    key: string;
    data: Record<string, unknown>;
    savedAt: number;
    baseUpdatedAt: number | null;
}

const PRUNE_THRESHOLD_COUNT = 50;
const PRUNE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

class AdminDraftDB extends Dexie {
    drafts!: Table<AdminDraftRecord, string>;
    constructor() {
        super("admin-drafts");
        this.version(1).stores({
            // Primary key on `key`; secondary index on `savedAt` for the
            // age-prune query.
            drafts: "&key,savedAt",
        });
    }
}

let _db: AdminDraftDB | null = null;
function getDb(): AdminDraftDB {
    if (_db) return _db;
    if (!import.meta.client) {
        // Dexie throws "No indexedDB API" on the server. Callers should
        // gate on `import.meta.client` before touching the store, but
        // surfacing a clear error here makes a missed gate easier to
        // diagnose than letting Dexie complain.
        throw new Error("useDraftStore is client-only — guard with import.meta.client");
    }
    _db = new AdminDraftDB();
    return _db;
}

async function maybePruneStaleDrafts(db: AdminDraftDB): Promise<void> {
    const count = await db.drafts.count();
    if (count <= PRUNE_THRESHOLD_COUNT) return;
    const cutoff = Date.now() - PRUNE_MAX_AGE_MS;
    await db.drafts.where("savedAt").below(cutoff).delete();
}

/**
 * Per-tab UUID namespace for brand-new docs.
 *
 * `writing:new`, `work:new`, etc. would otherwise be a *shared* key
 * across every editor session. An abandoned new-doc draft would then
 * surface as a "Restore unsaved draft" prompt for the next person who
 * opens the New form on the same device (or for the same user in a new
 * tab) — leaking PII from the body fields and confusing the user about
 * which doc they were drafting. Scoping the new-doc key with a
 * sessionStorage-backed UUID isolates drafts per tab while still letting
 * a refresh-in-place restore the draft for the same session.
 *
 * Stable across reloads in the SAME tab (`sessionStorage` survives
 * reload), discarded on tab close. For real docs (id !== "new") the key
 * is unchanged — those are already uniquely identified by their id.
 */
const NEW_DOC_KEY_STORAGE = "admin-draft-new-doc-id";

function getNewDocNamespace(): string {
    if (!import.meta.client) return "new";
    try {
        const existing = sessionStorage.getItem(NEW_DOC_KEY_STORAGE);
        if (existing) return existing;
        const fresh = `new:${crypto.randomUUID()}`;
        sessionStorage.setItem(NEW_DOC_KEY_STORAGE, fresh);
        return fresh;
    } catch {
        // sessionStorage may throw under Safari private mode; fall back to
        // an ephemeral random suffix so we at least don't collide with
        // another tab's "new" draft within the same load.
        return `new:${Math.random().toString(36).slice(2, 11)}`;
    }
}

export function makeDraftKey(section: string, docId: string): string {
    if (docId === "new") {
        return `${section}:${getNewDocNamespace()}`;
    }
    return `${section}:${docId}`;
}

/**
 * Clear the per-tab "new doc" namespace so the next "new" draft gets a
 * fresh UUID. Call after a successful save when the new doc transitions
 * to a real id, so the next new-doc session in this tab doesn't shadow
 * the previous one's leftover key.
 */
export function resetNewDocNamespace(): void {
    if (!import.meta.client) return;
    try {
        sessionStorage.removeItem(NEW_DOC_KEY_STORAGE);
    } catch {
        // Same Safari-private-mode caveat. Best-effort.
    }
}

export function useDraftStore() {
    return {
        async saveDraft(
            key: string,
            data: Record<string, unknown>,
            baseUpdatedAt: number | null
        ): Promise<void> {
            const db = getDb();
            await db.drafts.put({ key, data, savedAt: Date.now(), baseUpdatedAt });
        },
        async loadDraft(key: string): Promise<AdminDraftRecord | undefined> {
            const db = getDb();
            // Fire-and-forget prune so we don't block the editor's
            // initialization on a maintenance sweep. The threshold gate
            // inside `maybePruneStaleDrafts` already skips the work when
            // the DB is small, but even a no-op DB.count() round-trip is
            // worth keeping off the critical path.
            void maybePruneStaleDrafts(db);
            return db.drafts.get(key);
        },
        async clearDraft(key: string): Promise<void> {
            const db = getDb();
            await db.drafts.delete(key);
        },
    };
}
