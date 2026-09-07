import { describe, it, expect } from "vitest";
import { renderMarkdown } from "~/server/utils/sanitize";

describe("renderMarkdown", () => {
    it("renders headings + paragraphs", async () => {
        const html = await renderMarkdown("# Hello\n\nWorld");
        expect(html).toContain("<h1>Hello</h1>");
        expect(html).toContain("<p>World</p>");
    });

    it("strips script tags", async () => {
        const html = await renderMarkdown("<script>alert(1)</script>\n\nbody");
        expect(html).not.toContain("<script>");
        expect(html).toContain("<p>body</p>");
    });

    it("preserves allowed img attributes", async () => {
        const html = await renderMarkdown('<img src="https://x/y.png" alt="x" loading="lazy">');
        expect(html).toContain('src="https://x/y.png"');
        expect(html).toContain('alt="x"');
        expect(html).toContain('loading="lazy"');
    });
});
