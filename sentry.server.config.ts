import * as Sentry from "@sentry/nuxt";

const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN ?? "";
// Gate on the explicit deployment env (set in deploy.yml/ci.yml), not
// `NODE_ENV`. Nuxt builds set `NODE_ENV=production` for every artifact —
// production deploys, PR preview deploys, and CI staging builds — so it
// cannot distinguish prod from staging. `NUXT_PUBLIC_APP_ENV` is set to
// "production" only by the prod deploy workflow.
const appEnv = process.env.NUXT_PUBLIC_APP_ENV ?? "development";
const isProduction = appEnv === "production";

if (!dsn && isProduction) {
    // Fail fast in production: we'd rather know that observability is broken
    // than silently lose 100% of server-side errors.
    throw new Error("[codex] NUXT_PUBLIC_SENTRY_DSN is required in production");
}

Sentry.init({
    dsn,
    // Ingest only from production. Dev sessions, CI smokes, and PR preview
    // deploys would otherwise pollute the production issue tracker with
    // local-dev curl traffic and build-time prerender failures.
    enabled: isProduction,
    tracesSampleRate: 0.1,
    environment: appEnv,
});
