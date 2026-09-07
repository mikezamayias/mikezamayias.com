// plugins/03.auth.client.ts
//
// Boots the Firebase auth listener — only on admin routes. After
// Task 3.6 (Plan F) we removed nuxt-vuefire and now manage Firebase
// app + auth manually, with all firebase/* SDK pulled in via dynamic
// import inside the admin gate. This keeps the public bundle clean.
//
// Numeric `03.` prefix is load-bearing: this plugin attaches the
// auth listener after `02.firestore.client.ts` has wired offline
// persistence. Renamed from `01.auth.client.ts` in preparation for
// proper plugin sequencing.
//
// PR #71 follow-up: the previous one-shot `window.location.pathname`
// check only fired at boot — Vue Router SPA navigation into /admin/**
// from a public page never re-triggered the plugin, so Firebase auth
// stayed uninitialised. Now we run the gate once at boot AND on every
// router.beforeEach, guarded by a module-singleton flag so duplicate
// triggers (hard load onto /admin) are a no-op.
//
// P2 Codex follow-up: previously used router.afterEach, which fires
// AFTER navigation is confirmed — meaning middleware/admin-auth.ts
// would await loading state for a listener that was never registered.
// Switched to router.beforeEach + returning the init Promise so the
// router waits for init() before middleware reads auth state.
//
// I5 (code-reviewer): both admin plugins previously had
// asymmetric fail-closed behaviour. auth + firestore rejected from
// `maybeInit`, so a thrown init aborted the navigation entirely. Now both
// Sentry-capture + log + return without setting initialized=true
// (preserves retry on next attempt). Auth failures surface via the
// existing "Firebase authentication is not available" message inside
// useAuth.loginWithEmail; firestore failures surface via the offline-
// fallback UX.
import * as Sentry from "@sentry/nuxt";

// Normalize a path by stripping a leading i18n locale prefix.
//   /el/admin/login → /admin/login
//   /admin/login    → /admin/login
// Locale list must match `i18n.locales` in nuxt.config.ts — keep in sync.
function stripLocale(path: string): string {
    return path.replace(/^\/(el|en)(\/|$)/, "/");
}

export default defineNuxtPlugin({
    name: "codex:auth",
    enforce: "post",
    setup() {
        if (import.meta.server) return;
        if (typeof window === "undefined") return;

        let initialized = false;

        const maybeInit = async (path: string) => {
            if (initialized) return;
            // i18n `prefix_except_default` serves Greek admin as /el/admin/**;
            // strip the locale before gating so both locales init Firebase.
            if (!stripLocale(path).startsWith("/admin")) return;
            try {
                const { initAuth } = useAuth();
                await initAuth();
                initialized = true;
            } catch (err) {
                // Don't set initialized — allow the next /admin navigation
                // to retry init once the transient cause (network blip,
                // dynamic-import 502, etc.) clears. Permanent misconfig
                // surfaces via Sentry + the loginWithEmail user-facing
                // "Firebase authentication is not available" message.
                Sentry.captureException(err, {
                    tags: { component: "firebase-auth-plugin" },
                });
                if (import.meta.dev) console.warn("[codex] auth plugin init failed", err);
                // P2 Codex follow-up: clear `auth-loading` so the admin-auth
                // middleware can stop awaiting and redirect to /admin/login.
                // Previously the catch swallowed but the loading ref stayed
                // `true`, leaving middleware waiting forever for a listener
                // that never registered.
                const loading = useState<boolean>("auth-loading");
                loading.value = false;
            }
        };

        // Boot-time check covers full reloads / direct hits on /admin.
        void maybeInit(window.location.pathname);

        // Route-watcher covers SPA navigation from a public page into /admin.
        // beforeEach + returning the Promise makes the router wait for init
        // BEFORE middleware/admin-auth.ts runs, so `loading` is correctly
        // false by the time middleware reads it (no infinite await).
        // maybeInit never rejects (Sentry-capture + swallow) — navigation
        // always resolves, even on init failure.
        const router = useRouter();
        router.beforeEach((to) => {
            if (!stripLocale(to.path).startsWith("/admin")) return true;
            return maybeInit(to.path).then(() => true);
        });
    },
});
