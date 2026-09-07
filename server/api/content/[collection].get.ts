import { defineEventHandler, getRouterParam, getQuery, createError } from "h3";
import certificationsJson from "~~/content/certifications.json";
import contactJson from "~~/content/contact.json";
import educationJson from "~~/content/education.json";
import experienceJson from "~~/content/experience.json";
import roadmapJson from "~~/content/roadmap.json";
import skillsJson from "~~/content/skills.json";
import socialJson from "~~/content/social.json";
import workJson from "~~/content/work.json";
import writingJson from "~~/content/writing.json";
import { assertPublicReadable, filterPublic } from "../../utils/content-collections";
import { sanitizePublicCollection } from "../../utils/public-portfolio";

type ContentDoc = Record<string, unknown> & { id: string };

const COLLECTIONS: Record<string, ContentDoc[]> = {
    work: workJson as ContentDoc[],
    writing: writingJson as ContentDoc[],
    roadmap: roadmapJson as ContentDoc[],
    social: socialJson as ContentDoc[],
    experience: experienceJson as ContentDoc[],
    skills: skillsJson as ContentDoc[],
    education: educationJson as ContentDoc[],
    certifications: certificationsJson as ContentDoc[],
    contact: (contactJson ? [{ id: "main", ...contactJson }] : []) as ContentDoc[],
};

function parseLimit(raw: unknown): number | null {
    if (typeof raw !== "string") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(100, Math.floor(n));
}

export default defineEventHandler((event) => {
    const collection = assertPublicReadable(getRouterParam(event, "collection") ?? "");
    const docs = COLLECTIONS[collection];
    if (!docs) {
        throw createError({
            statusCode: 404,
            message: `Unknown content collection: ${collection}`,
        });
    }

    const { limit: limitParam } = getQuery(event);
    const limit = parseLimit(limitParam);

    const limited = limit && limit > 0 ? docs.slice(0, limit) : docs;
    return sanitizePublicCollection(collection, filterPublic(limited, collection, false), false);
});
