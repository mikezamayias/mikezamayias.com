# Plan E — App Check enforcement flip (runbook)

**Audience:** Mike (operator running the Firebase Console clicks).
**Branch with prep work merged:** plugin renames + this runbook + the rules
diff live on `feat/plan-e-app-check-prep` (PR opened from main session).
**Spec:** `docs/superpowers/specs/2026-05-11-app-check-rollout.md`.

The flip is sequenced so the public site never breaks. Steps 1–3 are
**purely additive** (provider registered, key shipped, tokens issued — but
nothing yet rejects un-attested calls). Step 4 is the **switch** (Console
enforcement). Step 5 is the **defence-in-depth** (Firestore rules). Step 6
is the **contact-form open** (`messages` write allowed for attested
callers). Each step has a verification step you can run before moving on.

If anything looks wrong at any step, jump to the **Rollback** section at
the bottom — disabling enforcement in the Console restores the
pre-Plan-E behaviour in seconds.

---

## Pre-flight

- [ ] You are signed into the Firebase Console as the owner of
      project `mikezamayias.com`.
- [ ] Your local repo is on `dev`, `bun install` is clean, and
      `bun run build` succeeds.
- [ ] You have the SOPS age key at `~/.config/sops/age/keys.txt`
      (or wherever `SOPS_AGE_KEY_FILE` points) — needed for
      step 2.
- [ ] You can produce a curl that hits `https://mikezamayias.com/`
      (no proxy / VPN that would block reCAPTCHA scoring).

---

## Step 1 — Register reCAPTCHA Enterprise provider

**Console path:**

1. Open <https://console.firebase.google.com>.
2. Pick the `mikezamayias.com` project from the project picker.
3. Left sidebar → **Build** group → **App Check**.
4. Top tab row → **Apps**.
5. Find the Web app row (display name should match the Firebase Web
   SDK config). Click the kebab menu (⋮) at the right end of the row →
   **Manage providers**.
6. In the provider list, find **reCAPTCHA Enterprise** → click
   **Register**.
7. Google will offer to create a reCAPTCHA Enterprise site key for you.
   Accept the default site key it generates (it is project-scoped and
   tied to your billing account — no separate Google Cloud Console
   detour needed).
8. **TTL:** leave the default (1 hour). Tokens auto-refresh client-side
   via `isTokenAutoRefreshEnabled: true` in `useFirebaseAppCheck.ts`.
9. **Copy the site key** — you'll paste it in step 2.

**Verify:**

