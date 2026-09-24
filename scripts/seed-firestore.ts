// scripts/seed-firestore.ts
//
// One-shot seeder. Loads JSON from seeds/firestore/* and writes to Firestore
// via firebase-admin (service account in scripts/service-account.json).
//
// Run: bun run seed:firestore [--reset] [--i-mean-it] [--only=<name,...>]
//   --reset      Delete all docs in seeded collections and overwrite seeded singleton docs
//                instead of merging fields (DESTRUCTIVE)
//   --i-mean-it  Required when --reset targets the production project ID.
//   --only       Seed only these targets, e.g. `--only=writing`. Names are collection
//                names, singleton paths (`singletons/hero`), or `settings`. Without it,
//                everything is seeded, including /settings/main (allowedAdminIds).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ESM-compatible __dirname (project is "type": "module").
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_ACCOUNT = resolve(__dirname, "service-account.json");
const SEED_DIR = resolve(__dirname, "../seeds/firestore");
const PROD_PROJECT_ID = "personal-website-v1-f775a";

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf-8")) as { project_id: string };
initializeApp({ credential: cert(SERVICE_ACCOUNT) });
const db = getFirestore();

const reset = process.argv.includes("--reset");
const iMeanIt = process.argv.includes("--i-mean-it");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").filter(Boolean)) : null;
const wanted = (target: string) => only === null || only.has(target);

// Production guard. --reset on prod requires explicit --i-mean-it flag.
if (reset && sa.project_id === PROD_PROJECT_ID && !iMeanIt) {
    console.error(
        `REFUSING: --reset against production project '${sa.project_id}' requires --i-mean-it.`
    );
    process.exit(2);
}

async function readJson<T>(filename: string): Promise<T> {
    return JSON.parse(readFileSync(resolve(SEED_DIR, filename), "utf-8")) as T;
}

async function clearCollection(name: string) {
    const snap = await db.collection(name).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) {
        await batch.commit();
        console.log(`  cleared ${snap.size} docs from /${name}`);
    }
}

async function seedCollection<T extends { slug?: string; id?: string }>(
    name: string,
    keyField: "slug" | "id",
    file: string
) {
    const items = await readJson<T[]>(file);
    if (reset) await clearCollection(name);
    for (const item of items) {
        const id = item[keyField];
        if (!id) throw new Error(`item missing ${keyField} in ${file}`);
        const docRef = db.collection(name).doc(String(id));
        // Strip development-only annotation fields before writing to Firestore.
        // Convention: any key prefixed with "_" is treated as plan/dev metadata.
        const clean = Object.fromEntries(
            Object.entries(item as Record<string, unknown>).filter(([k]) => !k.startsWith("_"))
        );
        await docRef.set(
            {
                ...clean,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        console.log(`  /${name}/${id} ✓`);
    }
}

async function seedSingleton<T>(docPath: string, file: string) {
    const data = (await readJson<T>(file)) as Record<string, unknown>;
    // Strip _-prefixed dev annotations from singletons too.
    const clean = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith("_")));
    const ref = db.doc(docPath);
    await ref.set({ ...clean, updatedAt: FieldValue.serverTimestamp() }, { merge: !reset });
    console.log(`  ${docPath} ✓`);
}

async function seedSettings() {
    const ref = db.doc("settings/main");
    // ADMIN_UID is server-only — NEVER ship as NUXT_PUBLIC_*. Reading it
    // here at seed time is fine (server runtime, never bundled).
    const adminUid = process.env.ADMIN_UID;
    if (!adminUid) {
        console.warn("  WARN: ADMIN_UID not set — leaving allowedAdminIds empty");
    }
    await ref.set(
        {
            allowedAdminIds: adminUid ? [adminUid] : [],
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );
    console.log("  /settings/main ✓");
}

async function main() {
    console.log(
        `seeding Firestore${reset ? " (RESET MODE)" : ""}${only ? ` (only ${[...only].join(", ")})` : ""}…`
    );
    if (wanted("settings")) await seedSettings();
    const singletons: [string, string][] = [
        ["singletons/hero", "hero.json"],
        ["singletons/about", "about.json"],
        ["singletons/roadmap", "roadmap.json"],
        ["profile/main", "profile.json"],
        ["contact/main", "contact.json"],
    ];
    for (const [path, file] of singletons) {
        if (wanted(path)) await seedSingleton(path, file);
    }
    const collections: [string, "slug" | "id", string][] = [
        ["work", "slug", "work.json"],
        ["writing", "slug", "writing.json"],
        ["roadmap", "id", "roadmap-entries.json"],
        ["social", "id", "social.json"],
        ["experience", "id", "experience.json"],
        ["skills", "id", "skills.json"],
        ["education", "id", "education.json"],
        ["certifications", "id", "certifications.json"],
    ];
    for (const [name, key, file] of collections) {
        if (wanted(name)) await seedCollection(name, key, file);
    }
    console.log("done.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
