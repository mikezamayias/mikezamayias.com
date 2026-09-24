# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal portfolio website built with Nuxt 4, Vue 3, and TailwindCSS.
The home page (`pages/index.vue`) is the **Annotated Letter**: a signed letter in Literata on a sheet of paper, English-only, following the system light or dark theme. The other public pages still use the Codex look.
The redesign shipped as plans A to F.

## Commands

```bash
# Development
bun run dev          # Start dev server at localhost:3000

# Build
bun run build        # Build for production
bun run generate     # Generate static site (uses nitro static preset)
bun run preview      # Preview production build

# Deploy: push to `prod` (see .github/workflows/deploy.yml)
```

## Development Rules

### Package Manager

**IMPORTANT: Only use `bun` for all package management operations in this project.**

- **DO**: `bun install`, `bun add <package>`, `bun remove <package>`, `bun update`
- **DO NOT**: use package managers other than Bun

This project uses `bun.lock` as its lockfile. Using other package managers will create conflicting lockfiles and cause dependency resolution issues.

**Runtime note:** `bun` is the package manager only. `nuxt dev` / `nuxt build` / `nuxt generate` run on Node 22+ (see `nuxt.config.ts` `nitro.firebase.gen2.nodeVersion`). Don't run dev/build under Bun — Nuxt 4 + Bun has a known dev-memory leak (~500 MB → 6 GB).

## Architecture

### Tech Stack

