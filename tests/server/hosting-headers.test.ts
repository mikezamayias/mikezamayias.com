import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface HeaderRule {
    pattern: string;
    headers: Record<string, string>;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const headersPath = resolve(currentDir, "../../public/_headers");

function parseHeaders(content: string): HeaderRule[] {
    const rules: HeaderRule[] = [];
    let currentRule: HeaderRule | null = null;

    for (const rawLine of content.split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.trim() || line.startsWith("#")) {
            continue;
        }

        if (line.startsWith("  ")) {
            if (!currentRule) {
                continue;
            }
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
                const name = line.slice(0, colonIndex).trim();
                const value = line.slice(colonIndex + 1).trim();
                currentRule.headers[name] = value;
            }
        } else if (!line.startsWith(" ")) {
            currentRule = { pattern: line.trim(), headers: {} };
            rules.push(currentRule);
        }
    }

    return rules;
}

function getRules(): HeaderRule[] {
    const content = readFileSync(headersPath, "utf8");
    return parseHeaders(content);
}

function getRule(pattern: string): HeaderRule {
    const rule = getRules().find((candidate) => candidate.pattern === pattern);
    if (!rule) {
        throw new Error(`public/_headers has no rule for ${pattern}`);
    }
    return rule;
}

describe("Cloudflare static asset headers (public/_headers)", () => {
    it("exists, contains exactly three rules, and starts with /*", () => {
        expect(existsSync(headersPath)).toBe(true);

        const rules = getRules();
        expect(rules).toHaveLength(3);
        expect(rules.map((rule) => rule.pattern)).toEqual(["/*", "/_nuxt/*", "/fonts/*"]);
    });

    it("caches the self-hosted fonts for a month, detached from /*", () => {
        const rule = getRule("/fonts/*");
        expect(rule.headers["Cache-Control"]).toBe("public, max-age=2592000, no-transform");
        // Same regression guard as /_nuxt/*: without `! Cache-Control` the
        // max-age=0 from /* is merged in and wins.
        const content = readFileSync(headersPath, "utf8");
        expect(content).toMatch(/\/fonts\/\*[\s\S]*?!\s+Cache-Control/);
    });

    it("sets Cache-Control: public, max-age=0, must-revalidate, no-transform on /*", () => {
        const rule = getRule("/*");
        expect(rule.headers["Cache-Control"]).toBe(
            "public, max-age=0, must-revalidate, no-transform"
        );
    });

    it("sets Cache-Control: public, max-age=31536000, immutable, no-transform on /_nuxt/*", () => {
        const rule = getRule("/_nuxt/*");
        expect(rule).toBeDefined();
        expect(rule.headers["Cache-Control"]).toBe(
            "public, max-age=31536000, immutable, no-transform"
        );
    });

    it("detaches inherited Cache-Control in /_nuxt/* with ! Cache-Control", () => {
        const content = readFileSync(headersPath, "utf8");

        // REGRESSION GUARD:
        // Cloudflare's _headers implementation combines headers from all matching rules with commas.
        // Without `! Cache-Control` under /_nuxt/*, responses contain both max-age=0 and max-age=31536000,
        // causing clients to honor the more restrictive max-age=0 and defeating immutable asset caching.
        expect(content).toMatch(/\/_nuxt\/\*[\s\S]*?!\s+Cache-Control/);
    });

    it("guards that /* Cache-Control does not contain a non-zero max-age", () => {
        const rule = getRule("/*");
        const cacheControl = rule.headers["Cache-Control"] ?? "";

        // REGRESSION GUARD:
        // Publishing is a rebuild, so cached HTML would delay a publish by up to that cache duration.
        // max-age must be 0 so HTML is always revalidated on every request.
        expect(cacheControl).toMatch(/max-age=0\b/);
        expect(cacheControl).not.toMatch(/max-age=[1-9]/);
    });

    it("sets X-Frame-Options: DENY", () => {
        const rule = getRule("/*");
        expect(rule.headers["X-Frame-Options"]).toBe("DENY");
    });

    it("sets X-Content-Type-Options: nosniff", () => {
        const rule = getRule("/*");
        expect(rule.headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("sets Referrer-Policy: strict-origin-when-cross-origin", () => {
        const rule = getRule("/*");
        expect(rule.headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("sets a Permissions-Policy that disables camera, microphone, geolocation and payment", () => {
        const rule = getRule("/*");
        const permissionsPolicy = rule.headers["Permissions-Policy"];

        expect(permissionsPolicy).toBeDefined();
        expect(permissionsPolicy).toContain("camera=()");
        expect(permissionsPolicy).toContain("microphone=()");
        expect(permissionsPolicy).toContain("geolocation=()");
        expect(permissionsPolicy).toContain("payment=()");
        expect(permissionsPolicy).toBe("camera=(), microphone=(), geolocation=(), payment=()");
    });

    it("sets Content-Security-Policy containing frame-ancestors 'none'", () => {
        const rule = getRule("/*");
        const csp = rule.headers["Content-Security-Policy"];

        expect(csp).toBeDefined();
        expect(csp).toContain("frame-ancestors 'none'");
    });

    it("does not hoist per-page script hashes into the shared Content-Security-Policy header", () => {
        const rule = getRule("/*");
        const csp = rule.headers["Content-Security-Policy"] ?? "";

        // REGRESSION GUARD:
        // Content-Security-Policy in _headers must NEVER contain script-src or any sha256-/sha384- hashes.
        // The site relies on per-page CSP <meta> tags generated by nuxt-security (ssg.meta). Inline
        // script hashes differ between pages (e.g. the home page carries 15 hashes, /work carries 11).
        // A single shared header CSP would need the union of every page's hashes; any page containing
        // an inline script hash not present in that shared policy would fail CSP evaluation and render blank.
        // Multiple CSP policies compose safely: the meta tag governs scripts and styles per page,
        // while the header CSP strictly governs frame-ancestors, which cannot be expressed via <meta>.
        expect(csp).not.toContain("script-src");
        expect(csp).not.toMatch(/sha(256|384)-/);
    });
});
