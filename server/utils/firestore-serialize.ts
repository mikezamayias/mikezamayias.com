function isTimestampLike(value: unknown): value is { toMillis: () => number } {
    return (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof (value as { toMillis?: unknown }).toMillis === "function"
    );
}

export function serializeFirestoreData<T>(value: T): T {
    if (isTimestampLike(value)) {
        return value.toMillis() as T;
    }

    if (Array.isArray(value)) {
        return value.map((item) => serializeFirestoreData(item)) as T;
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, serializeFirestoreData(item)])
        ) as T;
    }

    return value;
}
