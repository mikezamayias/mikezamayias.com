/**
 * scripts/snapshot-content.ts
 *
 * Snapshots public Firestore content to JSON files at build time.
 * Uses the Firebase client SDK (unauthenticated) — no firebase-admin.
 * Run via: bun run snapshot
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    terminate,
} from "firebase/firestore";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { COLLECTION_SCHEMAS, SINGLETON_SCHEMAS } from "../server/utils/schemas";

// ── env validation ───────────────────────────────────────────────────
const apiKey = process.env.NUXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey) {
    console.error("ERROR: NUXT_PUBLIC_FIREBASE_API_KEY is not set.");
    process.exit(1);
}
if (!projectId) {
    console.error("ERROR: NUXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
    process.exit(1);
}

// ── Firebase client init (unauthenticated) ───────────────────────────
const app = initializeApp({
    apiKey,
    projectId,
    authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID ?? "",
});
const db = getFirestore(app);

// ── helpers ──────────────────────────────────────────────────────────

/** Recursively convert Firestore Timestamps to ISO-8601 strings. */
function normaliseTimestamps(val: unknown): unknown {
    if (
        val instanceof Timestamp ||
        (val !== null &&
            typeof val === "object" &&
            typeof (val as { toDate?: () => Date }).toDate === "function")
    ) {
        return (val as { toDate: () => Date }).toDate().toISOString();
    }
    if (Array.isArray(val)) {
        return val.map(normaliseTimestamps);
    }
    if (val !== null && typeof val === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            out[k] = normaliseTimestamps(v);
        }
        return out;
    }
    return val;
}

