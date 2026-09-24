// "19 Feb 2026" for a `YYYY-MM-DD` date. UTC, so a prerendered page and
// the browser agree whatever the reader's time zone.
const longDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

export function formatPostDate(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? date : longDate.format(d);
}
