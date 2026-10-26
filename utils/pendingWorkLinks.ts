/**
 * Store listings that are not public yet.
 *
 * Pages render `url` as a link when it is set, and as plain text when it
 * is empty. Fill `url` in only for an open-testing or production listing.
 */

export interface PendingWorkLink {
    slug: string;
    label: string;
    url: string;
}

export const PENDING_WORK_LINKS: readonly PendingWorkLink[] = [
    {
        slug: "healpen",
        label: "Coming soon to Google Play",
        // TODO(healpen-play): set `url` to the public Google Play listing
        // once open testing or production is live, and change `label` if
        // "Coming soon" is no longer true. Do not paste an internal-testing
        // opt-in URL. Checked 26 Oct 2026, this listing returns 404:
        // https://play.google.com/store/apps/details?id=com.mikezamayias.healpen
        url: "",
    },
];

export function pendingWorkLinksFor(slug: string | undefined | null): PendingWorkLink[] {
    if (!slug) return [];
    return PENDING_WORK_LINKS.filter((link) => link.slug === slug);
}