- The provider row now shows **reCAPTCHA Enterprise — Active** with the
  site key prefix visible. **No enforcement** yet (that's step 4).

---

## Step 2 — Ship the site key via SOPS

The site key is non-secret (it ships to every browser) but lives in
`.env.shared.sops.yaml` so the deploy workflow picks it up alongside the
other public Firebase config keys. This step does NOT touch the
Console — you do it on your laptop.

**Commands (run from the repo root):**

```bash
# 1. Edit the encrypted file. SOPS opens it in $EDITOR (vim by default).
sops .env.shared.sops.yaml

# 2. In the editor, locate the existing NUXT_PUBLIC_RECAPTCHA_SITE_KEY
#    line (it is currently empty / placeholder). Replace its value
#    with the site key from step 1, quoted as a YAML string. Example:
#
#      NUXT_PUBLIC_RECAPTCHA_SITE_KEY: "6Lc...your-key..."
#
#    Save & quit. SOPS will re-encrypt automatically on close.

# 3. Verify the value round-trips correctly.
sops -d --output-type dotenv .env.shared.sops.yaml | grep RECAPTCHA_SITE_KEY

# 4. (Optional, for local dev) regenerate the plain .env so `bun run dev`
#    sees the new value too.
scripts/dotenv-from-sops.sh
```

**Verify:**

- The decrypted dotenv stream contains the key (not empty):

    ```bash
    sops -d --output-type dotenv .env.shared.sops.yaml | grep RECAPTCHA_SITE_KEY
    ```

- `git diff .env.shared.sops.yaml` shows the modified `ENC[…]` block for
  that key only — nothing else.
- Commit the change on `dev` (or whichever branch is shipping):

    ```bash
    git add .env.shared.sops.yaml
    git commit -m "chore(env): set NUXT_PUBLIC_RECAPTCHA_SITE_KEY for Plan E"
    ```

---

## Step 3 — Deploy and watch tokens issue

Push to `prod`. The `Deploy` workflow (self-hosted runner) decrypts the
SOPS file, builds with the new env var, and ships to Firebase Hosting +
Functions.

```bash
git checkout prod && git merge --ff-only dev && git push origin prod
```

Watch the deploy in GitHub Actions. When it finishes (and the
`post-deploy` health-check passes), the production bundle ships a
populated `recaptchaSiteKey`. The App Check plugin
(`plugins/00.app-check.client.ts`) on `/admin` routes will start
initialising. The public contact form (`composables/useContactForm.ts`,
called from the contact page) will also start attaching
`X-Firebase-AppCheck` headers when posting to `/api/contact`.

**Verify in the Console:**

1. Firebase Console → App Check → **Metrics** tab.
2. Wait 5–15 minutes for the first metric points to appear.
3. The graph should show **Verified requests** rising. **Unverified
   requests** should also be visible (everyone who hits the public site
   without the App Check token attached — that includes most visitors,
   because the App Check plugin only initialises on `/admin/**`).
4. Do NOT yet enable enforcement.

**Verify in DevTools (production site):**

1. Open <https://mikezamayias.com/admin> in a fresh incognito window.
2. Sign in.
3. DevTools → Network → filter for `firestore.googleapis.com`. Each
   request row should carry an `X-Firebase-AppCheck` request header
   with a long JWT-ish value. If the header is missing, App Check is
   not initialising — stop and debug before continuing.

**Verify the contact form attaches a token (browser-only):**

`server/api/contact.post.ts:119` reads
`appCheckRequired = Boolean(config.public.recaptchaSiteKey)` —
meaning the moment step 2 + this step's deploy land, the contact
endpoint **immediately** requires an `X-Firebase-AppCheck` header on
every POST. This server-side requirement is independent of step 4's
Firestore enforcement flip.

Curl can't mint an App Check token, so the meaningful verification is:

1. Open `https://mikezamayias.com/contact` in a fresh incognito window.
2. Submit a real form post.
3. DevTools → Network → find the `POST /api/contact` row → confirm
   the **Request Headers** include `X-Firebase-AppCheck` (long JWT).
4. Response should be `200 OK`.
5. Confirm the message landed in the admin `/admin/messages` view.

A tokenless curl is still useful as a negative test — it should now
return `401 Missing App Check token` (was `200` before step 2 shipped
the site key):

```bash
curl -i -X POST https://mikezamayias.com/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"baseline","subject":"baseline"}'
# expect HTTP/2 401 with body "Missing App Check token".
# A 200 here means the deploy didn't pick up the site key — go back
# to step 2 and check the build logs / functions runtime env.
```

**Hold here for at least 1 hour.** Verified-request counts in the App
Check Metrics chart should be steadily climbing for admin sessions and
contact-form submissions. If they're not, enforcement (step 4) will
break the site — do not proceed until tokens are observably flowing.

---

## Step 4 — Enforce App Check on Firestore (the switch)

This is the load-bearing click. After it, any Firestore call that
arrives WITHOUT a valid App Check token gets a permission-denied
response from Google.

**Console path:**

1. Firebase Console → App Check.
2. Top tab row → **APIs** tab.
3. Find the **Cloud Firestore** row → click **Enforce**.
4. Read the confirmation modal carefully. It will warn about the
   enforcement window (5–10 min for full propagation across Google's
   edge).
5. Click **Enforce**.
6. Repeat for **Cloud Storage** (if you use it — the public site
   currently does not upload but `/admin` may; enforce defensively).

**Verify on the public site (within 5 minutes):**

- Hit <https://mikezamayias.com/> in a fresh incognito window. The page
  should render normally because public reads go through the
  server-side endpoints (`server/api/content/*`) which use
  `firebase-admin` and **bypass App Check by design**.
- Hit <https://mikezamayias.com/admin> in the same window, sign in.
  Admin reads should succeed because `00.app-check.client.ts` initialises
  the token before `02.firestore.client.ts` opens any connection (the
  numeric-prefix ordering established in this branch).

**Verify a scraper without a token is blocked:**

```bash
# Direct Firestore REST call without an App Check token —
# should get rejected after enforcement is live.
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents/singletons/hero"
# Expected: 403 (was 200 pre-enforcement).
```

If the public site breaks (white-screen, console errors about Firestore
permission-denied), jump to **Rollback** immediately.

---

## Step 5 — Apply the firestore.rules diff (defence in depth)

The rules diff sits at
`docs/plans/2026-05-25-plan-e-app-check-rules-diff.patch`. It changes
every public-read rule from `if true` to `if request.app != null`, and
opens `messages/{id}` create from `if false` to `if request.app !=
null`. This is the second layer behind step 4's enforcement — even if
someone bypasses the App Check check at the API gateway, the rules
deny.

**Apply and deploy:**

```bash
# From the repo root.
git apply docs/plans/2026-05-25-plan-e-app-check-rules-diff.patch
git diff firebase/firestore.rules   # eyeball the result
git add firebase/firestore.rules
git commit -m "feat(rules): require App Check for public reads + open messages create (Plan E)"

# Deploy ONLY rules first — separate from a code deploy so you can
# rollback the rule change without rolling back the build.
firebase deploy --only firestore:rules --project mikezamayias-com
```

**Verify:**

- `firebase deploy` exits 0 with "Deploy complete".
- Refresh the public site in incognito — still renders (server-side
  reads still bypass rules; client-side reads on `/admin` still carry
  App Check tokens).
- Refresh `/admin` after sign-in — reads succeed.
- Repeat the scraper curl from step 4 — still 403.

---

## Step 6 — Open the contact form (`messages` create)

The diff from step 5 already changed `messages/{id}` `allow create`
from `if false` to `if request.app != null`. After the
`firebase deploy --only firestore:rules` from step 5 completes, the
public contact form can write directly to `/messages` via the App
Check-attested client SDK… **except the current implementation posts
to `/api/contact` (server endpoint) which uses `firebase-admin` and
bypasses rules anyway.** So this step is forward-compatible: any
future client-side write to `/messages` (with App Check attached) will
work, but no behavioural change ships today.

**Verify contact-form end-to-end:**

```bash
# This should succeed AND produce a row in /messages.
# The server endpoint validates the App Check token from the
# X-Firebase-AppCheck header (see server/api/contact.post.ts:119),
# rejects with 401 if missing once recaptchaSiteKey is set.

# From a real browser (DevTools → console on https://mikezamayias.com/contact):
#   1. Fill the form, click Send.
#   2. Network tab → /api/contact request should have
#      X-Firebase-AppCheck header. Response should be 200.
#   3. Firebase Console → Firestore → messages collection → new doc.
```

If the form returns 401 / "Missing App Check token", the
`useFirebaseAppCheck` composable failed to initialise — the browser
console will show:

```
[codex] App Check disabled — NUXT_PUBLIC_RECAPTCHA_SITE_KEY not set
```

That means step 2 didn't ship the key to the public bundle (check the
deploy logs and re-run `sops .env.shared.sops.yaml`).

