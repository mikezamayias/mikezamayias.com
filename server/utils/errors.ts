/**
 * Check if an error is an H3/Nitro error (has statusCode property)
 */
export function isH3Error(error: unknown): error is { statusCode: number; message?: string } {
    return error !== null && typeof error === "object" && "statusCode" in error;
}
