export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client
    if (!import.meta.client) return;

    // Prerender has no user. Emitting a redirect here bakes a meta-refresh to
    // /admin/login into every static admin shell, which bounces a signed-in
    // admin before hydration. Skip during prerender; the guard runs client-side
    // after the shell mounts, which is the only place it can know the user.
    if (import.meta.prerender) {
        return;
    }

    const { user, isAdmin, loading, initAuth } = useAuth();

    // Codex P2 (PR #71): Nuxt's per-page middleware runs as part of the
    // framework's own router beforeEach, which is registered BEFORE any
    // user plugin's `router.beforeEach`. On a direct SPA nav into
    // /admin/** (e.g. hard refresh on /admin/security), this middleware
    // fires first and starts awaiting the `loading` ref — but the auth
    // plugin's hook (which calls `maybeInit`) hasn't run yet, so nothing
    // ever flips `loading` to false and the navigation hangs.
    //
    // Kick init from here so the middleware can make progress regardless
    // of hook ordering. Idempotent: `initAuth` is guarded by the module
    // singleton `initPromise` (commit 793ca7c), so the plugin's later
    // call is a no-op. Errors are surfaced by the plugin's catch
    // (Sentry + clear loading) — we just continue so the loading-watch
    // below can resolve once the plugin's catch runs.
    if (to.path.startsWith("/admin") || /^\/(el|en)\/admin/.test(to.path)) {
        await initAuth().catch(() => {
            // Middleware can fire BEFORE the plugin's router.beforeEach,
            // so the plugin's catch (which clears `loading`) never runs
            // on a middleware-first init failure. Clear `loading` here
            // ourselves so the watcher below doesn't hang forever —
            // user/isAdmin checks then redirect to /admin/login on the
            // (expected) unauthenticated state.
            loading.value = false;
        });
    }

    // Wait for auth state to be determined
    if (loading.value) {
        await new Promise<void>((resolve) => {
            const unwatch = watch(loading, (newVal) => {
                if (!newVal) {
                    unwatch();
                    resolve();
                }
            });
            // Also resolve immediately if loading becomes false before watch triggers
            if (!loading.value) {
                unwatch();
                resolve();
            }
        });
    }

    // Skip middleware for login page
    if (to.path === "/admin/login") {
        // If already logged in as admin, redirect to dashboard
        if (user.value && isAdmin.value) {
            return navigateTo("/admin");
        }
        return;
    }

    // For all other admin routes, require admin authentication
    if (!user.value) {
        return navigateTo("/admin/login");
    }
    if (!isAdmin.value) {
        return navigateTo("/admin/login");
    }
});
