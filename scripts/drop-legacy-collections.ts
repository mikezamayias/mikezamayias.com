// scripts/drop-legacy-collections.ts
//
// Plan H.5 — drop the legacy `projects` / `posts` / `tasks` collections
// after the 7-day soak on the canonical `work` / `writing` / `roadmap`
// names.
//
// SAFETY:
//   This script is a one-way, destructive operation. It deletes every
//   document under each legacy collection. There is no undo. The
//   preflight below refuses to run unless:
//     (a) Every destination collection has at least as many docs as
//         the source (the H.2 migration's success invariant), AND
//     (b) The operator passes `--i-mean-it` against the production
//         project, AND
//     (c) The operator passes `--soak-elapsed` to assert the 7-day
//         canonical-only window has actually elapsed (i.e. no read
//         from `projects` / `posts` / `tasks` in production logs for
//         7+ days). The flag is an honor-system gate — Firestore
//         doesn't expose a read-history we can introspect — but the
//         explicit acknowledgement keeps an autopilot run from
//         dropping the soak window.
//
// Run:
//   infisical run --env=prod -- bun run scripts/drop-legacy-collections.ts \
//     [--dry-run] [--soak-elapsed] [--i-mean-it]
//
// Flags:
//   --dry-run        Report what would be deleted without writing.
//   --soak-elapsed   Operator asserts 7-day canonical-only soak passed.
//   --i-mean-it      Required for any actual writes against PROD.
//
// Sequence:
//   projects/* — DROPPED (canonical: work)
//   posts/*    — DROPPED (canonical: writing)
//   tasks/*    — DROPPED (canonical: roadmap)
//
// Post-conditions:
//   * Plan H.1 dual-read shim becomes dead code; remove it in a
//     follow-up commit so the codebase no longer pretends the legacy
//     names exist.
//   * Firestore rules can drop the legacy collection paths (no
//     reads/writes will land there ever again).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_ACCOUNT = resolve(__dirname, "service-account.json");
const PROD_PROJECT_ID = "personal-website-v1-f775a";

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT, "utf-8")) as { project_id: string };
initializeApp({ credential: cert(SERVICE_ACCOUNT) });
const db = getFirestore();

const dryRun = process.argv.includes("--dry-run");
const soakElapsed = process.argv.includes("--soak-elapsed");
const iMeanIt = process.argv.includes("--i-mean-it");

if (!dryRun && sa.project_id === PROD_PROJECT_ID && !iMeanIt) {
    console.error(
        `REFUSING: destructive drop against production project '${sa.project_id}' requires --i-mean-it. Use --dry-run to preview safely.`
    );
    process.exit(2);
}

if (!dryRun && !soakElapsed) {
    console.error(
        "REFUSING: --soak-elapsed flag missing. The 7-day canonical-only window must have elapsed before legacy collections can be dropped. Pass --soak-elapsed to acknowledge the soak passed, or use --dry-run to preview."
    );
    process.exit(2);
}

interface DropPair {
    legacy: string;
    canonical: string;
}

const PAIRS: DropPair[] = [
    { legacy: "projects", canonical: "work" },
    { legacy: "posts", canonical: "writing" },
    { legacy: "tasks", canonical: "roadmap" },
];

interface DropStats {
    legacyCountBefore: number;
    canonicalCount: number;
    deleted: number;
    legacyCountAfter: number;
}

// Firestore admin SDK caps batched writes at 500 ops. Deleting one
// collection in chunks of 400 leaves headroom for any field-converter
// side effects without ever hitting the cap.
const BATCH_SIZE = 400;

async function dropPair(pair: DropPair, db: Firestore): Promise<DropStats> {
    console.log(`\n=== /${pair.legacy}/* DROP (canonical: /${pair.canonical}) ===`);

    const [legacySnap, canonicalSnap] = await Promise.all([
        db.collection(pair.legacy).get(),
        db.collection(pair.canonical).get(),
    ]);

    const stats: DropStats = {
        legacyCountBefore: legacySnap.size,
        canonicalCount: canonicalSnap.size,
        deleted: 0,
        legacyCountAfter: 0,
    };

    console.log(
        `  legacy:    ${stats.legacyCountBefore.toString().padStart(4)} docs in /${pair.legacy}`
    );
    console.log(
        `  canonical: ${stats.canonicalCount.toString().padStart(4)} docs in /${pair.canonical}`
    );

    // Preservation invariant — refuse to drop legacy if the canonical
    // side has fewer docs than the legacy side. Migration must have
    // succeeded first.
    if (stats.canonicalCount < stats.legacyCountBefore) {
        console.error(
            `  ✗ ABORT: canonical /${pair.canonical} has ${stats.canonicalCount} docs but legacy /${pair.legacy} has ${stats.legacyCountBefore}. Re-run scripts/migrate-collections.ts before dropping.`
        );
        process.exit(3);
    }

    if (legacySnap.empty) {
        console.log(`  (legacy empty — nothing to drop)`);
        return stats;
    }

    if (dryRun) {
        console.log(
            `  would delete ${stats.legacyCountBefore} docs from /${pair.legacy} (dry-run)`
        );
        stats.deleted = stats.legacyCountBefore;
        // Predict the post-drop state without writing. Previously this set
        // `legacyCountAfter = legacyCountBefore`, which made the final
        // summary incorrectly print "residual=N ✗ RESIDUAL DOCS" for every
        // pair with legacy docs — even though a real run would leave zero
        // residual. Set to 0 so dry-run summaries match the destructive
        // run's expected outcome.
        stats.legacyCountAfter = 0;
        return stats;
    }

    // Chunked batched delete. Each chunk is one batched write that
    // either fully commits or fully rolls back — no partial-drop
    // state where half a collection vanished.
    const docs = legacySnap.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const doc of chunk) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        stats.deleted += chunk.length;
        console.log(`  deleted ${stats.deleted}/${stats.legacyCountBefore}`);
    }

    const legacySnapAfter = await db.collection(pair.legacy).get();
    stats.legacyCountAfter = legacySnapAfter.size;

    if (stats.legacyCountAfter !== 0) {
        console.error(
            `  ✗ /${pair.legacy} still has ${stats.legacyCountAfter} docs after drop. New writes during the drop window? Re-run to clean up.`
        );
    }

    return stats;
}

async function main() {
    const mode = dryRun ? "DRY RUN" : "DESTRUCTIVE DROP";
    console.log(`dropping legacy Firestore collections — mode: ${mode}`);
    console.log(`project: ${sa.project_id}`);
    if (soakElapsed) console.log(`soak: --soak-elapsed asserted by operator`);

    const results: Array<{ pair: DropPair; stats: DropStats }> = [];
    for (const pair of PAIRS) {
        const stats = await dropPair(pair, db);
        results.push({ pair, stats });
    }

    console.log("\n=== summary ===");
    for (const { pair, stats } of results) {
        const status = stats.legacyCountAfter === 0 ? "✓" : "✗ RESIDUAL DOCS";
        console.log(
            `  ${pair.legacy} → ∅: deleted=${stats.deleted}, residual=${stats.legacyCountAfter}, canonical=${stats.canonicalCount} ${status}`
        );
    }

    if (dryRun) {
        console.log(
            "\n(dry-run: no writes performed. Re-run without --dry-run when the soak has elapsed.)"
        );
    } else {
        console.log(
            "\ndone. Follow-up: remove the Plan H.1 dual-read shim + drop legacy paths from firestore.rules."
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
