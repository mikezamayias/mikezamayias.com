// scripts/seed-firestore.ts
//
// One-shot seeder. Loads JSON from seeds/firestore/* and writes to Firestore
// via firebase-admin (service account in scripts/service-account.json).
//
// Run: bun run seed:firestore [--reset] [--i-mean-it]
//   --reset      Delete all docs in seeded collections and overwrite seeded singleton docs
//                instead of merging fields (DESTRUCTIVE)
//   --i-mean-it  Required when --reset targets the production project ID.

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
    console.log(`seeding Firestore${reset ? " (RESET MODE)" : ""}…`);
    await seedSettings();
    await seedSingleton("singletons/hero", "hero.json");
    await seedSingleton("singletons/about", "about.json");
    await seedSingleton("singletons/roadmap", "roadmap.json");
    await seedSingleton("profile/main", "profile.json");
    await seedSingleton("contact/main", "contact.json");
    await seedCollection("work", "slug", "work.json");
    await seedCollection("writing", "slug", "writing.json");
    await seedCollection("roadmap", "id", "roadmap-entries.json");
    await seedCollection("social", "id", "social.json");
    await seedCollection("experience", "id", "experience.json");
    await seedCollection("skills", "id", "skills.json");
    await seedCollection("education", "id", "education.json");
    await seedCollection("certifications", "id", "certifications.json");
    console.log("done.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
