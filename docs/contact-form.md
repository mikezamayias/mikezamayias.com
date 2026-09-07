# Contact Form — Architecture & Documentation

## Overview

The contact form uses a **Nitro server route** (`server/api/contact.post.ts`) deployed as part of the existing Firebase SSR function. It replaces the previous FormSubmit.co dependency with a fully self-hosted solution.

**Key benefits:**

- Full data ownership (submissions stored in Firestore)
- Multi-layer spam protection (honeypot, rate limiting, optional reCAPTCHA, App Check when configured)
- Email notifications via Resend
- Zero additional deployment cost (runs on the existing SSR function)

## How It Works

```text
User fills form → clicks "Send Message"
       │
       ▼
Client-side validation (useContactForm.ts)
       │ (name 2-100 chars, valid email ≤200, subject 3-160 chars, message 10-5000 chars)
       │
       ▼
POST /api/contact  (JSON payload)
       │
       ▼
┌─────────────────────────────────────────┐
│  Nitro Server Route (contact.post.ts)   │
│                                         │
│  1. Honeypot check (_honey field)       │
│     └─ If filled → return 200 (silent)  │
│                                         │
│  2. Server-side validation              │
│     └─ Same rules as client + max len   │
│                                         │
│  3. App Check verification             │
│     └─ Required when site key is set    │
│                                         │
│  4. Global daily cap (50/day)           │
│     └─ Prevents cost attacks            │
│                                         │
│  5. IP rate limiting (Firestore tx)     │
│     └─ 1 request/minute per IP hash     │
│     └─ Atomic via Firestore transaction │
│                                         │
│  6. reCAPTCHA v3 (optional)             │
│     └─ Only if token provided + secret  │
│                                         │
│  7. Store in Firestore                  │
│     └─ messages collection              │
│                                         │
│  8. Send email via Resend               │
│     └─ From: noreply@mikezamayias.com   │
│     └─ Reply-To: submitter's email      │
│                                         │
│  9. Return { success: true }            │
└─────────────────────────────────────────┘
```

## Security Layers

| Layer                  | Type           | Purpose                                                                    |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| Client-side validation | UX             | Instant feedback, prevents obvious bad input                               |
| Honeypot (`_honey`)    | Anti-bot       | Hidden field bots fill — silently discards if set                          |
| Server-side validation | Security       | Enforces field constraints on the server                                   |
| Body guard             | Security       | Rejects malformed/null request bodies with 400                             |
| App Check              | Anti-abuse     | Verifies Firebase App Check token when site key is set                     |
| Global daily cap       | Anti-abuse     | 50 submissions/day max — prevents cost attacks                             |
| IP rate limiting       | Anti-abuse     | 1 req/min per hashed IP via Firestore transaction                          |
| Client rate limiting   | UX             | 30s cooldown in localStorage (synced on 429)                               |
| reCAPTCHA v3           | Anti-bot       | Optional — score-based bot detection                                       |
| CORS                   | Infrastructure | Handled by Nitro/Firebase Hosting                                          |
| Input sanitization     | Security       | HTML-escapes user input in email body; normalizes plain-text email subject |
| Firestore rules        | Security       | No direct client read/write to submissions                                 |

## Environment Variables

Most contact form variables are **server-only**. App Check uses the public site key.

| Variable                         | Required | Description                                                |
| -------------------------------- | -------- | ---------------------------------------------------------- |
| `RESEND_API_KEY`                 | Yes      | Resend API key for sending emails                          |
| `CONTACT_EMAIL`                  | Yes      | Email address to receive form submissions                  |
| `RECAPTCHA_SECRET_KEY`           | No       | reCAPTCHA v3 secret (only checked if present)              |
| `NUXT_PUBLIC_RECAPTCHA_SITE_KEY` | No       | Enables App Check token generation and server verification |

Set in `.env` for local development, or as GitHub Secrets for CI/CD.

For Firebase deployment, the deploy workflow writes these to `.output/server/.env` with `NUXT_` prefixes (e.g., `RESEND_API_KEY` → `NUXT_RESEND_API_KEY`, `CONTACT_EMAIL` → `NUXT_CONTACT_EMAIL`, `RECAPTCHA_SECRET_KEY` → `NUXT_RECAPTCHA_SECRET_KEY`). Nuxt's runtime config auto-maps `NUXT_`-prefixed env vars to their camelCase `runtimeConfig` keys at runtime.

## Firestore Collections

### `messages`

Stores every form submission.

| Field       | Type      | Description                         |
| ----------- | --------- | ----------------------------------- |
| `name`      | string    | Submitter's name                    |
| `email`     | string    | Submitter's email                   |
| `subject`   | string    | Message subject                     |
| `message`   | string    | Message content                     |
| `ipHash`    | string    | SHA-256 hash of IP (first 16 chars) |
| `userAgent` | string    | User agent at submission time       |
| `createdAt` | timestamp | Server timestamp                    |
| `read`      | boolean   | Admin read status (default: false)  |
| `source`    | string    | `contact-form`                      |

**Rules:** Admin read-only, no client writes.

**Migration note:** the admin inbox reads from `messages`. If a project has older
documents in `contactSubmissions`, copy or rename them into `messages` before
depending on `/admin/messages`; otherwise historical submissions remain in the
legacy collection and will not appear in the new inbox.

### `_rateLimits`

Tracks per-IP submission timestamps for rate limiting.

| Field        | Type      | Description               |
| ------------ | --------- | ------------------------- |
| `lastSubmit` | timestamp | Last submission timestamp |

**Rules:** No client access (Admin SDK only).

## Local Development

1. Write `.env` from the SOPS-encrypted shared env file:

    ```bash
    scripts/dotenv-from-sops.sh
    ```

2. Get a Resend API key from <https://resend.com/api-keys>

3. Run the dev server:

    ```bash
    bun run dev
    ```

4. The `/api/contact` endpoint is available at `http://localhost:3000/api/contact`

**Note:** Firestore rate limiting requires Firebase credentials. For local development, you can use `firebase emulators:start` or set up a service account.

## Deployment

The contact endpoint deploys automatically with the SSR function — no separate deployment step needed.

The deploy workflow (`.github/workflows/deploy.yml`) writes `NUXT_RESEND_API_KEY`, `NUXT_CONTACT_EMAIL`, and `NUXT_RECAPTCHA_SECRET_KEY` to the function's `.env` file (sourced from GitHub repository secrets `RESEND_API_KEY`, `CONTACT_EMAIL`, and `RECAPTCHA_SECRET_KEY`). `NUXT_PUBLIC_RECAPTCHA_SITE_KEY` is the public App Check key and should be configured when App Check enforcement is ready.
