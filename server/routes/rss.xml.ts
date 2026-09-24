// server/routes/rss.xml.ts
//
// RSS 2.0 feed for /writing, prerendered to `rss.xml` from the build-time
// snapshot (`content/writing.json`). The snapshot only holds published
// English posts, newest first.
import writingJson from "~~/content/writing.json";

type WritingDoc = {
    id: string;
    slug?: string;
    date?: string;
    tags?: string[];
    locale?: Record<string, { title?: string; sub?: string }>;
};

const SITE = "https://mikezamayias.com";

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function rfc822(date: string | undefined): string | null {
    if (!date) return null;
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toUTCString();
}

export default defineEventHandler((event) => {
    const posts = writingJson as WritingDoc[];
    const items = posts.map((post) => {
        const slug = post.slug ?? post.id;
        const url = `${SITE}/writing/${encodeURIComponent(slug)}`;
        const en = post.locale?.en ?? {};
        const pubDate = rfc822(post.date);
        return [
            "        <item>",
            `            <title>${escapeXml(en.title ?? slug)}</title>`,
            `            <link>${url}</link>`,
            `            <guid isPermaLink="true">${url}</guid>`,
            en.sub ? `            <description>${escapeXml(en.sub)}</description>` : "",
            pubDate ? `            <pubDate>${pubDate}</pubDate>` : "",
            ...(post.tags ?? []).map((tag) => `            <category>${escapeXml(tag)}</category>`),
            "        </item>",
        ]
            .filter(Boolean)
            .join("\n");
    });
    const lastBuild = rfc822(posts[0]?.date);

    setHeader(event, "Content-Type", "application/rss+xml; charset=utf-8");
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "    <channel>",
        "        <title>Writing · Mike Zamayias</title>",
        `        <link>${SITE}/writing</link>`,
        "        <description>Notes on building and shipping mobile apps.</description>",
        "        <language>en</language>",
        `        <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />`,
        lastBuild ? `        <lastBuildDate>${lastBuild}</lastBuildDate>` : "",
        ...items,
        "    </channel>",
        "</rss>",
        "",
    ]
        .filter(Boolean)
        .join("\n");
});
