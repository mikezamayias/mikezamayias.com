// composables/useFirebaseApp.ts
//
// Returns the (lazy-initialized) Firebase app instance. Replaces
// nuxt-vuefire's useFirebaseApp() so the firebase/* SDK can be
// dynamically imported (and tree-shaken from the public bundle)
// rather than statically pulled in by nuxt-vuefire's auto-plugin.
//
// Task 3.6 (Plan F) — previously nuxt-vuefire's payload-plugin and
// app/plugin.client statically imported firebase/app, /firestore,
// /database, /auth, /storage into the public entry chunk (~340 KB
// gzip). Vite manualChunks couldn't split them because static imports
// in the entry forced Rollup chunk-merge to re-inline. Removing the
// module + using await-import() inside admin-route guards lets the
// SDK live in lazy chunks loaded only on /admin/**.

import type { FirebaseApp, FirebaseOptions } from "firebase/app";

type FirebasePublicConfig = {
    firebaseApiKey?: unknown;
    firebaseAuthDomain?: unknown;
    firebaseProjectId?: unknown;
    firebaseStorageBucket?: unknown;
    firebaseMessagingSenderId?: unknown;
    firebaseAppId?: unknown;
    firebaseMeasurementId?: unknown;
};

let app: FirebaseApp | null = null;
// Codex P2 (PR #71): track the in-flight promise so concurrent callers
// (e.g. the auth plugin's init racing with loginWithEmail's fallback)
// share one initialization. Previously we cached only the resolved
// `app`, so a second caller arriving mid-init saw `app === null` and
// re-entered — re-invoking `useRuntimeConfig()` after the dynamic
// import's await boundary, which throws "Nuxt instance unavailable".
let appPromise: Promise<FirebaseApp> | null = null;

export async function useFirebaseApp(
    publicConfig: FirebasePublicConfig = useRuntimeConfig().public
): Promise<FirebaseApp> {
    if (app) return app;
    if (appPromise) return appPromise;

    // Codex P1 (PR #71): capture the runtime config BEFORE the dynamic
    // import. `useRuntimeConfig()` requires the active Nuxt instance
    // context, which is lost across the `await import(...)` boundary —
    // calling it after the await throws "Nuxt instance unavailable" on
    // cold loads of /admin/** (the only place this composable runs).
    //
    // With the `appPromise` guard above, this sync section runs exactly
    // once even when multiple callers race — the second caller hits
    // `return appPromise` and never re-touches `useRuntimeConfig()`.
    const options: FirebaseOptions = {
        apiKey: publicConfig.firebaseApiKey as string,
        authDomain: publicConfig.firebaseAuthDomain as string,
        projectId: publicConfig.firebaseProjectId as string,
        storageBucket: publicConfig.firebaseStorageBucket as string,
        messagingSenderId: publicConfig.firebaseMessagingSenderId as string,
        appId: publicConfig.firebaseAppId as string,
        measurementId: publicConfig.firebaseMeasurementId as string,
    };
    // PR #71 follow-up: nuxt.config provides "" fallbacks for missing env
    // vars so the public bundle still builds. But initializeApp() will
    // happily accept empty strings and then throw cryptic
    // "auth/invalid-api-key" errors at the first SDK call. Fail fast with
    // a clear message instead — mirrors the sentry.server.config.ts
    // missing-DSN behaviour. Only the three fields actually required for
    // the SDK to bootstrap are checked (apiKey, projectId, appId);
    // optional fields like authDomain are allowed to be empty.
    if (!options.apiKey || !options.projectId || !options.appId) {
        throw new Error(
            "[codex] Firebase config incomplete — required apiKey/projectId/appId missing." +
                " Set NUXT_PUBLIC_FIREBASE_API_KEY / _PROJECT_ID / _APP_ID via Infisical."
        );
    }

    appPromise = (async () => {
        try {
            const { initializeApp, getApps } = await import("firebase/app");
            const existing = getApps()[0];
            app = existing ?? initializeApp(options);
            return app;
        } catch (err) {
            // Reset so a caller can retry once the underlying issue is
            // resolved (e.g. dynamic-import network blip).
            appPromise = null;
            throw err;
        }
    })();
    return appPromise;
}
