// Work taken off the public site. The Firestore document can outlive this
// list: production builds snapshot Firestore, and removing a seed does not
// delete the live doc. Public reads and /work/<slug> treat these as gone.
export const RETIRED_WORK_SLUGS = ["mighty"] as const;

export function isRetiredWorkSlug(slug: string | undefined | null): boolean {
    return typeof slug === "string" && (RETIRED_WORK_SLUGS as readonly string[]).includes(slug);
}