- **Nuxt 4** with hybrid SSR (`ssr: true`) + Firebase Cloud Function preset (`nitro.preset: 'firebase'`, gen2). Several public routes prerendered.
- **TailwindCSS** with the canonical **hellas-design-system** token set (see `assets/css/tokens.css`)
- **`@nuxtjs/i18n` v10** with `prefix_except_default` and a single English locale (`i18n/locales/en.json`). Browser-language detection and sitemap `autoI18n` are off. Add a locale entry in `nuxt.config.ts` to reintroduce Greek.
- **Theme:** follows the operating system only; there is no toggle and no stored preference. `public/theme-init.js` sets `html[data-theme="light"|"dark"]` before paint and on OS changes, `useTheme` mirrors it for script. `tokens.css` swaps semantic aliases (`--bg`, `--fg`, `--accent`, etc.) via that attribute. `@nuxtjs/color-mode` is **not** in use.
- **FontAwesome** icons via `<FaIcon>` component (registered globally)
- **Fonts:** Literata (the home letter, and the logo's face) and JetBrains Mono (letter notes, Codex body + display) are self-hosted variable fonts in `public/fonts/`, declared in `assets/css/fonts.css` with `swap` and preloaded from `nuxt.config.ts`. GFS Neohellenic, GFS Didot and Cormorant Garamond come from `@nuxtjs/google-fonts` with `font-display: optional`.
- **Sentry** (`@sentry/nuxt`): gated by `enabled: appEnv === "production"` in both `sentry.client.config.ts` and `sentry.server.config.ts`. `import.meta.dev` / `NODE_ENV === "production"` cannot distinguish prod from staging/PR-preview builds, so the explicit `NUXT_PUBLIC_APP_ENV` runtime config decides. Staging + dev artifacts ship Sentry SDK code but do not initialize — zero ingest, zero quota burn.

### Color System

Tokens come from `assets/css/tokens.css`. Components reference semantic aliases (`bg-bg`, `text-fg`, `text-soft`, `text-faint`, `border-line`, `text-accent`) which swap automatically with `data-theme`. **Do not introduce new color values** — pick from the existing palette.

```html
<div class="bg-bg text-fg border border-line">
    <span class="text-soft">secondary text</span>
    <a class="text-accent">accent link</a>
</div>
```

The public pages (the letter and the inner pages) use the `--letter-*` aliases (bg, sheet, text, soft, primary, cta, container, outline, hairline, dot, error), all mixed from the raw tokens below and swapped for dark in the same `data-theme` block.

Available raw tokens (use only where a semantic alias doesn't fit): `paper`, `paper-deep`, `argent`, `ink`, `ink-soft`, `ink-faint`, `rule`, `rule-soft`, the seven `blue-*` variants, `vergina-gold`, `imperial-gold`, `olive-victor`, `olive-deep`, `phoenix-ember`, `phoenix-ash`, `tyrian-purple`, `athena-bronze`, `aegean-deep`, `santorini-cyan`, `terracotta`, `ochre`. Vergina-gold is reserved for micro accents (cursor, scanline) — don't use it for body text.

### Component Patterns

Components live under four directories:

- `components/letter/` — the home page letter: `LetterChip` (disclosure button inside a sentence), `LetterNote` (the card it opens), `LetterMark` / `LetterSignature` (the outlined logo), `LetterIcon`.
- `components/codex/` — shared surfaces: SkipLink, ConsentBanner, CodexError (a failed section with a retry), and Wordmark (admin shell).
- `components/admin/` — admin shell + CRUD forms (AdminDocumentEditor, AdminFieldRenderer, layouts/admin.vue consumers).
- `components/layout/` — shared layout primitives.
- `components/ui/` — shadcn-vue primitives: Avatar, Badge, Button, Card, Dialog, DropdownMenu, Input, Label, ScrollArea, Select, Separator, Sheet, Skeleton, Sonner, Table, Textarea.

### Utilities

`utils/common.ts` exports:

- `scrollToSection(id)` - Smooth scroll to element
- `openExternalLink(url)` - Open in new tab
- `formatDate(date)` - Format as "Month Year"
- `commonAnimations` - Reusable Tailwind animation classes
- `commonColors` - Reusable color class combinations

### Global CSS Classes

Defined in `assets/css/tailwind.css`:

- `.pads` - Responsive padding (p-3 sm:p-6)
- `.gaps` - Responsive gap (gap-3 sm:gap-6)
- `.my-transition` - Standard transition (all 150ms ease-in-out)

Defined in `assets/css/letter-pages.css`, for the inner public pages:

- `layouts/default.vue` draws the frame: `.page-frame`, `.page-bar` (mark, name, section links), `.page-sheet`, `.page-footer`.
- Page content uses `.page-*` classes: `page-title`, `page-lede`, `page-facts` (mono facts line), `page-section` (with an italic `h2`), `page-entries` / `page-entry`, `page-pills` / `page-pill`, `page-tags`, `page-dl`, `page-prose` (Markdown bodies) and `page-form` / `page-field`.

### File Structure Notes

- `app.vue` - Mounts `<SkipLink />` globally + renders `<NuxtPage />`
- `error.vue` - Root error boundary, brand-styled 404 + generic 5xx copy, inside the default layout. Mounts `<SkipLink />` and `<ConsentBanner />` itself because `error.vue` fully replaces `app.vue` during error rendering — nothing from `app.vue` carries over.
- `pages/index.vue` - the letter. Its sentences live in `i18n/locales/en.json` under `letter.*`; the notes read work, writing, contact and social content from the snapshot. It opts out of the default layout.
- `pages/[...slug].vue` - 404 catch-all
- `layouts/default.vue` - the letter-style frame for every public page except home
- `pages/work/*`, `pages/writing/*`, `pages/about.vue`, `pages/contact.vue` - inner pages; `/work` groups entries by `status` (`building` | `testing` | `live`, see `shared/workStatus.ts`) and shows a facts line from `formatWorkFacts` (`utils/workFormat.ts`)
- `composables/useTheme.ts` - system theme sync
- `i18n/locales/en.json` - i18n string table (English only)
- `public/brand/` - Canonical brand assets: the Signature logo ("Mike." in Literata Italic, outlined), the adaptive `favicon.svg` plus PNG fallbacks, and the OG default image
- `public/.well-known/` - Apple app-site-association file
- `public/{theme-init.js,consent-init.js}` - Pre-paint FOUC (Flash Of Unstyled Content) / CLS (Cumulative Layout Shift) guards loaded from `'self'` (CSP-safe, no inline script hashes). Run before hydration so the theme attribute and consent state are applied to `<html>` before first paint on both prerendered and SSR routes.
- `server/utils/{firebase,errors,render-cache,sanitize,magic-bytes,mock-content,preview-mock}.ts` - Server-side primitives: lazy admin SDK init, `isH3Error` typeguard, render-cache wrapper, HTML sanitize, upload magic-byte sniff, mock content fixtures, and the preview-mock allowlist gate (see Server route + preview / observability patterns).
- Build output goes to `.output/public`, served by the Cloudflare Worker (`wrangler.jsonc`)

## Development Guidelines

### Before Making Changes

1. Run `bun run dev` to ensure the project starts correctly
2. Check for TypeScript errors - the project uses strict typing
3. Review existing patterns in similar components before creating new ones

### Code Style

- **Vue Components**: Use `<script setup lang="ts">` syntax
- **CSS**: Prefer semantic Tailwind aliases (`bg-bg`, `text-fg`, `text-accent`) so theme swaps work via `html[data-theme]` automatically. Don't pair `dark:` Tailwind variants with the new tokens — the variable swap happens at the CSS-variable layer, not the class layer.
- **TypeScript**: Define interfaces for component props and data structures
- **Naming**: PascalCase for components, camelCase for functions/variables

### Server route + preview / observability patterns

Default conventions for public-facing server routes. Admin routes are allowed to fail loud and skip most of this.

1. **Lift `use*` composables to handler top.** Call `useFirebaseAdmin()`, `useRuntimeConfig()`, `useHead()` before the first `try`. Satisfies the linter use-prefix rule. Also prevents the failure mode where init throws inside the try, gets caught, and ships a degraded card while the root cause stays hidden. Examples: `server/utils/firebase.ts`, `server/api/og/[type]/[slug].get.ts`, `server/api/render/post/[slug].get.ts`.

2. **Narrow try/catch to one concern.** Firestore reads may degrade; sanitize/marked failures must propagate as 500. Split the try when a handler does both.

3. **`Cache-Control: no-store, max-age=0` on every degraded response.** Default rule: degraded branches call `setHeader(event, "Cache-Control", "no-store, max-age=0")`. Without it, `server/middleware/cache-headers.ts` pins the degraded body past upstream recovery (30s blip → 1h stale cache).

4. **Prefer `isH3Error` over `(err as any)?.statusCode === 404`.** `server/utils/errors.ts` exports the typeguard. Re-throws the whole h3 family — 401/403/410 bubble correctly instead of being mis-classified as Firestore blips.

5. **Tag Sentry with `firestoreErrorCode` + emit `X-{Render,OG}-Degraded`.** Tag the event with the Firestore code (`unavailable`, `deadline-exceeded`, `permission-denied`). Transient outages group separately from real bugs. The header gives a log signal that doesn't need Sentry access to triage.

6. **Pre-paint guards in `public/*-init.js`.** `theme-init.js` + `consent-init.js` load from `'self'`. No inline-script hash needed. Run before hydration. Apply theme + consent state to `<html>` so prerendered + SSR routes both render correctly on first paint.

7. **Keep the locale-aware admin regex in sync.** `app.vue` (consent banner skip) and `public/consent-init.js` (pre-paint skip) both use `/^(?:\/el)?\/admin(?:\/|$)/`. Edit them as a pair — admin should never show the consent banner.

8. **Prefer `satisfies HomePayload` over `: HomePayload` on payload literals.** TypeScript keeps the concrete literal types. Errors point at the missing field directly instead of widening to the interface.

9. **Preview-mock allowlist gate.** `isPreviewMockEnv()` in `server/utils/preview-mock.ts` returns true only when `appEnv === "staging"` or `appEnv === "development"`. Unknown / unset `NUXT_PUBLIC_APP_ENV` falls through to real Firestore on purpose. Manual `firebase deploy` from a laptop without the env var fails loud (CodexError) instead of silently shipping mock content to production.

### Testing Changes

1. Run `bun run build` to check for build errors
2. Run `bun run generate` to test static site generation
3. Preview with `bun run preview` before committing

### Commit Format

Use conventional commits: `type(scope): description`

- Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`
- Keep commits atomic and focused on a single change

### Deployment

- Always test with `bun run generate && bun run preview` locally first
- The Cloudflare Worker serves `.output/public` as static assets
