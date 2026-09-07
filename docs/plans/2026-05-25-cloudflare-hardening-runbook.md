# Cloudflare Hardening Runbook — mikezamayias.com

Click-by-click runbook for the manual Cloudflare settings spec'd in
`docs/superpowers/specs/2026-05-11-cloudflare-hardening.md`. Read top
to bottom, do each block in order, run the verification curl after every
change, stop at the first surprise.

Spec called for: 4xx < 10%, 5xx < 1%, cache-hit > 40% within 48h of
landing all sections.

---

## 0. Audit snapshot (today, before any changes)

Captured 2026-05-25 against live prod from a residential IP via Node fetch.

| Probe                                                                                | Status | `cf-cache-status` | `cache-control` (origin)                                         | Note                                                                                       |
| ------------------------------------------------------------------------------------ | ------ | ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /`                                                                              | 200    | `DYNAMIC`         | `max-age=3600`                                                   | Cloudflare bypasses HTML. Fastly (`x-served-by: cache-vie6379-VIE`) absorbs the cache hit. |
| `GET /` ×8 burst                                                                     | 200×8  | `DYNAMIC`         | —                                                                | No rate-limit fired. No bot challenge.                                                     |
| `GET /` with `User-Agent: curl/7.84.0`                                               | 200    | `DYNAMIC`         | —                                                                | Bot Fight Mode is OFF.                                                                     |
| `GET /en`                                                                            | 404    | `DYNAMIC`         | `no-cache`                                                       | Locale prefix not deployed; expected (50 commits behind dev).                              |
| `GET /_nuxt/entry.B0_82Gbg.css`                                                      | 200    | `HIT`             | `public, max-age=31536000, immutable`                            | Static assets DO cache at Cloudflare.                                                      |
| `HEAD /_payload.json`                                                                | 200    | `DYNAMIC`         | `max-age=3600`                                                   | Fastly cached, Cloudflare not.                                                             |
| `HEAD /admin`                                                                        | 200    | `DYNAMIC`         | `private`                                                        | Admin shell is reachable; needs Page Rule guard.                                           |
| `HEAD /api/admin/anything`                                                           | 404    | `DYNAMIC`         | `no-cache`                                                       | Admin API surface not deployed yet.                                                        |
| `HEAD /api/content/{home,posts,projects,tasks,work,writing,roadmap,singletons/hero}` | 404×8  | `DYNAMIC`         | `no-cache`                                                       | None of the Plan B Firestore content APIs exist in current prod.                           |
| `HEAD /api/og/{post,writing}/hello-world`                                            | 404    | `DYNAMIC`         | `no-cache`                                                       | OG image route not deployed.                                                               |
| `HEAD /robots.txt`                                                                   | 200    | `REVALIDATED`     | `max-age=3600`                                                   | Fastly serving.                                                                            |
| `HEAD /sitemap.xml`                                                                  | 200    | `DYNAMIC`         | `public, max-age=600, s-maxage=600, stale-while-revalidate=3600` | Origin sets correct cache-control. Cloudflare not honouring.                               |

Verdict: current prod is the **static prerendered build** — none of the
spec's API targets exist yet. Cache rules and rate-limit rules that
match `/api/content/*` are no-ops until the next deploy of `dev`.
Cloudflare is in front for SSL + WAF only; cache layer is Firebase
Hosting's built-in Fastly CDN.

This runbook still configures the spec's rules now — they cost nothing
on the free tier and they'll be live the moment the Cloud Functions
deploy lands.

---

## 1. Bot Fight Mode — spec §1

**Current state:** OFF. `curl/7.84.0` and empty-UA requests both hit
origin with 200. No challenge cookie issued.

**Click path:** Cloudflare Dashboard → Security → Settings → filter
**Bot traffic** → **Bot Fight Mode**.

- [ ] **Bot Fight Mode** → toggle ON.

> **Free-tier scope.** Bot Fight Mode is a single binary toggle on the
> free plan. JavaScript Detections is auto-enabled and cannot be
> disabled for BFM customers (no toggle in the dashboard). The
> granular **"Definitely Automated"** and **"Verified Bot"** actions
> belong to **Super Bot Fight Mode** (Pro plan and above) — if/when
> the zone upgrades, disable BFM first then enable Super BFM and
> configure those actions. For now: enable BFM and move on.

### Verify Bot Fight Mode

```bash
curl -sI -A 'curl/7.84.0' https://mikezamayias.com/ | head -5
# Expect: HTTP/2 403   OR   HTTP/2 200 with cf-mitigated header.
# If still HTTP/2 200 with no mitigation header → toggle didn't save.
```

```bash
curl -sI -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15' https://mikezamayias.com/ | head -5
# Expect: HTTP/2 200 (real browser UA still passes)
```

**Expected after enabling:** ~50% drop in Cloudflare request volume,
~70% drop in 4xx — that's where the 57% 4xx comes from.

---

## 2. Cache Rules — spec §2

**Current state:** Cloudflare is not caching the HTML (`cf-cache-status:
DYNAMIC` on 8 consecutive HEADs). Static `/_nuxt/*` assets already
cache to `HIT`. Origin `Cache-Control` headers exist on `/sitemap.xml`
(`s-maxage=600, stale-while-revalidate=3600`) but Cloudflare is
ignoring them.

The Plan B `/api/content/*` endpoints don't exist on prod yet — these
rules are pre-positioned for the next deploy.

**Click path:** Cloudflare Dashboard → Caching → Cache Rules → Create rule.

### Rule 1 — Edge cache `/api/content/*`

- [ ] Rule name: `Edge cache /api/content/*`
- [ ] If: `URI Path` `wildcard` `/api/content/*`
- [ ] Then:
    - Cache eligibility → **Eligible for cache**
    - Edge TTL → **Use cache-control header if present, bypass cache if not**
    - Browser TTL → **Respect origin**
- [ ] Deploy

#### Verify Rule 1

```bash
# Warm twice; second hit should be cf-cache-status: HIT.
curl -sI https://mikezamayias.com/api/content/singletons/hero | grep -iE 'cf-cache|cache-control'
curl -sI https://mikezamayias.com/api/content/singletons/hero | grep -iE 'cf-cache|cache-control'
# Expect on 2nd hit: cf-cache-status: HIT, age: <number>
```

### Rule 2 — Edge cache `/api/render/writing/*`

(Spec said `/api/render/post/*`; the codebase uses `/writing/` since the
H.3 rename. Configure the current path.)

- [ ] Rule name: `Edge cache /api/render/writing/*`
- [ ] If: `URI Path` `wildcard` `/api/render/writing/*`
- [ ] Then:
    - Cache eligibility → **Eligible for cache**
    - Edge TTL → **Override origin** → **300 seconds** (render endpoints
      don't always emit `Cache-Control`; 5min default is the spec
      fallback)
    - Browser TTL → **Respect origin**
- [ ] Deploy

#### Verify Rule 2

```bash
# Replace <slug> with any published writing slug after next deploy.
curl -sI https://mikezamayias.com/api/render/writing/<slug> | grep -iE 'cf-cache|cache-control'
curl -sI https://mikezamayias.com/api/render/writing/<slug> | grep -iE 'cf-cache|cache-control'
# Expect on 2nd hit: cf-cache-status: HIT, age: <number>
```

### 2a — Admin-bypass `no-store` enforcement (server middleware)

**Server middleware audited:** `server/middleware/cache-headers.ts` lines
71–85 force `Cache-Control: no-store` on:

- `/api/content/work`
- `/api/content/writing`
- `/api/content/roadmap`

**Spec drift:** the spec text still lists the legacy names `posts`,
`projects`, `tasks`. The middleware was updated to match the H.3 rename
(`writing`) and the broader content taxonomy (`work`, `roadmap`).
**Do not edit the middleware** to match the spec — the middleware is
correct, the spec is stale. Action: update the spec text in a follow-up
PR, not in this runbook.

The middleware also forces `no-store` whenever a `Bearer` token is
present (line 64–69) regardless of path. That's the real cache-poison
guard — the per-path block is the belt to that suspenders.

#### Verify §2a (admin-bypass no-store)

```bash
for p in work writing roadmap; do
  echo "--- /api/content/$p ---"
  curl -sI "https://mikezamayias.com/api/content/$p" | grep -iE 'cache-control|cf-cache'
done
# Expect: cache-control: no-store on all three. cf-cache-status: BYPASS (or DYNAMIC).
```

---

## 3. WAF — spec §3

**Current state:** unverifiable from client (TLS fingerprint can't be
faked from curl). Spec rationale (3.63k unknown SSL connections in Plan
B+) still holds.

**Click path:** Cloudflare Dashboard → Security → WAF → Custom Rules → Create rule.

- [ ] Rule name: `Block unknown SSL clients`
- [ ] Expression (use the Expression Editor → Edit expression):

    ```
    (ssl.client_protocol eq "" or ssl.client_protocol eq "unknown")
    ```

- [ ] Action: **Block**
- [ ] Deploy

**Verify:** there is no clean client-side check. Watch the WAF Events
dashboard for 24h after deploy — expect the same scale of blocked
requests (~3.6k/day) as the Plan B+ analytics flagged.

---

## 4. Page Rules — spec §4 (free tier: 3 active max — using 2)

**Current state:** `/admin` returns 200 with `cache-control: private`
from origin. `/api/og/*` 404s today (route not deployed) so the rule is
a no-op until next deploy.

**Click path:** Cloudflare Dashboard → Rules → Page Rules → Create Page Rule.

### Page Rule A — admin bypass + high security

- [ ] URL: `*mikezamayias.com/api/admin/*` (leading `*` covers both
      `mikezamayias.com` and any future `www.` host)
- [ ] Settings:
    - Cache Level → **Bypass**
    - Security Level → **High**
- [ ] Save and Deploy

(Cover both the admin API and the admin UI under one rule by also adding
a Page Rule for `*mikezamayias.com/admin*` if a slot remains. The spec
only called for `/api/admin/*` — start there.)

### Page Rule B — OG image edge cache

- [ ] URL: `*mikezamayias.com/api/og/*` (leading `*` covers both
      `mikezamayias.com` and any future `www.` host)
- [ ] Settings:
    - Cache Level → **Cache Everything**
    - Edge Cache TTL → **1 hour**
- [ ] Save and Deploy

#### Verify Page Rule B

```bash
# OG image: warm twice; second hit cf-cache-status should be HIT.
curl -sI https://mikezamayias.com/api/og/writing/hello-world | grep -iE 'cf-cache|cache-control'
curl -sI https://mikezamayias.com/api/og/writing/hello-world | grep -iE 'cf-cache|cache-control'
```

```bash
# Admin API: must never cache.
curl -sI https://mikezamayias.com/api/admin/ping | grep -iE 'cf-cache|cache-control'
# Expect: cf-cache-status: BYPASS, cache-control: no-store (from origin middleware)
```

---

## 5. Rate Limiting — spec §5

**Current state:** OFF. 8 rapid HEAD requests to `/` from one IP all
returned 200 within ~5s; no 429.

**Click path:** Cloudflare Dashboard → Security → WAF → Rate limiting
rules → Create rule.

- [ ] Rule name: `Anonymous public API quota`
- [ ] Expression (Expression Editor → Edit expression):

    ```
    (starts_with(http.request.uri.path, "/api/content/") and not starts_with(any(http.request.headers["authorization"][*]), "Bearer "))
    ```

    (The `any(...[*])` form guards against the array-index-out-of-bounds
    case when the `Authorization` header is missing — accessing `[0]`
    on an absent header produces a "missing value" in Cloudflare's
    rules language, which makes `starts_with(...)` return false and
    `not false` = true, so an unauthenticated request would correctly
    fall into the rule. Using `any(...[*])` makes that explicit and
    survives future syntax tightening.)

- [ ] Characteristics: **IP**
- [ ] Period: **1 minute**
- [ ] Threshold: **60 requests**
- [ ] Action: **Block**
- [ ] Duration: **1 minute**
- [ ] Deploy

### Verify rate limit

```bash
# Hammer an anonymous content endpoint. ~62nd request should 429.
for i in $(seq 1 70); do
  s=$(curl -s -o /dev/null -w '%{http_code}' https://mikezamayias.com/api/content/singletons/hero)
  echo "$i: $s"
done | tail -20
# Expect: a stretch of 200/304 then a sequence of 429s.
```

In-app rate-limit (Plan B+) is 30/min/IP. Cloudflare's 60/min is the
backstop — fires before the Cloud Function spins up, saving cold-start
budget on a hostile burst.

---

## 6. 5xx triage — spec §6

**Current state:** can't reproduce from prod (the affected endpoints
404). Sentry tag `firestoreErrorCode` and `X-{Render,OG}-Degraded`
headers are wired in `server/utils/firebase.ts`, `server/api/og/[type]/[slug].get.ts`,
and `server/api/render/writing/[slug].get.ts`. They become useful the
moment the next prod deploy lands.

After the next prod deploy is live for ≥24h:

- [ ] Sentry → filter issues with tag `firestoreErrorCode`
- [ ] Group by code:
    - `unavailable` / `deadline-exceeded` → transient. Increase per-route
      `fetchWithTimeout` ceiling from 4s → 6s on `/api/content/home` if
      the count is non-trivial.
    - `permission-denied` → real bug. Triage the rule that fired.
- [ ] Cloud Function logs → look for `429` from concurrency cap on the
      gen2 function. If real human traffic is hitting the cap:
    - Bump `maxInstances` 1 → 2 in `nuxt.config.ts`
    - Move the in-app rate-limit bucket to Firestore-backed
- [ ] Cold-start: if SSR cold starts dominate the 5xx volume, add
      `minInstances: 1` to the SSR function only (gen2 supports
      per-function min instances).

---

## 7. Final verification (≥24h after all changes deployed)

1. [ ] `curl -s https://mikezamayias.com/ | grep -o '__NUXT_DATA__'`
       returns a match — page still hydrates.
2. [ ] `curl -s 'https://mikezamayias.com/api/content/home?locale=en' | jq '.locale'`
       returns `"en"` — content API up.
3. [ ] Cloudflare Analytics (24h window):
    - 4xx rate < 10% (was 57%)
    - 5xx rate < 1% (was 4%)
    - Cache hit rate > 40% (was 1.25%)
4. [ ] If thresholds missed at 48h: re-run §0 audit. The most likely
       drift is Cloudflare not honoring origin `Cache-Control` because
       the Cache Rule isn't matching the path. Check `cf-cache-status`
       on a known cacheable route; if `DYNAMIC`, the rule didn't bind.

---

## Notes the spec doesn't cover

1. **Fastly is in the path.** Firebase Hosting uses Fastly as its
   default CDN (`x-served-by`, `x-cache`). Cloudflare → Fastly → Cloud
   Function. The 1.25% Cloudflare cache-hit rate is partly an artifact
   of Fastly absorbing most hits before Cloudflare's cache layer sees a
   second request. Once **Rule 1 — Edge cache `/api/content/*`** binds,
   Cloudflare will start caching ahead of Fastly and the numbers will
   diverge — that's expected, not a regression.

2. **`/en` returns 404 today.** Locale routing isn't deployed on prod.
   No action — landing the next prod deploy fixes this without runbook
   work.

3. **Spec ↔ middleware path-name drift.** Spec §2a lists
   `posts/projects/tasks`; code lists `work/writing/roadmap`. Code wins.
   Open a follow-up PR to update the spec text.