---

## Rollback

The full Plan E rollout has three independent layers; each rolls back
on its own. Pick the layer matching the failure mode.

### Layer A — Disable enforcement only (step 4 rollback)

Fastest, one-click. Use when enforcement is denying legitimate clients
(e.g. token issuance is flaky) but the rule tightening (step 5) and
site-key shipping (step 2) are fine.

1. Firebase Console → App Check → **APIs** tab.
2. **Cloud Firestore** row → click **Unenforce**.
3. (If you also enforced Storage) repeat for **Cloud Storage**.

Propagation is 1–5 min.

**Verification (depends on whether step 5 rules are still in place):**

- **If step 5 has NOT been applied yet** (rules still permissive): the
  scraper curl from step 4 should return 200 again — the rule layer
  permits unattested reads when not gated.
- **If step 5 HAS been applied** (rules require `request.app != null`):
  the scraper curl will still return 403 because the _rules_ are
  denying the read, not the enforcement layer. That's correct — both
  layers must permit. To restore unattested reads here, revert the
  rules too (Layer B).

### Layer B — Revert the rules (step 5 rollback)

Use when the rule tightening caused a regression but enforcement +
site key are fine.

```bash
git log --oneline -- firebase/firestore.rules | head -5
# Find the rules-change commit from step 5.
git revert <commit-sha>
firebase deploy --only firestore:rules --project mikezamayias-com
```

After deploy, scraper curl returns 200 if enforcement is also off
(Layer A). If enforcement is still on, curl returns
`PERMISSION_DENIED` because of the App Check requirement at the
Google API gateway — that's expected and correct.

### Layer C — Full back-out (steps 2/3/4/5 all reverted)

Use when you want the site back to its pre-Plan-E baseline (stub
plugin no-op, no enforcement, no rule tightening).

```bash
sops .env.shared.sops.yaml
# Clear NUXT_PUBLIC_RECAPTCHA_SITE_KEY back to empty string.
git commit -am "revert(env): unset NUXT_PUBLIC_RECAPTCHA_SITE_KEY"
git push origin prod
```

Then complete Layer A (unenforce) + Layer B (revert rules) above.

The stub plugin behaviour returns automatically — `useFirebaseAppCheck`
short-circuits to `null` when the key is empty, the contact endpoint's
`appCheckRequired` flag (`server/api/contact.post.ts:119`) goes false,
and no App Check verification happens server-side.

---

## What the prep branch already did (context)

The `feat/plan-e-app-check-prep` branch did the safe-to-ship code work
before this runbook. You don't need to re-do any of it:

- Renamed `plugins/01.auth.client.ts` → `plugins/03.auth.client.ts`
  so the load order is `00.app-check` → `02.firestore` → `03.auth`.
  This matters once enforcement flips: the App Check token must be
  initialised by `00.*` before `02.*` opens any Firestore connection.
- Updated the stale top-of-file comments in
  `00.app-check.client.ts`, `02.firestore.client.ts`, and
  `03.auth.client.ts` to call out the ordering contract.
- Note: there is NO `01.firebase.client.ts` to rename — that file was
  deleted in commit `8849349` ("perf(bundle): drop nuxt-vuefire"). Firebase
  app init now lives in `composables/useFirebaseApp.ts` (lazy singleton) and
  runs inside each admin-gated plugin via `await useFirebaseApp(publicConfig)`
  on first use. The original 4-file rename described in the spec is obsolete;
  the effective rename was just the auth file.
- The rules diff lives untouched at
  `docs/plans/2026-05-25-plan-e-app-check-rules-diff.patch`. The
  branch does NOT modify `firebase/firestore.rules` itself — that
  happens in step 5 above.
