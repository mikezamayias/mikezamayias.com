// plugins/02.firestore.client.ts
//
// Wires Firestore offline persistence (IndexedDB) for the admin shell.
// After Task 3.6 (Plan F) this is gated to /admin/** so firebase/firestore
// stays out of the public bundle. The plan-B note about nuxt-vuefire 1.1
// no longer applies — we own the Firestore init now.
//
// Numeric `02.` prefix is load-bearing: this plugin opens Firestore
// connections, so it MUST run BEFORE `03.auth.client.ts`
// (which assumes the SDK is wired).
//
// PR #71 follow-up: the previous one-shot `window.location.pathname`
// check only fired at boot — Vue Router SPA navigation into /admin/**
// from a public page never re-triggered the plugin, so Firestore offline
// persistence stayed uninitialised for admins arriving via client-side
// routing. Now we run the gate once at boot AND on every
// router.beforeEach, guarded by resolved-state and in-flight promise state.
//
// P2 Codex follow-up: switched from afterEach → beforeEach so the
// router waits for Firestore init to complete BEFORE middleware
// runs. This keeps admin-auth middleware from racing against the
// listener-registration step.
//
// I5 (code-reviewer): aligned with the auth plugin —
// `maybeInit` now Sentry-captures + swallows so router.beforeEach
// never rejects. Firestore failures surface via the offline-fallback
// UX (queries fall through to cached/null data), not by aborting nav.
import * as Sentry from "@sentry/nuxt";

// Bump this when firebase/types.ts changes shape in a way that would make
// old cached docs incoherent for the new client code. Cache invalidates
// on mismatch with the value stored in localStorage by this plugin.
const CACHE_SCHEMA_VERSION = "codex-v1";

// Normalize a path by stripping a leading i18n locale prefix.
//   /el/admin/login → /admin/login
//   /admin/login    → /admin/login
// Locale list must match `i18n.locales` in nuxt.config.ts — keep in sync.
function stripLocale(path: string): string {
    return path.replace(/^\/(el|en)(\/|$)/, "/");
}

export default defineNuxtPlugin({
    name: "codex:firestore-offline",
    enforce: "pre",
    setup() {
        // Persistence is browser-only AND admin-only — public pages never
        // hit Firestore from the client (they read via server endpoints).
        if (import.meta.server) return;
        if (typeof window === "undefined") return;

        let initialized = false;
        let initPromise: Promise<void> | null = null;

        const initFirestore = async () => {
            // Schema-version check: if a returning visitor's cached schema is
            // older than the current build's, wipe the Firestore IndexedDB
            // entry before re-initialising. Otherwise old docs missing the
            // newly-required fields break the UI.
            try {
                const stored = localStorage.getItem("codex.cacheSchema");
                if (stored && stored !== CACHE_SCHEMA_VERSION) {
                    indexedDB.deleteDatabase("firestore/[default]/main");
                    if (import.meta.dev) {
                        console.log(
                            `[codex] cache schema bumped ${stored} → ${CACHE_SCHEMA_VERSION}; cleared IndexedDB`
                        );
                    }
                }
                localStorage.setItem("codex.cacheSchema", CACHE_SCHEMA_VERSION);
            } catch {
                // localStorage unavailable (Safari private mode / quota / etc.) — proceed without versioning.
            }

            const [
                {
                    initializeFirestore,
                    persistentLocalCache,
                    persistentSingleTabManager,
                    CACHE_SIZE_UNLIMITED,
                },
                firebaseApp,
            ] = await Promise.all([import("firebase/firestore"), useFirebaseApp()]);

            try {
                initializeFirestore(firebaseApp, {
                    localCache: persistentLocalCache({
                        // `persistentSingleTabManager(settings)` requires its
                        // settings argument (even if `undefined`); the SDK uses
                        // it to opt into forceOwnership for multi-tab edge cases.
                        tabManager: persistentSingleTabManager(undefined),
                        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
                    }),
                    ignoreUndefinedProperties: true,
                });
                if (import.meta.dev) {
                    console.log("[codex] Firestore offline cache enabled");
                }
            } catch (err: unknown) {
                // failed-precondition fires on HMR (initializeFirestore already called)
                // and on second-tab open with single-tab manager. Both are recoverable —
                // the next getFirestore() will return the existing instance.
                const code = (err as { code?: string })?.code;
                if (code === "failed-precondition") {
                    if (import.meta.dev) {
                        console.warn(
                            "[codex] Firestore already initialised (HMR or second tab); reusing existing instance"
                        );
                    }
                    return;
                }
                // Anything else is a real bug — re-throw so Sentry catches it.
                throw err;
            }
        };

        const maybeInit = async (path: string) => {
            if (initialized) return;
            // i18n `prefix_except_default` serves Greek admin as /el/admin/**;
            // strip the locale before gating so both locales init Firestore.
            if (!stripLocale(path).startsWith("/admin")) return;
            if (initPromise) return initPromise;

            initPromise = (async () => {
                try {
                    await initFirestore();
                    initialized = true;
                } catch (err) {
                    // Don't set initialized — let the next /admin nav retry.
                    // Permanent failures surface via Sentry; transient ones
                    // (dynamic-import blip, IndexedDB quota, etc.) get
                    // another shot. We deliberately don't re-throw: admin
                    // pages without offline persistence still work (queries
                    // go straight to network), so blocking navigation here
                    // would be a worse UX than degrading gracefully.
                    Sentry.captureException(err, {
                        tags: { component: "firestore-offline" },
                    });
                    if (import.meta.dev) console.warn("[codex] firestore plugin init failed", err);
                } finally {
                    initPromise = null;
                }
            })();

            return initPromise;
        };

        // Boot-time check covers full reloads / direct hits on /admin.
        void maybeInit(window.location.pathname);

        // Route-watcher covers SPA navigation from a public page into /admin.
        // beforeEach + returning the Promise lets navigation wait for init
        // to settle (maybeInit never rejects — see catch above), so admin
        // pages don't race the offline-cache wiring step.
        const router = useRouter();
        router.beforeEach((to) => {
            if (!stripLocale(to.path).startsWith("/admin")) return true;
            return maybeInit(to.path).then(() => true);
        });
    },
});
