import { defineEventHandler, getRouterParam, createError } from "h3";
import certificationsJson from "~~/content/certifications.json";
import contactJson from "~~/content/contact.json";
import educationJson from "~~/content/education.json";
import experienceJson from "~~/content/experience.json";
import roadmapJson from "~~/content/roadmap.json";
import skillsJson from "~~/content/skills.json";
import socialJson from "~~/content/social.json";
import workJson from "~~/content/work.json";
import writingJson from "~~/content/writing.json";
import { assertPublicReadable, isPubliclyVisible } from "../../../utils/content-collections";
import { sanitizePublicDoc } from "../../../utils/public-portfolio";

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

export default defineEventHandler((event) => {
    const collection = assertPublicReadable(getRouterParam(event, "collection") ?? "");
    const id = getRouterParam(event, "id") ?? "";
    if (!id) {
        throw createError({ statusCode: 400, message: "Missing document id" });
    }

    const docs = COLLECTIONS[collection];
    if (!docs) {
        throw createError({ statusCode: 404, message: "Not found" });
    }

    const doc = docs.find((d) => d.id === id);
    if (!doc) {
        throw createError({ statusCode: 404, message: "Not found" });
    }

    if (!isPubliclyVisible(collection, doc)) {
        throw createError({ statusCode: 404, message: "Not found" });
    }

    const sanitized = sanitizePublicDoc(collection, doc, false);
    if (!sanitized) {
        throw createError({ statusCode: 404, message: "Not found" });
    }
    return sanitized;
});
