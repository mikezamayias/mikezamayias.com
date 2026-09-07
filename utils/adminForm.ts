import type { AdminField } from "./adminContent";
import { getByPath, setByPath } from "./adminContent";

export type AdminDraft = Record<string, unknown>;

export function cloneAdminDraft(source: Record<string, unknown> | null | undefined): AdminDraft {
    return JSON.parse(JSON.stringify(source ?? {})) as AdminDraft;
}

export function adminFieldDisplayValue(doc: AdminDraft, field: AdminField): string | number {
    const value = getByPath(doc, field.path);
    if (field.type === "csv") {
        return Array.isArray(value) ? value.join(", ") : "";
    }
    if (field.type === "json") {
        if (value === undefined || value === null) return "";
        return JSON.stringify(value, null, 2);
    }
    if (typeof value === "number") return value;
    if (typeof value === "string") return value;
    return "";
}

export function adminFieldBooleanValue(doc: AdminDraft, field: AdminField): boolean {
    return getByPath(doc, field.path) === true;
}

export function applyAdminFieldValue(doc: AdminDraft, field: AdminField, raw: unknown) {
    if (field.type === "boolean") {
        setByPath(doc, field.path, raw === true);
        return;
    }

    const text = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
    const trimmed = text.trim();

    if (field.emptyAsUndefined && !trimmed) {
        setByPath(doc, field.path, undefined);
        return;
    }

    if (field.type === "number") {
        if (!trimmed) {
            setByPath(doc, field.path, field.emptyAsUndefined ? undefined : 0);
            return;
        }
        const parsed = Number(text);
        setByPath(doc, field.path, Number.isFinite(parsed) ? parsed : 0);
        return;
    }

    if (field.type === "csv") {
        setByPath(
            doc,
            field.path,
            text
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
        );
        return;
    }

    if (field.type === "json") {
        setByPath(doc, field.path, trimmed ? JSON.parse(text) : undefined);
        return;
    }

    setByPath(doc, field.path, text);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pruneValue(value: unknown, isRoot = false): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => pruneValue(item)).filter((item) => item !== undefined);
    }
    if (!isPlainObject(value)) {
        return value;
    }

    const entries = Object.entries(value)
        .map(([key, child]) => [key, pruneValue(child)] as const)
        .filter(([, child]) => child !== undefined);

    if (!entries.length && !isRoot) return undefined;
    return Object.fromEntries(entries);
}

export function pruneAdminDraft(doc: AdminDraft): AdminDraft {
    return pruneValue(doc, true) as AdminDraft;
}

export function adminErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === "object" && "data" in error) {
        const data = (error as { data?: { message?: string } }).data;
        if (data?.message) return data.message;
    }
    return "Something went wrong.";
}
