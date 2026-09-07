// scripts/import-precodex-content.ts
//
// One-shot importer for content from the pre-Codex portfolio (commit
// `3139697`). Reads the legacy `content/*.yml` files via `git show`,
// transforms each schema to the current Codex Firestore shape, and upserts
// via firebase-admin (same service account as `seed-firestore.ts`).
//
// Why a separate script: schemas differ enough that the existing
// `seed:firestore` would overwrite with Codex defaults instead of importing
// the legacy content. This script does the field mapping per collection.
//
// Run:
//   bun run scripts/import-precodex-content.ts --dry-run   # print mapped docs
//   bun run scripts/import-precodex-content.ts             # upsert (merge)
//   bun run scripts/import-precodex-content.ts --reset --i-mean-it  # wipe + replace
//
// --dry-run     show planned writes without touching Firestore
// --reset       delete target collections before upserting (DESTRUCTIVE)
// --i-mean-it   required to allow --reset on the prod project
//
// Field-mapping notes per collection live inline above each `transform*`
// function. They're best-effort — review in /admin after running.

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_ACCOUNT = resolve(__dirname, "service-account.json");
const PROD_PROJECT_ID = "personal-website-v1-f775a";
const SOURCE_COMMIT = "3139697";

const dryRun = process.argv.includes("--dry-run");
const reset = process.argv.includes("--reset");
const iMeanIt = process.argv.includes("--i-mean-it");

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf-8")) as { project_id: string };

if (reset && sa.project_id === PROD_PROJECT_ID && !iMeanIt) {
    console.error(
        `REFUSING: --reset against production project '${sa.project_id}' requires --i-mean-it.`
    );
    process.exit(2);
}

// Initialise admin SDK only when we're actually writing. Lets --dry-run
// run on a machine without prod creds.
let db: ReturnType<typeof getFirestore> | null = null;
if (!dryRun) {
    initializeApp({ credential: cert(SERVICE_ACCOUNT) });
    db = getFirestore();
    // Firestore admin SDK rejects literal `undefined` fields by default.
    // Several legacy fields (current job's `end`, missing credentialUrl,
    // etc.) come through as undefined after transform — drop them server-
    // side rather than scrubbing every transform output.
    db.settings({ ignoreUndefinedProperties: true });
}

function readYamlFromCommit<T>(file: string): T {
    // `execFileSync` (no shell) — git args are fully controlled by us, but
    // the security hook flags any `exec()`/`execSync()` in this repo.
    const buf = execFileSync("git", ["show", `${SOURCE_COMMIT}:content/${file}`], {
        cwd: resolve(__dirname, ".."),
        encoding: "utf-8",
    });
    return parseYaml(buf) as T;
}

const perLocale = (s: string) => ({ en: s, el: s });

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