/** Recursively sort object keys for deterministic output. */
function sortKeysDeep(val: unknown): unknown {
    if (Array.isArray(val)) {
        return val.map(sortKeysDeep);
    }
    if (val !== null && typeof val === "object") {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(val as Record<string, unknown>).sort()) {
            sorted[key] = sortKeysDeep((val as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return val;
}

/** Deterministic JSON: sorted keys, 4-space indent, trailing newline. */
function deterministicJson(data: unknown): string {
    return JSON.stringify(sortKeysDeep(data), null, 4) + "\n";
}

// ── query definitions ────────────────────────────────────────────────

type CollectionDef = {
    name: string;
    buildQuery: () => ReturnType<typeof query>;
};

const collectionDefs: CollectionDef[] = [
    {
        name: "work",
        buildQuery: () =>
            query(
                collection(db, "work"),
                where("published", "==", true),
                where("locales_available", "array-contains", "en"),
                orderBy("order"),
                limit(100)
            ),
    },
    {
        name: "writing",
        buildQuery: () =>
            query(
                collection(db, "writing"),
                where("published", "==", true),
                where("locales_available", "array-contains", "en"),
                orderBy("date", "desc"),
                limit(100)
            ),
    },
    {
        name: "roadmap",
        buildQuery: () =>
            query(
                collection(db, "roadmap"),
                where("hidden", "==", false),
                orderBy("order"),
                limit(100)
            ),
    },
    ...["social", "experience", "skills", "education", "certifications"].map((name) => ({
        name,
        buildQuery: () => query(collection(db, name), orderBy("order")),
    })),
];

type SingletonDef = {
    key: string;
    path: [string, string];
    schemaKey: string;
};

const singletonDefs: SingletonDef[] = [
    { key: "hero", path: ["singletons", "hero"], schemaKey: "hero" },
    { key: "about", path: ["singletons", "about"], schemaKey: "about" },
    { key: "roadmap", path: ["singletons", "roadmap"], schemaKey: "roadmap" },
];

const contactDef = {
    path: ["contact", "main"] as [string, string],
};

// ── validation helpers ───────────────────────────────────────────────

function prepareCollectionDocForValidation(
    collectionName: string,
    raw: Record<string, unknown>
): Record<string, unknown> {
    const candidate = { ...raw };
    if (collectionName === "work") {
        // WorkSchema expects stack as string, yr, glyph
        if (Array.isArray(candidate.stack)) {
            candidate.stack = candidate.stack.join(" · ");
        }
        if (!candidate.yr && candidate.start) {
            candidate.yr = String(candidate.start);
        }
        if (!candidate.glyph && candidate.slug) {
            candidate.glyph = String(candidate.slug).charAt(0).toUpperCase() || "·";
        }
    } else if (collectionName === "certifications") {
        // CertificationSchema expects credentialUrl as full URL
        if (
            typeof candidate.credentialUrl === "string" &&
            candidate.credentialUrl.startsWith("/")
        ) {
            candidate.credentialUrl = `https://mikezamayias.com${candidate.credentialUrl}`;
        }
    } else if (collectionName === "contact") {
        const avail = candidate.availability as Record<string, unknown> | undefined;
        if (avail && !avail.en && !avail.el) {
            candidate.availability = undefined;
        }
    }
    return candidate;
}

function prepareSingletonForValidation(
    singletonKey: string,
    raw: Record<string, unknown>
): Record<string, unknown> {
    const candidate = { ...raw };
    if (singletonKey === "roadmap") {
        const goal = candidate.goal as Record<string, unknown> | undefined;
        if (goal && !goal.en && !goal.el) {
            candidate.goal = { en: "Roadmap" };
        }
        const target = candidate.target as Record<string, unknown> | undefined;
        if (target && !target.en && !target.el) {
            candidate.target = { en: "Ongoing" };
        }
    }
    return candidate;
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
    const contentDir = resolve(process.cwd(), "content");
    mkdirSync(contentDir, { recursive: true });

    let hadError = false;
    const summary: string[] = [];

    // ── fetch collections ──────────────────────────────────────────────
    const collections: Record<string, unknown[]> = {};

    for (const def of collectionDefs) {
        const snap = await getDocs(def.buildQuery());
        const docs: unknown[] = [];

        for (const d of snap.docs) {
            const data = d.data() as Record<string, unknown>;
            const raw = normaliseTimestamps({ id: d.id, ...data }) as Record<string, unknown>;
            const schema = COLLECTION_SCHEMAS[def.name as keyof typeof COLLECTION_SCHEMAS];
            if (schema) {
                const candidate = prepareCollectionDocForValidation(def.name, raw);
                const result = schema.safeParse(candidate);
                if (!result.success) {
                    for (const issue of result.error.issues) {
                        console.error(
                            `Validation error in collection "${def.name}" doc "${d.id}": [${issue.path.join(".")}] ${issue.message}`
                        );
                    }
                    hadError = true;
                    continue;
                }
            }
            docs.push(raw);
        }

        collections[def.name] = docs;
        const filePath = resolve(contentDir, `${def.name}.json`);
        writeFileSync(filePath, deterministicJson(docs));
        summary.push(`${def.name}.json — ${docs.length} document(s)`);
    }

    // ── fetch singletons ──────────────────────────────────────────────
    const singletons: Record<string, unknown> = {};

    for (const def of singletonDefs) {
        const snap = await getDoc(doc(db, def.path[0], def.path[1]));
        if (!snap.exists()) {
            singletons[def.key] = null;
            continue;
        }
        const raw = normaliseTimestamps(snap.data()) as Record<string, unknown>;
        const schema = SINGLETON_SCHEMAS[def.schemaKey as keyof typeof SINGLETON_SCHEMAS];
        if (schema) {
            const candidate = prepareSingletonForValidation(def.key, raw);
            const result = schema.safeParse(candidate);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    console.error(
                        `Validation error in singleton "${def.key}": [${issue.path.join(".")}] ${issue.message}`
                    );
                }
                hadError = true;
                singletons[def.key] = null;
                continue;
            }
        }
        singletons[def.key] = raw;
    }

    const singletonsPath = resolve(contentDir, "singletons.json");
    writeFileSync(singletonsPath, deterministicJson(singletons));
    summary.push(
        `singletons.json — ${Object.values(singletons).filter((v) => v !== null).length} document(s)`
    );

    // ── fetch contact ─────────────────────────────────────────────────
    let contact: unknown = null;
    {
        const snap = await getDoc(doc(db, contactDef.path[0], contactDef.path[1]));
        if (snap.exists()) {
            const raw = normaliseTimestamps(snap.data()) as Record<string, unknown>;
            const schema = COLLECTION_SCHEMAS.contact;
            if (schema) {
                const candidate = prepareCollectionDocForValidation("contact", raw);
                const result = schema.safeParse(candidate);
                if (!result.success) {
                    for (const issue of result.error.issues) {
                        console.error(
                            `Validation error in "contact/main": [${issue.path.join(".")}] ${issue.message}`
                        );
                    }
                    hadError = true;
                } else {
                    contact = raw;
                }
            } else {
                contact = raw;
            }
        }
    }
    const contactPath = resolve(contentDir, "contact.json");
    writeFileSync(contactPath, deterministicJson(contact));
    summary.push(`contact.json — ${contact !== null ? 1 : 0} document(s)`);

    // ── derive home.json ──────────────────────────────────────────────
    const home = {
        hero: singletons.hero ?? null,
        about: singletons.about ?? null,
        roadmap_meta: singletons.roadmap ?? null,
        work: (collections.work ?? []).slice(0, 4),
        writing: (collections.writing ?? []).slice(0, 3),
        roadmap: collections.roadmap ?? [],
    };
    const homePath = resolve(contentDir, "home.json");
    writeFileSync(homePath, deterministicJson(home));
    summary.push(
        `home.json — derived (work=${home.work.length}, writing=${home.writing.length}, roadmap=${home.roadmap.length})`
    );

    // ── bail on validation errors ─────────────────────────────────────
    if (hadError) {
        console.error("\n✗ Snapshot aborted due to validation errors.");
        await terminate(db);
        process.exit(1);
    }

    // ── print summary ─────────────────────────────────────────────────
    console.log("\n✓ Content snapshot complete:");
    for (const line of summary) {
        console.log(`  ${line}`);
    }

    await terminate(db);
}

main().catch((err) => {
    console.error("Snapshot failed:", err);
    process.exit(1);
});
