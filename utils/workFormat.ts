/**
 * Display helpers for the Work entity.
 *
 * Both `start` and `end` live in Firestore as a raw `YYYY-MM` or
 * `YYYY` string (HTML month-picker output, or a year-only shorthand).
 * The public surface formats them into a single readable range like
 * `Sept 2024 -> Mar 2025` — these helpers run at the boundary so the
 * data shape stays simple and the formatting concern stays in one
 * place.
 *
 * `formatWorkStack` mirrors the same idea for `stack` — the array
 * lives in Firestore as lowercase tags (`flutter`, `openai`), the public
 * site shows their proper names joined with `·`.
 */

import { isWorkStatus } from "#shared/workStatus";

// Proper names for the stack tags in Firestore. A tag that isn't listed
// is shown as written, so a new one never disappears.
const STACK_NAMES: Record<string, string> = {
    dart: "Dart",
    firebase: "Firebase",
    firestore: "Firestore",
    flutter: "Flutter",
    healthkit: "HealthKit",
    kotlin: "Kotlin",
    nuxt: "Nuxt",
    "nuxt 4": "Nuxt 4",
    openai: "OpenAI",
    postgres: "PostgreSQL",
    postgresql: "PostgreSQL",
    supabase: "Supabase",
    swift: "Swift",
    swiftui: "SwiftUI",
    ts: "TypeScript",
    typescript: "TypeScript",
    vue: "Vue",
};

export function formatStackTag(tag: string): string {
    const trimmed = tag.trim();
    return STACK_NAMES[trimmed.toLowerCase()] ?? trimmed;
}

const SHORT_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
];

export function formatMonthYear(value: string | undefined | null): string {
    if (!value || typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (match) {
        const [, year, month] = match;
        const monthIdx = Number(month) - 1;
        const monthName = SHORT_MONTHS[monthIdx] ?? "";
        return monthName ? `${monthName} ${year}` : year!;
    }
    if (/^\d{4}$/.test(trimmed)) return trimmed;
    return trimmed;
}

export interface WorkRangeInput {
    start?: unknown;
    end?: unknown;
    yr?: unknown;
}

export function formatWorkRange(input: WorkRangeInput): string {
    const start = typeof input.start === "string" ? input.start : "";
    const end = typeof input.end === "string" ? input.end : "";

    if (!start && !end && typeof input.yr === "string") {
        return input.yr;
    }

    const startStr = formatMonthYear(start);
    const endStr = formatMonthYear(end);

    if (startStr && endStr) return `${startStr} → ${endStr}`;
    if (startStr && !endStr) return `${startStr} → Present`;
    if (!startStr && endStr) return endStr;
    return "";
}

export function formatWorkStack(input: unknown): string {
    if (Array.isArray(input)) {
        return input
            .map((item) => formatStackTag(String(item)))
            .filter(Boolean)
            .join(" · ");
    }
    if (typeof input === "string") return input;
    return "";
}

/**
 * The facts line for a work entry, as readers see it:
 * "Flutter · OpenAI · iOS · open for testing". Stack, then platform, then
 * status; any of them may be missing. `t` resolves the status label from
 * `work.status.*` in the locale file.
 */
export function formatWorkFacts(
    entry: { stack?: unknown; platform?: unknown; status?: unknown },
    t: (key: string) => string
): string {
    return [
        formatWorkStack(entry.stack),
        typeof entry.platform === "string" ? entry.platform.trim() : "",
        isWorkStatus(entry.status) ? t(`work.status.${entry.status}`) : "",
    ]
        .filter(Boolean)
        .join(" · ");
}
