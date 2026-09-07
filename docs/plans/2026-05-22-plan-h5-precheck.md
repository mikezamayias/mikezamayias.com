# Plan H.5 precheck — drop legacy Firestore collections

Date: 2026-05-22 (day 2 of the 7-day soak window)
Branch: `chore/plan-h.5-precheck`
Author: Mike (with Claude)

## Context

Plan H series rename: legacy collections (`projects`, `posts`, `tasks`) → canonical (`work`, `writing`, `roadmap`).

- **H.1** — Dual-read shim landed via PR #110 (2026-05-19).
- **H.2** — `scripts/migrate-collections.ts` copied every legacy doc into the canonical side (PR #111).
- **H.3** — Public + admin consumers flipped to canonical names only (PR #112, merged **2026-05-20T14:18:35Z**).
- **H.4** — Admin Codex restyle pass (PR #113, eventually subsumed into Plan I commits).
- **H.5** — Destructive drop of the legacy collections. **This document.**

The 7-day soak after H.3 is intended to give Firestore's read-traffic distribution a chance to settle on the canonical names so any forgotten reader (legacy admin endpoint, third-party crawler, cached bookmark) trips a missing-collection error before we delete the underlying docs.

**Soak end date: 2026-05-27** (2026-05-20 + 7 days). Today is **2026-05-22** — day 2. Destructive drop must wait.

## Today's precheck dry-run

```bash
bun run drop:legacy:dry
```

Output (sanitized, run at 2026-05-22T15:34Z):

```
dropping legacy Firestore collections — mode: DRY RUN
project: personal-website-v1-f775a

=== /projects/* DROP (canonical: /work) ===
  legacy:       3 docs in /projects
  canonical:    5 docs in /work
  would delete 3 docs from /projects (dry-run)

=== /posts/* DROP (canonical: /writing) ===
  legacy:       0 docs in /posts
  canonical:    2 docs in /writing
  (legacy empty — nothing to drop)

=== /tasks/* DROP (canonical: /roadmap) ===
  legacy:       0 docs in /tasks
  canonical:    4 docs in /roadmap
  (legacy empty — nothing to drop)

=== summary ===
  projects → ∅: deleted=3, residual=0, canonical=5 ✓
  posts → ∅: deleted=0, residual=0, canonical=2 ✓
  tasks → ∅: deleted=0, residual=0, canonical=4 ✓
```

### Interpretation

- **`projects/*` (3 docs)** is the only legacy collection that still holds data. H.2's migrate copied them into `work/*`; H.5 will delete the originals.
- **`posts/*` and `tasks/*` are already empty** — the canonical side was the only target for new writes after H.3 flipped, and no admin user touched the legacy paths.
- **Canonical sides ≥ legacy on every pair**, so the script's preservation invariant (`canonicalCount < legacyCountBefore ⇒ ABORT`) passes for all three.

### Script cosmetic fix landed in this PR

The dry-run summary previously printed `residual=N ✗ RESIDUAL DOCS` for any pair with legacy docs because the predicted post-drop count was being set to `legacyCountBefore` instead of `0`. Fixed in `scripts/drop-legacy-collections.ts` so the dry-run preview matches what the destructive run would actually leave behind.

## Rollout sequence

| Step | When                    | Operator action                                                                                                                                                                                                                                                                                 |
| ---- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 2026-05-22 (today)      | Land this precheck PR + dry-run output.                                                                                                                                                                                                                                                         |
| 2    | 2026-05-23 → 2026-05-26 | Soak continues. Watch GCP Logs Explorer for any read against `projects/*`, `posts/*`, `tasks/*` — query: `resource.type="firestore_database" AND protoPayload.resourceName:("/documents/projects/" OR "/documents/posts/" OR "/documents/tasks/")`. Zero matches over the window = green-light. |
| 3    | 2026-05-27 (day 7+)     | Re-run `bun run drop:legacy:dry` to confirm counts haven't drifted.                                                                                                                                                                                                                             |
| 4    | 2026-05-27              | Execute `bun run drop:legacy -- --soak-elapsed --i-mean-it`. Capture the output for post-mortem.                                                                                                                                                                                                |
| 5    | Same day                | Verify via `infisical run --env=prod -- node -e ...` or the Firebase Console that the 3 legacy collections show 0 docs each.                                                                                                                                                                    |
| 6    | Same day                | Open the post-drop cleanup PR: remove the H.1 dual-read shim (anywhere `serverless/api/content/*` falls back to legacy names) + drop the legacy `match /projects/...`, `match /posts/...`, `match /tasks/...` blocks from `firebase/firestore.rules`. Deploy rules.                             |

## Why three flags are required for the destructive run

The script refuses to run with destructive semantics unless ALL of:

1. `--dry-run` is **absent** (default mode = destructive)
2. `--soak-elapsed` is **present** (honor-system assertion that the 7-day window passed — Firestore doesn't expose a queryable read-history we can introspect ourselves)
3. `--i-mean-it` is **present** when the service account points at `personal-website-v1-f775a` (the prod project ID hard-coded in the script)

Forgetting any of those = `process.exit(2)` with a message that names the missing flag.

## Recovery path

- The migration in H.2 was COPY (not move). Canonical sides already hold every doc that was ever in the legacy paths.
- If the destructive run drops something that shouldn't have been dropped, the canonical-side copy is still there. Restoring the legacy path would mean re-running migrate-collections with the legacy → canonical mapping reversed.
- Firebase point-in-time recovery is available for the project (7-day window). Last resort.

## Why not skip the soak entirely

- `projects/*` is the only collection with residual data, and its 3 docs are admin-edited records (work entries). If an admin still has an unbroken muscle-memory bookmark for the legacy admin endpoint, they'd hit a 404 instead of a stale read. The soak makes that signal visible.
- For `posts/*` and `tasks/*` (already empty), the soak is moot — could drop them today. But running the destructive script piecemeal would either need new flags or a partial-pair config. Cleaner to do all three atomically on day 7.
