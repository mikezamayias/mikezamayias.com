// server/utils/sanitize.ts
//
// Markdown → sanitized HTML pipeline. Used by:
//   - /api/render/writing/[slug]  (read-time render)
//
// Read-time sanitize is the single defense — write-time markdown
// sanitize was removed (P2 Codex) because a regex `<script>...</script>`
// pattern also matched inside fenced code blocks, silently stripping
// content from technical posts with safe code samples. `marked()`
// escapes `<` inside `<pre><code>`, then sanitize-html strips dangerous
// content elsewhere — that's the correct surface.
//
// Allowlist matches the Plan B Task 17 spec exactly.
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
    "pre",
    "code",
]);

const ALLOWED_ATTRIBUTES = {
    ...sanitizeHtml.defaults.allowedAttributes,
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    img: ["src", "alt", "title", "width", "height", "loading"],
};

export async function renderMarkdown(body: string): Promise<string> {
    const html = await marked.parse(body);
    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedSchemes: ["http", "https", "mailto"],
        allowedSchemesByTag: { img: ["http", "https"] },
    });
}
