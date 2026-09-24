/**
 * scripts/snapshot-from-seeds.ts
 *
 * Writes `content/*.json` from `seeds/firestore/*` instead of Firestore, in
 * the same shape as `scripts/snapshot-content.ts`. For running the site
 * without Firebase credentials: a fresh clone, a fork, or offline work.
 * Production builds always snapshot the real Firestore content.
 *
 * Run via: bun run snapshot:seeds
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Doc = Record<string, unknown>;

const seedDir = resolve(process.cwd(), "seeds/firestore");
const contentDir = resolve(process.cwd(), "content");

function readSeed<T>(file: string): T {
    return JSON.parse(readFileSync(resolve(seedDir, file), "utf-8")) as T;
}

/** Drop `_`-prefixed dev annotations, as the Firestore seeder does. */
function clean(doc: Doc): Doc {
    return Object.fromEntries(Object.entries(doc).filter(([k]) => !k.startsWith("_")));
}

function write(name: string, data: unknown) {
    writeFileSync(resolve(contentDir, `${name}.json`), JSON.stringify(data, null, 4) + "\n");
}

const byOrder = (a: Doc, b: Doc) => Number(a.order ?? 0) - Number(b.order ?? 0);

const collections: [name: string, file: string, key: "slug" | "id"][] = [
    ["work", "work.json", "slug"],
    ["writing", "writing.json", "slug"],
    ["roadmap", "roadmap-entries.json", "id"],
    ["social", "social.json", "id"],
    ["experience", "experience.json", "id"],
    ["skills", "skills.json", "id"],
    ["education", "education.json", "id"],
    ["certifications", "certifications.json", "id"],
];

mkdirSync(contentDir, { recursive: true });
const out: Record<string, Doc[]> = {};

for (const [name, file, key] of collections) {
    let docs: Doc[] = readSeed<Doc[]>(file).map((d) => ({ ...clean(d), id: String(d[key]) }));
    // Mirror the public queries in snapshot-content.ts.
    if (name === "work") docs = docs.filter((d) => d.published === true).sort(byOrder);
    else if (name === "writing")
        docs = docs
            .filter((d) => d.published === true)
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    else if (name === "roadmap") docs = docs.filter((d) => d.hidden !== true).sort(byOrder);
    else docs = docs.sort(byOrder);
    out[name] = docs;
    write(name, docs);
}

const singletons = {
    hero: clean(readSeed<Doc>("hero.json")),
    about: clean(readSeed<Doc>("about.json")),
    roadmap: clean(readSeed<Doc>("roadmap.json")),
};
write("singletons", singletons);
write("contact", clean(readSeed<Doc>("contact.json")));
write("home", {
    hero: singletons.hero,
    about: singletons.about,
    roadmap_meta: singletons.roadmap,
    work: out.work!.slice(0, 4),
    writing: out.writing!.slice(0, 3),
    roadmap: out.roadmap,
});

console.log("✓ Content snapshot written from seeds/firestore:");
for (const [name, docs] of Object.entries(out)) {
    console.log(`  ${name}.json — ${docs.length} document(s)`);
}
