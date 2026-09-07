/**
 * Pure sort helpers for admin list rows. Shared by the realtime composable,
 * AdminCollectionList, and server-side ordering so snapshot + SSR stay aligned.
 */

function hasFiniteOrder(row: Record<string, unknown>): boolean {
    return typeof row.order === "number" && Number.isFinite(row.order);
}

function compareOrderFields(a: Record<string, unknown>, b: Record<string, unknown>): number | null {
    const aHas = hasFiniteOrder(a);
    const bHas = hasFiniteOrder(b);
    if (aHas && bHas) {
        const ao = a.order as number;
        const bo = b.order as number;
        return ao === bo ? null : ao - bo;
    }
    if (aHas) return -1;
    if (bHas) return 1;
    return null;
}

export function compareAdminRowsByOrderThenId(
    a: Record<string, unknown> & { id: string },
    b: Record<string, unknown> & { id: string }
): number {
    const byOrder = compareOrderFields(a, b);
    if (byOrder !== null) return byOrder;
    return a.id.localeCompare(b.id);
}
