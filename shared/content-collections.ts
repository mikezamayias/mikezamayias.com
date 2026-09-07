/**
 * Whitelist of content collections exposed via the CMS API at all (admin or
 * public). Adding a collection here registers it for both the public and
 * admin [collection] routes. Each collection must already have matching
 * `firestore.rules` entries.
 *
 * NOTE: this is a superset. The PUBLIC_READABLE allowlist below is the
 * tighter list that the anonymous read endpoints actually honour.
 */
export const ALLOWED_CONTENT_COLLECTIONS = [
    "profile",
    "social",
    "experience",
    "work",
    "writing",
    "roadmap",
    "skills",
    "education",
    "certifications",
    "contact",
] as const;

export type AllowedCollection = (typeof ALLOWED_CONTENT_COLLECTIONS)[number];

/**
 * Subset of {@link ALLOWED_CONTENT_COLLECTIONS} that anonymous callers are
 * allowed to read via `GET /api/content/<collection>` and
 * `GET /api/content/<collection>/<id>`. `profile/main` holds canonical PII
 * (email/phone) and is intentionally absent — admins read it via Firestore
 * rules + bearer-token-protected admin endpoints. Defense in depth (rules +
 * server allowlist).
 */
export const PUBLIC_READABLE = [
    "social",
    "experience",
    "skills",
    "education",
    "certifications",
    "contact",
    "work",
    "writing",
    "roadmap",
] as const;

export type PublicReadableCollection = (typeof PUBLIC_READABLE)[number];

export function isPublicReadable(name: string): name is PublicReadableCollection {
    return (PUBLIC_READABLE as readonly string[]).includes(name);
}

/**
 * Collections whose docs carry a `published: boolean` flag. Anonymous reads
 * must filter to `published === true`; admins see the full set.
 */
export const PUBLISHED_FILTERED = new Set<string>(["work", "writing"]);

/**
 * Collections whose docs carry a `hidden: boolean` flag. Anonymous reads
 * must filter to `hidden === false`; admins see the full set.
 */
export const TASK_HIDDEN_FILTERED = new Set<string>(["roadmap"]);

/**
 * Returns true if the given doc is visible to an anonymous caller in the
 * given collection. Admin callers should bypass this check.
 */
export function isPubliclyVisible(collection: string, doc: Record<string, unknown>): boolean {
    if (PUBLISHED_FILTERED.has(collection)) {
        if ((doc as { published?: boolean }).published !== true) return false;
    }
    if (TASK_HIDDEN_FILTERED.has(collection)) {
        if ((doc as { hidden?: boolean }).hidden !== false) return false;
    }
    return true;
}

/**
 * Pure helper for filtering a doc list to what an anonymous caller is
 * allowed to see. Admin callers (`isAdmin === true`) get the unfiltered
 * list back. Used by the public list endpoint and the unit tests.
 */
export function filterPublic<T extends Record<string, unknown>>(
    docs: T[],
    collection: string,
    isAdmin: boolean
): T[] {
    if (isAdmin) return docs;
    return docs.filter((doc) => isPubliclyVisible(collection, doc));
}
