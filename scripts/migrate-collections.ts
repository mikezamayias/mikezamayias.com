// scripts/migrate-collections.ts
//
// Plan H.2 — Firestore collection rename migration.
//
// Copies every doc from the legacy collections to the new canonical
// collections, preserving doc IDs + every field (including `createdAt`
// / `updatedAt` timestamps). Idempotent: docs that already exist in
// the destination are skipped unless `--overwrite` is passed.
//
// Run:
//   infisical run --env=dev -- bun run scripts/migrate-collections.ts [--dry-run] [--overwrite] [--i-mean-it]
//
// Flags:
//   --dry-run     Report what would be copied without writing anything.
//   --overwrite   Replace existing destination docs (DESTRUCTIVE).
//   --i-mean-it   Required for any actual writes against the production
//                 project ID. `--dry-run` does not require it.
//
// Sequence:
//   projects/*  →  work/*
//   posts/*     →  writing/*
//   tasks/*     →  roadmap/*
//
// After this completes successfully, Plan H.3 flips client + server
// consumers to read from the canonical names only. The legacy
// collections stay in place (dual-read shim from H.1 still active)
// until Plan H.5 drops them after the 7-day soak.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ESM-compatible __dirname (project is "type": "module").
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_ACCOUNT = resolve(__dirname, "service-account.json");
const PROD_PROJECT_ID = "personal-website-v1-f775a";

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf-8")) as { project_id: string };
initializeApp({ credential: cert(SERVICE_ACCOUNT) });
const db = getFirestore();

const dryRun = process.argv.includes("--dry-run");
const overwrite = process.argv.includes("--overwrite");
const iMeanIt = process.argv.includes("--i-mean-it");

if (!dryRun && sa.project_id === PROD_PROJECT_ID && !iMeanIt) {
    console.error(
        `REFUSING: write migration against production project '${sa.project_id}' requires --i-mean-it. Use --dry-run to preview safely.`
    );
    process.exit(2);
}

if (overwrite && !iMeanIt) {
    console.error(
        "REFUSING: --overwrite requires --i-mean-it. Re-runs without --overwrite are safe (existing destination docs are skipped)."
    );
    process.exit(2);
}

interface MigrationPair {
    from: string;
    to: string;
}

const PAIRS: MigrationPair[] = [
    { from: "projects", to: "work" },
    { from: "posts", to: "writing" },
    { from: "tasks", to: "roadmap" },
];

interface PairStats {
    sourceCount: number;
    destinationCountBefore: number;
    copied: number;
    skipped: number;
    overwritten: number;
    destinationCountAfter: number;
}

async function migratePair(pair: MigrationPair): Promise<PairStats> {
    console.log(`\n=== ${pair.from}/* → ${pair.to}/* ===`);

    const sourceSnap = await db.collection(pair.from).get();
    const destSnapBefore = await db.collection(pair.to).get();

    const stats: PairStats = {
        sourceCount: sourceSnap.size,
        destinationCountBefore: destSnapBefore.size,
        copied: 0,
        skipped: 0,
        overwritten: 0,
        destinationCountAfter: 0,
    };

    console.log(`  source:      ${stats.sourceCount.toString().padStart(4)} docs in /${pair.from}`);
    console.log(
        `  destination: ${stats.destinationCountBefore.toString().padStart(4)} docs in /${pair.to} (before)`
    );

    if (sourceSnap.empty) {
        console.log(`  (source empty — nothing to migrate)`);
        stats.destinationCountAfter = stats.destinationCountBefore;
        return stats;
    }

    const existingDestIds = new Set(destSnapBefore.docs.map((d) => d.id));

    for (const doc of sourceSnap.docs) {
        const data = doc.data();
        const destExists = existingDestIds.has(doc.id);

        if (destExists && !overwrite) {
            console.log(`  /${pair.to}/${doc.id} — skipped (exists; pass --overwrite to replace)`);
            stats.skipped++;
            continue;
        }

        if (dryRun) {
            console.log(
                `  /${pair.to}/${doc.id} — would ${destExists ? "OVERWRITE" : "copy"} (dry-run)`
            );
            if (destExists) stats.overwritten++;
            else stats.copied++;
            continue;
        }

        // Copy every field as-is. Do NOT rewrite `createdAt` / `updatedAt`
        // — the new docs should preserve the legacy timestamps so audit
        // history doesn't reset on migration day.
        await db.collection(pair.to).doc(doc.id).set(data, { merge: false });
        if (destExists) {
            console.log(`  /${pair.to}/${doc.id} — overwritten`);
            stats.overwritten++;
        } else {
            console.log(`  /${pair.to}/${doc.id} — copied`);
            stats.copied++;
        }
    }

    const destSnapAfter = dryRun ? destSnapBefore : await db.collection(pair.to).get();
    stats.destinationCountAfter = destSnapAfter.size;

    console.log(
        `  destination: ${stats.destinationCountAfter.toString().padStart(4)} docs in /${pair.to} (after)`
    );
    return stats;
}

async function main() {
    const mode = dryRun ? "DRY RUN" : overwrite ? "WRITE + OVERWRITE" : "WRITE (skip existing)";
    console.log(`migrating Firestore collections — mode: ${mode}`);
    console.log(`project: ${sa.project_id}`);

    const results: Array<{ pair: MigrationPair; stats: PairStats }> = [];
    for (const pair of PAIRS) {
        const stats = await migratePair(pair);
        results.push({ pair, stats });
    }

    console.log("\n=== summary ===");
    for (const { pair, stats } of results) {
        const status =
            stats.sourceCount === stats.destinationCountAfter ||
            (dryRun && stats.sourceCount === stats.destinationCountBefore + stats.copied)
                ? "✓"
                : "✗ COUNT MISMATCH";
        console.log(
            `  ${pair.from} → ${pair.to}: source=${stats.sourceCount}, dest=${stats.destinationCountAfter}, copied=${stats.copied}, overwritten=${stats.overwritten}, skipped=${stats.skipped} ${status}`
        );
    }

    if (dryRun) {
        console.log("\n(dry-run: no writes performed. Re-run without --dry-run to migrate.)");
    } else {
        console.log("\ndone.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
