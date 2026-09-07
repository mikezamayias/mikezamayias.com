// server/api/content/singletons/[name].get.ts
//
// Public read of the 3 singletons (hero, about, roadmap) from build-time snapshot JSON.
import { defineEventHandler, getRouterParam, createError } from "h3";
import singletonsJson from "~~/content/singletons.json";
import { sanitizePublicSingleton } from "../../../utils/public-portfolio";

const ALLOWED = new Set(["hero", "about", "roadmap"]);

export default defineEventHandler((event) => {
    const name = getRouterParam(event, "name");
    if (!name || !ALLOWED.has(name)) {
        throw createError({ statusCode: 404, message: "Unknown singleton" });
    }

    const singletons = singletonsJson as Record<string, Record<string, unknown> | null>;
    const doc = singletons[name];
    if (!doc) {
        throw createError({ statusCode: 404, message: "Not found" });
    }

    return sanitizePublicSingleton(name, { id: name, ...doc });
});
