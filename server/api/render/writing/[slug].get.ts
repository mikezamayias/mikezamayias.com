// server/api/render/writing/[slug].get.ts
//
// Renders a post's Markdown body to sanitized HTML. The live site is a
// static build, so this runs while `/writing/<slug>` is prerendered and
// reads the same build-time snapshot as `/api/content/writing`
// (`content/writing.json`, written by `scripts/snapshot-content.ts`).
//
// It used to read Firestore through firebase-admin, but the static deploy
// has no Google credentials, so every prerendered post baked in a blank
// body. The snapshot only holds published posts, so anything missing from
// it is a 404.
import writingJson from "~~/content/writing.json";
import { renderMarkdown } from "~/server/utils/sanitize";

type WritingDoc = {
    id: string;
    slug?: string;
    published?: boolean;
    locale?: Record<string, { body?: string }>;
};

const posts = writingJson as WritingDoc[];

export default defineEventHandler(async (event) => {
    const slug = getRouterParam(event, "slug");
    // EN-only for now. Re-introduce locale parsing when EL returns.
    const locale = "en" as const;
    if (!slug) {
        throw createError({ statusCode: 400, message: "missing slug" });
    }

    const post = posts.find((p) => p.id === slug || p.slug === slug);
    if (!post || !post.published) {
        throw createError({ statusCode: 404, message: "not found" });
    }

    // Sanitize/marked failures propagate as a 500 and fail the build,
    // rather than shipping a post with no body.
    return renderMarkdown(post.locale?.[locale]?.body ?? "");
});
