import * as Sentry from "@sentry/nuxt";

const config = useRuntimeConfig();
const appEnvRaw = config.public.appEnv;
const appEnv = typeof appEnvRaw === "string" && appEnvRaw.length > 0 ? appEnvRaw : "development";
const isProduction = appEnv === "production";

Sentry.init({
    dsn: config.public.sentryDsn,
    // Ingest only from production. `import.meta.dev` is false for every built
    // client (incl. CI staging artifacts and PR preview deploys), so it cannot
    // distinguish prod from staging — the explicit `appEnv` runtime config
    // (set in deploy.yml/ci.yml) can.
    enabled: isProduction,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    environment: appEnv,
    // Drop the noisy Firestore "permission-denied" surfaces from the public site
    // — they're expected when the user hits an admin-only doc by URL fuzzing.
    ignoreErrors: [/FirebaseError: \[code=permission-denied\]/],
});
