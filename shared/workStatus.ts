// Where a work entry stands. Optional on the entry; unset shows nothing.
// Kept apart from shared/schemas.ts so the public pages can use it
// without pulling zod into their bundle.
export const WORK_STATUSES = ["building", "testing", "live"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export function isWorkStatus(value: unknown): value is WorkStatus {
    return typeof value === "string" && (WORK_STATUSES as readonly string[]).includes(value);
}
