// plugins/05.analytics.client.ts
//
// Firebase Analytics (GA4) init, lazy + consent-gated. Only initializes
// after the user accepts via the consent banner. `measurementId` lives
// in Infisical (NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID, already issued).
import { watch } from "vue";
import * as Sentry from "@sentry/nuxt";
import { useConsent } from "~/composables/useConsent";

export default defineNuxtPlugin({
    name: "codex:analytics",
    enforce: "default",
    setup() {
        if (import.meta.server) return;

        // Capture Nuxt-context-bound values synchronously. `tryInit` awaits
        // Analytics support/import checks, and Nuxt composables can lose
        // their active instance context across those await boundaries.
        const publicConfig = useRuntimeConfig().public;
        const { granted } = useConsent();
        let initialised = false;
        // Silent-failure fix (C4): mirror the firebase plugin's `initPromise`
        // pattern. Without it, a second `watch` tick (or a stray re-call)
        // could race the first attempt and double-init analytics.
        let initPromise: Promise<boolean> | null = null;

        const tryInit = async (): Promise<boolean> => {
            if (initialised) return true;
            if (!granted.value) return false;
            if (initPromise) return initPromise;

            initPromise = (async () => {
                try {
                    const { initializeAnalytics, isSupported } = await import("firebase/analytics");
                    if (!(await isSupported())) {
                        if (import.meta.dev) {
                            console.warn(
                                "[codex] Firebase Analytics not supported in this environment"
                            );
                        }
                        return false;
                    }
                    const measurementId = publicConfig.firebaseMeasurementId;
                    if (!measurementId) {
                        // Silent-failure fix (C4): previously this silently
                        // returned. A missing measurement ID in prod means
                        // analytics is broken and nobody knows — log at
                        // error level so it surfaces in Sentry's console
                        // capture and ops can see the config regression.
                        console.error(
                            "[codex] NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID missing — Analytics disabled"
                        );
                        return false;
                    }
                    const firebaseApp = await useFirebaseApp(publicConfig);
                    initializeAnalytics(firebaseApp, {
                        config: { send_page_view: true },
                    });
                    initialised = true;
                    if (import.meta.dev) console.log("[codex] Firebase Analytics initialised");
                    return true;
                } catch (err) {
                    // Silent-failure fix (C4): the original block had no
                    // try/catch, so an `initializeAnalytics` throw would
                    // bubble into the consumer (a `watch` callback) and
                    // surface as an unhandled rejection with no diagnostic.
                    Sentry.captureException(err, {
                        tags: { component: "firebase-analytics-init" },
                    });
                    console.error("[codex] Firebase Analytics init failed", err);
                    return false;
                } finally {
                    initPromise = null;
                }
            })();

            return initPromise;
        };

        void tryInit();
        watch(granted, () => {
            void tryInit();
        });
    },
});
