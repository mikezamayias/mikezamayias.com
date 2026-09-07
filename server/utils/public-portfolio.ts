import type { HomePayload } from "~/composables/useHomeData";
import type { RoadmapDoc, RoadmapEntry } from "~/firebase/types";

type PublicDoc = object & { id?: string };

const NON_PORTFOLIO_ROADMAP_COPY =
    /consult|founder|indie|freelance|agency|paid audits|templates live|first users|first hundred/i;

function collectText(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((entry) => collectText(entry)).join(" ");
    if (!value || typeof value !== "object") return "";
    return Object.values(value)
        .map((entry) => collectText(entry))
        .join(" ");
}

function roadmapText(entry: RoadmapEntry | PublicDoc): string {
    return [
        entry.id,
        (entry as { href?: string }).href,
        collectText((entry as { locale?: unknown }).locale),
    ]
        .filter(Boolean)
        .join(" ");
}

function hasNonPortfolioRoadmapCopy(entry: RoadmapEntry | PublicDoc): boolean {
    return NON_PORTFOLIO_ROADMAP_COPY.test(roadmapText(entry));
}

function sanitizePublicRoadmapMeta<T extends Partial<RoadmapDoc> | null>(roadmap: T): T {
    if (!roadmap) return roadmap;
    return {
        ...roadmap,
        goal: {
            en: "Apps, writing, and site updates",
            el: "Εφαρμογές, κείμενα και site updates",
        },
        intro: {
            en: "A small public roadmap for app, writing, and site updates.",
            el: "Ένα μικρό δημόσιο roadmap για εφαρμογές, κείμενα και site updates.",
        },
    };
}

function sanitizeExperienceCopy(value: unknown): unknown {
    if (typeof value === "string") return value.replace(/(?<!-)\bfounders?\b/gi, "product team");
    if (Array.isArray(value)) return value.map((item) => sanitizeExperienceCopy(item));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, sanitizeExperienceCopy(entry)])
    );
}

function sanitizePublicExperienceEntry<T extends PublicDoc>(entry: T): T | null {
    if (entry.id === "independent-software-engineer") return null;
    return sanitizeExperienceCopy(entry) as T;
}

export function sanitizePublicRoadmapEntries<T extends RoadmapEntry | PublicDoc>(
    entries: T[]
): T[] {
    return entries.filter((entry) => !hasNonPortfolioRoadmapCopy(entry));
}

export function sanitizePublicCollection<T extends PublicDoc>(
    collection: string,
    docs: T[],
    isAdmin: boolean
): T[] {
    if (isAdmin) return docs;
    if (collection === "roadmap") return sanitizePublicRoadmapEntries(docs);
    if (collection === "experience") {
        return docs
            .map((doc) => sanitizePublicExperienceEntry(doc))
            .filter((doc): doc is T => Boolean(doc));
    }
    return docs;
}

export function sanitizePublicDoc<T extends PublicDoc>(
    collection: string,
    doc: T,
    isAdmin: boolean
): T | null {
    return sanitizePublicCollection(collection, [doc], isAdmin)[0] ?? null;
}

export function sanitizePublicSingleton<T extends PublicDoc>(
    name: string,
    doc: T,
    isAdmin = false
): T {
    if (isAdmin || name !== "roadmap") return doc;
    return sanitizePublicRoadmapMeta(doc as T & Partial<RoadmapDoc>) as T;
}

export function sanitizePublicHomePayload(payload: HomePayload): HomePayload {
    return {
        ...payload,
        roadmap_meta: sanitizePublicRoadmapMeta(payload.roadmap_meta),
        roadmap: sanitizePublicRoadmapEntries(payload.roadmap),
    };
}
