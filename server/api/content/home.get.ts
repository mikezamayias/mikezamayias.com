// server/api/content/home.get.ts
//
// Home-page data graph read from build-time snapshot JSON.
import { defineEventHandler } from "h3";
import type { HomePayload } from "~/composables/useHomeData";
import homeJson from "~~/content/home.json";
import { sanitizePublicHomePayload } from "../../utils/public-portfolio";

export default defineEventHandler(() => {
    return sanitizePublicHomePayload(homeJson as unknown as HomePayload);
});
