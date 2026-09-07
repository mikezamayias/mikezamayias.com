import type { Locale } from "~/firebase/types";

export function toPublicContentLocale(locale: Locale | string | null | undefined): Locale {
    // Public content APIs currently accept locale for legacy callers but
    // hardcode `en`, so realtime queries must use the same canonical value.
    void locale;
    return "en";
}

export function resolveRealtimeDocSnapshotValue<T>(
    current: T | null,
    next: T | null,
    expectedKey?: string
): T | null {
    if (next === null && current != null) {
        if (!expectedKey) return current;
        const currentRecord = current as Record<string, unknown>;
        const currentId = typeof currentRecord.id === "string" ? currentRecord.id : null;
        const currentSlug = typeof currentRecord.slug === "string" ? currentRecord.slug : null;
        if (currentId === expectedKey || currentSlug === expectedKey) return current;
    }
    return next;
}
