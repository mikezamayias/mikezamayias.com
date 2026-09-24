# mikezamayias.com

The source of [mikezamayias.com](https://mikezamayias.com), my personal site: who I am, the apps I build, and a small blog. It also has an admin I use to edit the content.

## How it works

- **Nuxt 4 and Vue 3**, written in TypeScript, styled with Tailwind on a small set of design tokens (`assets/css/tokens.css`).
- **Content lives in Firestore.** The admin at `/admin` (Firebase Auth, allow-listed accounts only) edits it.
- **The public site is fully static.** At build time `scripts/snapshot-content.ts` reads the published content into `content/*.json`, and `nuxt generate` prerenders every public page from that snapshot. Publishing a change means running the Deploy workflow again.
- **A Cloudflare Worker serves it.** Static assets are served straight from the Worker's assets binding (`wrangler.jsonc`). The Worker code itself (`worker/`) only handles `POST /api/contact`, which checks Turnstile and sends the message through Brevo.
- **Firebase** provides Firestore, Storage, Auth, and a Cloud Function the admin uses for uploads and contact messages. Security rules live in `firebase/` and have their own test suite.
- **Secrets** are encrypted in the repository with [SOPS](https://github.com/getsops/sops) and age (`.env.shared.sops.yaml`, `secrets/`). CI needs a single secret, `SOPS_AGE_KEY`, to decrypt them.

## Running it locally

You need [Bun](https://bun.sh) as the package manager and Node 22 to run Nuxt.

```bash
bun install
bun run snapshot:seeds   # writes content/*.json from seeds/firestore, no credentials needed
bun run dev              # http://localhost:3000
```

`bun run snapshot` reads the real Firestore content instead, and needs the Firebase web config in the environment (see `env.d.ts`). The admin also needs a Firebase project to sign in to.

Other scripts:

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `bun run generate`       | Snapshot Firestore, then prerender the static site          |
| `bun run lint`           | ESLint (Prettier runs through it)                           |
| `bunx nuxi typecheck`    | Type-check the app                                          |
| `bun run test`           | Unit tests (Vitest)                                         |
| `bun run test:rules`     | Firestore and Storage rules tests, in the Firebase emulator |
| `bun run seed:firestore` | Seed Firestore from `seeds/firestore` (use `--only=<name>`) |

## Branches and deploys

- `dev` is the default branch. Pull requests into `dev` and `prod` run lint, type check, tests, the rules tests, a build, an axe accessibility scan, Lighthouse, and a Firebase preview channel.
- A push to `prod` runs the Deploy workflow: it builds the site, deploys the Worker, the Firestore and Storage rules and the Cloud Function, then checks that the new Worker version is the one serving.

## Accessibility

The public pages are built to WCAG 2.2 AA. Every pull request runs axe-core against the prerendered pages, and Lighthouse checks accessibility on the preview deployment.

## License

The code is BSD 3-Clause licensed; see [LICENSE](LICENSE). The written content, photos, logo and brand assets are mine and are not covered by it.
