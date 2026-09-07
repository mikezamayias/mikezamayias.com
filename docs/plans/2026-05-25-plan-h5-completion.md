# Plan H.5 completion — legacy Firestore collections dropped

Date: 2026-05-25 (day 5 of the 7-day soak — operator override)
Operator: Mike
Branch: `chore/plan-h.5-cleanup`

## Context

Plan H series — see [`2026-05-22-plan-h5-precheck.md`](./2026-05-22-plan-h5-precheck.md) for the precheck dry-run + rollout plan. H.5 was scheduled for 2026-05-27 (soak elapsed day 7); operator chose to run 2 days early after confirming the dry-run state hadn't drifted.

## Drop output

```text
$ bun run drop:legacy -- --soak-elapsed --i-mean-it

dropping legacy Firestore collections — mode: DESTRUCTIVE DROP
project: personal-website-v1-f775a
soak: --soak-elapsed asserted by operator

=== /projects/* DROP (canonical: /work) ===
  legacy:       3 docs in /projects
  canonical:    5 docs in /work
  deleted 3/3

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

done. Follow-up: remove the Plan H.1 dual-read shim + drop legacy paths from firestore.rules.
```

Preservation invariant held on every pair (`canonicalCount ≥ legacyCount`). No data loss — all 3 docs that lived under `/projects/` were copied into `/work/` during H.2 migrate; the drop removed the originals.

## Follow-up code cleanup — already done

The script's closing line ("remove the Plan H.1 dual-read shim + drop legacy paths from firestore.rules") was a forward-looking reminder written when H.5 was first prepped. By 2026-05-25 both items are already in tree, landed by prior plans:

- **H.1 dual-read shim** — removed by Plan H.3 (`feat(plan-h.3): flip consumers to canonical work/writing/roadmap`, PR #112 / commit `11b9b4a`, 2026-05-20). Verified absent via `grep -rln "dual.read\|fallback.*work\|fallback.*writing" server/ composables/ utils/ firebase/`. Only matches today are the historical comment in `server/api/content/home.get.ts:58` ("The dual-read shim from H.1 is gone…") and doc-comments inside `scripts/migrate-collections.ts` + `scripts/drop-legacy-collections.ts` describing the migration story.

- **Legacy `match` blocks in `firebase/firestore.rules`** — never carried `match /projects/`, `match /posts/`, or `match /tasks/` blocks in the rules file. H.3 flipped consumers to canonical names AND replaced the rule blocks in the same PR. Current rules cover only the canonical surfaces: `work`, `writing`, `roadmap`, `singletons`, `profile`, `contact`, `social`, `experience`, `skills`, `education`, `certifications`, `settings`, `messages`, `audit`.

So this PR is **docs-only**: an audit trail for the destructive run, plus the confirmation that the closing reminder in the drop script doesn't translate into any pending code work.

## Verification commands (run after this PR merges)

```bash
# Confirm legacy collections stay empty (catches any out-of-band writes
# that might've slipped through during the drop window).
gcloud firestore export-collection-counts \
  --project=personal-website-v1-f775a \
  --collection-ids=projects,posts,tasks
# Expected: 0 0 0
```

```bash
# Re-run the dry-run; expect every pair to report "legacy empty".
bun run drop:legacy:dry
```

## What changed in prod

Firestore writes (one-shot, complete at 2026-05-25):

- 3 doc deletes on `projects/*` (legacy work entries).
- 0 doc deletes on `posts/*` (already empty).
- 0 doc deletes on `tasks/*` (already empty).

No code deploy, no firestore.rules deploy, no functions deploy needed.

## Open items closed

- [x] Plan H.5: destructive drop after soak (run 2 days early per operator authorization).
- [x] Plan H.5: post-drop cleanup PR (no code changes — verified prior plans handled it).