// Convert "Feb 2024" → "2024-02", "Jun 2023" → "2023-06"
// "Present" or "Current" → undefined (renderer appends → Present).
function parseMonthYear(s: string | undefined): string | undefined {
    if (!s) return undefined;
    const t = s.trim();
    if (/^(present|current|now)$/i.test(t)) return undefined;
    const months: Record<string, string> = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
    };
    const m = t.match(/^([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
    if (m?.[1]) {
        const month = months[m[1]!.toLowerCase().slice(0, 3)];
        if (month) return `${m[2]}-${month}`;
    }
    // Already YYYY-MM or YYYY
    if (/^\d{4}(-\d{2})?$/.test(t)) return t;
    return undefined;
}

// "Feb 2024 — Present" → { start: "2024-02", end: undefined }
// Split on dash/em-dash/en-dash only when surrounded by whitespace so
// ISO-style dates like "2024-02" survive intact.
function parsePeriod(period: string): { start?: string; end?: string } {
    const parts = period.split(/\s+(?:—|–|-)\s+/).map((s) => s.trim());
    return {
        start: parseMonthYear(parts[0]),
        end: parts[1] ? parseMonthYear(parts[1]) : undefined,
    };
}

// ----- Schema transforms ----------------------------------------------------

// PROFILE: old { name, title, tagline } → Codex ProfileDoc.
// `name` is dropped — the new profile schema doesn't carry it (about.name
// is the canonical author name now).
function transformProfile(yml: { title: string; tagline: string }) {
    return {
        headline: perLocale(yml.title),
        summary: perLocale(yml.tagline),
        email: "contact@mikezamayias.com",
        location: perLocale("Heraklion, Crete"),
    };
}

// CONTACT: old `items[]` (email/linkedin/github) → Codex ContactDoc + social
// gets covered by the social transform. We only set the contact singleton
// here: email + availability blurb.
function transformContact() {
    return {
        email: "contact@mikezamayias.com",
        timezone: "Europe/Athens",
        availability: perLocale("Open to focused product builds and technical rescue work."),
        preferredChannel: "email" as const,
    };
}

// SKILLS: old nested categories × skills → flat per-skill docs.
// Category map: legacy free-form ("Mobile", "Web") → Codex enum
// ("framework", "platform", "language", "tool", "other"). Best-effort.
// Proficiency: old percentage 0-100 → 1-5 bucket.
function transformSkills(yml: {
    items: Array<{
        title: string;
        skills: Array<{ name: string; level?: string; percentage?: number }>;
    }>;
}) {
    const categoryMap: Record<string, "language" | "framework" | "platform" | "tool" | "other"> = {
        mobile: "framework",
        cloud: "platform",
        devops: "tool",
        web: "framework",
    };
    const proficiencyFromPct = (p?: number): 1 | 2 | 3 | 4 | 5 =>
        !p ? 3 : p >= 90 ? 5 : p >= 80 ? 4 : p >= 70 ? 3 : p >= 50 ? 2 : 1;

    const out: Array<{
        id: string;
        name: string;
        category: "language" | "framework" | "platform" | "tool" | "other";
        proficiency: 1 | 2 | 3 | 4 | 5;
        order: number;
    }> = [];
    let order = 1;
    for (const cat of yml.items) {
        const codexCategory = categoryMap[cat.title.toLowerCase()] || "other";
        for (const skill of cat.skills) {
            out.push({
                id: slugify(skill.name),
                name: skill.name,
                category: codexCategory,
                proficiency: proficiencyFromPct(skill.percentage),
                order: order++,
            });
        }
    }
    return out;
}

// EXPERIENCE: { company, title, period, ... } → Codex ExperienceEntry.
function transformExperience(yml: {
    items: Array<{
        company: string;
        title: string;
        period: string;
        description?: string;
        achievements?: string[];
    }>;
}) {
    return yml.items.map((item, i) => {
        const { start, end } = parsePeriod(item.period);
        return {
            id: slugify(`${item.company}-${item.title}`),
            role: perLocale(item.title),
            company: item.company,
            start: start || "2020-01",
            end,
            summary: perLocale(item.description || ""),
            achievements: (item.achievements || []).map(perLocale),
            order: i + 1,
        };
    });
}

// EDUCATION: { degree, institution, period, location, status } → Codex.
function transformEducation(yml: {
    items: Array<{
        degree: string;
        institution: string;
        period: string;
        location?: string;
        status?: string;
    }>;
}) {
    return yml.items.map((item, i) => {
        const { start, end } = parsePeriod(item.period);
        return {
            id: slugify(`${item.institution}-${item.degree}`),
            institution: item.institution,
            degree: perLocale(item.degree),
            start: start || "2018-10",
            end,
            order: i + 1,
        };
    });
}

// CERTIFICATIONS: { title, issuer, date } → Codex CertificationEntry.
// Old `date` was "April 2023" — convert via parseMonthYear (handles "Apr 2023"
// after lowercasing the 3-letter prefix). Old strings like "April 2023" need
// the same parser path.
function transformCertifications(yml: {
    items: Array<{
        title: string;
        issuer: string;
        date: string;
        link?: string;
    }>;
}) {
    return yml.items.map((item, i) => ({
        id: slugify(item.title),
        name: item.title,
        issuer: item.issuer,
        issued: parseMonthYear(item.date) || "2023-01",
        credentialUrl: item.link,
        order: i + 1,
    }));
}

// SOCIAL: { platform, url, iconSet, iconName } → Codex SocialLink.
function transformSocial(yml: {
    items: Array<{ platform: string; url: string; iconName?: string }>;
}) {
    return yml.items.map((item, i) => ({
        id: slugify(item.platform),
        label: item.platform,
        url: item.url,
        icon: item.iconName,
        order: i + 1,
        visible: true,
    }));
}

// PROJECTS → WORK: { title, description, techStack, demoUrl, githubUrl, ... }
// → Codex Work. Old `category/status/type/iconSet/iconName/features` don't
// map directly; preserved as locale.en.desc + features list. Old dateless
// projects get a "2023-01" placeholder start — review in admin.
function transformProjects(yml: {
    items: Array<{
        title: string;
        description: string;
        techStack?: string[];
        features?: string[];
        demoUrl?: string;
        githubUrl?: string;
    }>;
}) {
    return yml.items.map((item, i) => {
        const slug = slugify(item.title);
        return {
            slug,
            start: "2023-01",
            stack: (item.techStack || []).slice(0, 3).map((t) => t.toLowerCase()),
            order: i + 1,
            published: true,
            locales_available: ["en"],
            locale: {
                en: {
                    name: item.title,
                    desc: item.description,
                    long: (item.features || []).map((f) => `- ${f}`).join("\n"),
                    demoUrl: item.demoUrl,
                    repoUrl: item.githubUrl,
                },
            },
        };
    });
}

// ----- Writers --------------------------------------------------------------

const BATCH_LIMIT = 500;

async function clearCollection(name: string) {
    if (!db) return;
    const snap = await db.collection(name).get();
    if (snap.empty) return;
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    console.log(`  cleared ${snap.size} docs from /${name}`);
}

async function upsertSingleton(docPath: string, data: Record<string, unknown>) {
    if (dryRun) {
        console.log(`\n[dry-run] would set ${docPath}:`);
        console.log(JSON.stringify(data, null, 2).split("\n").slice(0, 12).join("\n"));
        return;
    }
    if (!db) return;
    await db.doc(docPath).set(data, { merge: !reset });
    console.log(`  ✓ ${docPath}`);
}

async function upsertCollection<T extends { id?: string; slug?: string }>(
    name: string,
    keyField: "id" | "slug",
    items: T[]
) {
    if (reset) await clearCollection(name);
    if (dryRun) {
        console.log(`\n[dry-run] would upsert ${items.length} items into /${name}:`);
        for (const item of items) {
            const id = item[keyField] ?? "?";
            console.log(`  · /${name}/${id}`);
        }
        return;
    }
    if (!db) return;
    const validItems = items.filter((item) => {
        if (!item[keyField]) {
            console.warn(`  skipping (no ${keyField}):`, item);
            return false;
        }
        return true;
    });
    for (let i = 0; i < validItems.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        for (const item of validItems.slice(i, i + BATCH_LIMIT)) {
            const id = item[keyField]!;
            batch.set(db.collection(name).doc(String(id)), item, { merge: !reset });
        }
        await batch.commit();
    }
    console.log(`  ✓ ${validItems.length} docs into /${name}`);
}

// ----- Main -----------------------------------------------------------------

async function main() {
    const banner = dryRun
        ? "DRY RUN"
        : reset
          ? `RESET (target: ${sa.project_id})`
          : `merge (target: ${sa.project_id})`;
    console.log(`\nimport-precodex-content — ${banner}\nsource: ${SOURCE_COMMIT}\n`);

    console.log("Profile:");
    const profileYml = readYamlFromCommit<{ title: string; tagline: string }>("profile.yml");
    await upsertSingleton("singletons/profile", transformProfile(profileYml));

    console.log("\nContact:");
    await upsertSingleton("contact/main", transformContact());

    console.log("\nSkills:");
    const skillsYml = readYamlFromCommit<Parameters<typeof transformSkills>[0]>("skills.yml");
    await upsertCollection("skills", "id", transformSkills(skillsYml));

    console.log("\nSocial:");
    const socialYml = readYamlFromCommit<Parameters<typeof transformSocial>[0]>("social.yml");
    await upsertCollection("social", "id", transformSocial(socialYml));

    console.log("\nExperience:");
    const expYml = readYamlFromCommit<Parameters<typeof transformExperience>[0]>("experience.yml");
    await upsertCollection("experience", "id", transformExperience(expYml));

    console.log("\nEducation:");
    const eduYml = readYamlFromCommit<Parameters<typeof transformEducation>[0]>("education.yml");
    await upsertCollection("education", "id", transformEducation(eduYml));

    console.log("\nCertifications:");
    const certYml =
        readYamlFromCommit<Parameters<typeof transformCertifications>[0]>("certifications.yml");
    await upsertCollection("certifications", "id", transformCertifications(certYml));

    console.log("\nWork (from projects.yml):");
    const projYml = readYamlFromCommit<Parameters<typeof transformProjects>[0]>("projects.yml");
    await upsertCollection("work", "slug", transformProjects(projYml));

    console.log("\ndone.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
