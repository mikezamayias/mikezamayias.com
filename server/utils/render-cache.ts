// server/utils/render-cache.ts
//
// Plan B+ Task 5 — In-memory render cache. Keyed by
// `{slug}:{locale}:{updatedAt}` so cache invalidation is free when admin
// re-saves the post (updatedAt advances). Bounded to MAX_ENTRIES to
// avoid unbounded growth on single instance (`maxInstances: 1`).
//
// TTL is intentionally short (5min). Key-based invalidation already
// covers the happy path (admin save bumps updatedAt → new key), but if
// `renderMarkdown` ever emits bad HTML for a stable updatedAt, the TTL
// bounds how long that bad output can pin. 60min was too generous; 5min
// keeps the hit-rate (admins rarely re-save the same post twice within
// 5min, readers re-fetch the same URL within 5min only via heavy social
// traffic) and shrinks the poison window 12×.

interface Entry {
    html: string;
    insertedAt: number;
}

const cache = new Map<string, Entry>();
const MAX_ENTRIES = 100;
const TTL_MS = 5 * 60 * 1000; // 5min since insert (fixed TTL, not idle — getCached does not refresh insertedAt)

function evict(now: number) {
    if (cache.size < MAX_ENTRIES / 2) return;
    for (const [key, entry] of cache) {
        if (now - entry.insertedAt > TTL_MS) cache.delete(key);
        if (cache.size < MAX_ENTRIES / 2) return;
    }
    if (cache.size >= MAX_ENTRIES) {
        // Single-pass min scan — O(n) vs the previous O(n log n) Array.from+sort.
        let oldestKey: string | null = null;
        let oldestTs = Number.POSITIVE_INFINITY;
        for (const [key, entry] of cache) {
            if (entry.insertedAt < oldestTs) {
                oldestKey = key;
                oldestTs = entry.insertedAt;
            }
        }
        if (oldestKey) cache.delete(oldestKey);
    }
}

export function getCached(slug: string, locale: string, updatedAt: number): string | null {
    const key = `${slug}:${locale}:${updatedAt}`;
    const entry = cache.get(key);
    if (!entry) return null;
    // Read-side TTL check. Without this, an entry inserted while the cache
    // is sparse never expires (eviction only runs once MAX_ENTRIES/2 is
    // hit), so a single bad render would stick forever on a low-traffic
    // post. The whole point of the short TTL is to bound the poison
    // window — that bound is real only if reads honor it.
    if (Date.now() - entry.insertedAt > TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.html;
}

export function setCached(slug: string, locale: string, updatedAt: number, html: string): void {
    const now = Date.now();
    evict(now);
    cache.set(`${slug}:${locale}:${updatedAt}`, { html, insertedAt: now });
}

// @internal — invoked from admin re-render endpoint when it ships.
// Removes ALL entries whose key starts with `${slug}:` (every locale /
// updatedAt variant for the given slug). No current consumer; the public
// render endpoint relies on key-based invalidation + TTL. Kept exported
// so a future force-rerender admin path can flush a single post on
// demand without restarting the function.
export function invalidateCacheBySlug(slug: string): void {
    const prefix = `${slug}:`;
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
}

// Test-only export — clear cache between tests.
export function _resetCacheForTests(): void {
    cache.clear();
}
