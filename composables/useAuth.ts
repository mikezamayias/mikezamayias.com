// composables/useAuth.ts
//
// Admin auth composable. After Task 3.6 (Plan F) we removed
// nuxt-vuefire, so firebase/auth is no longer statically imported into
// the public bundle. All runtime calls into firebase/auth now go
// through `await import("firebase/auth")` so the SDK lives in a lazy
// chunk that only loads when /admin/** is visited (which is the only
// place useAuth() is exercised).
import type { User, MultiFactorError, MultiFactorResolver, TotpSecret } from "firebase/auth";
import * as Sentry from "@sentry/nuxt";

export interface MfaState {
    /** MFA verification is needed to complete sign-in */
    mfaRequired: boolean;
    /** The resolver used to complete MFA sign-in */
    resolver: MultiFactorResolver | null;
    /** The TOTP hint UID for sign-in assertion */
    totpHintUid: string | null;
}

// PR #71 (Codex P2): track the in-flight init promise, not a boolean.
// Previously a flag flipped to true BEFORE auth.value was populated —
// a second caller arriving mid-await (e.g. plugin starts init, user
// clicks login before firebase/auth resolves) saw flag=true, returned
// early, then hit `auth.value` as null and threw "Firebase
// authentication is not available". Holding the promise lets the
// second caller await the same resolution; fast path returns once
// auth.value is set. Reset on throw allows retry after env fixes.
let initPromise: Promise<void> | null = null;

export const useAuth = () => {
    const user = useState<User | null>("auth-user", () => null);
    const isAdmin = useState<boolean>("is-admin", () => false);
    const loading = useState<boolean>("auth-loading", () => true);
    const error = useState<string | null>("auth-error", () => null);

    const { auth } = useFirebase();

    /** Verify admin status by reading /settings/main directly via Firestore */
    const verifyAdminStatus = async (firebaseUser: User): Promise<boolean> => {
        const appPromise = useFirebaseApp();
        try {
            const [{ getFirestore, doc, getDoc }, app] = await Promise.all([
                import("firebase/firestore"),
                appPromise,
            ]);
            const db = getFirestore(app);
            const ref = doc(db, "settings", "main");
            const snap = await getDoc(ref);
            if (!snap.exists()) return false;
            const data = snap.data();
            const allowedAdminIds = Array.isArray(data?.allowedAdminIds)
                ? (data.allowedAdminIds as unknown[])
                : [];
            return allowedAdminIds.includes(firebaseUser.uid);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (code === "permission-denied" || code === "firestore/permission-denied") {
                return false;
            }
            // Silent-failure fix (C2, parallel to PR #70): bare `catch {}`
            // previously hid every failure of the admin verification endpoint
            // (network blip, 500, expired token, etc.) and silently downgraded
            // the user to non-admin. Surface to Sentry with uid context so we
            // can tell a legitimate non-admin from a verify-endpoint regression.
            Sentry.captureException(err, {
                tags: { component: "verifyAdminStatus" },
                extra: { uid: firebaseUser.uid },
            });
            return false;
        }
    };

    /** Check if the current user has TOTP MFA enrolled */
    const hasTotpEnrolled = async (targetUser?: User | null): Promise<boolean> => {
        const u = targetUser ?? user.value;
        if (!u) return false;
        const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
        const enrolled = multiFactor(u).enrolledFactors;
        return enrolled.some((factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    };

    /**
     * Initialize auth state listener. Async after Task 3.6 — dynamically
     * imports firebase/auth so the SDK only ships in the /admin/** chunk.
     *
     * Guarded by the module-singleton `initPromise` so multiple call
     * sites (the auth plugin's boot+afterEach gate, plus the
     * loginWithEmail fallback) can't stack `onAuthStateChanged`
     * listeners AND can't race past a half-initialized state.
     */
    const initAuth = async (): Promise<void> => {
        if (!import.meta.client) return;
        // Fast path: already initialized.
        if (auth.value) return;
        // In-flight: second caller awaits the same promise rather than
        // returning early and reading auth.value as null.
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                // Start useFirebaseApp() synchronously BEFORE awaiting
                // the dynamic import. useFirebaseApp() internally calls
                // useRuntimeConfig(), which requires the Nuxt instance
                // context — and that context is lost across the first
                // `await` boundary when firebase/auth resolves from a
                // cold chunk. By kicking the app promise off first (no
                // await), we capture the Nuxt context synchronously,
                // then Promise.all the import + app resolution in
                // parallel. Same pattern as the App Check / Firestore
                // plugins.
                const appPromise = useFirebaseApp();
                const [{ getAuth, onAuthStateChanged }, app] = await Promise.all([
                    import("firebase/auth"),
                    appPromise,
                ]);
                const a = getAuth(app);
                auth.value = a;
                onAuthStateChanged(a, async (firebaseUser) => {
                    user.value = firebaseUser;
                    if (firebaseUser) {
                        isAdmin.value = await verifyAdminStatus(firebaseUser);
                    } else {
                        isAdmin.value = false;
                    }
                    loading.value = false;
                });
            } catch (err) {
                // Reset the promise so a caller can retry — a
                // misconfigured env (e.g. missing Firebase API key)
                // shouldn't permanently wedge auth init once the env
                // is fixed at runtime. The plugin's catch handles
                // Sentry capture + clearing `auth-loading` (commit
                // 57beb26); we only need to rethrow for callers like
                // loginWithEmail that don't go through the plugin.
                initPromise = null;
                throw err;
            }
        })();
        return initPromise;
    };

    /**
     * Sign in with email and password.
     * Returns MfaState if MFA verification is required.
     */
    const loginWithEmail = async (email: string, password: string): Promise<MfaState> => {
        error.value = null;
        // Codex P2 (PR #71): capture useFirebaseApp() synchronously BEFORE
        // any await. The dynamic firebase/auth import below crosses the
        // Nuxt-instance boundary; if `auth.value` is null on a cold direct
        // hit to /admin/login, the subsequent `await initAuth()` calls
        // useFirebaseApp() → useRuntimeConfig() in a stale context and
        // throws "Nuxt instance unavailable". Kicking the app promise off
        // first anchors the Nuxt context while it's still synchronous.
        // The returned promise is harmless if auth.value is already set
        // (returns the cached singleton).
        const appPromise = useFirebaseApp();
        const { signInWithEmailAndPassword, getMultiFactorResolver, TotpMultiFactorGenerator } =
            await import("firebase/auth");
        if (!auth.value) {
            // initAuth may not have run yet (e.g. direct hit on /admin/login)
            await initAuth();
        }
        // Hold the promise so the sync useRuntimeConfig() call above is
        // realized before signInWithEmailAndPassword needs the app.
        await appPromise;
        if (!auth.value) {
            const msg =
                "Firebase authentication is not available." +
                " Please configure Firebase API key in environment variables.";
            error.value = msg;
            throw new Error(msg);
        }
        try {
            const result = await signInWithEmailAndPassword(auth.value, email, password);
            user.value = result.user;
            isAdmin.value = await verifyAdminStatus(result.user);
            return { mfaRequired: false, resolver: null, totpHintUid: null };
        } catch (err: unknown) {
            const firebaseError = err as { code?: string };
            if (firebaseError.code === "auth/multi-factor-auth-required") {
                const mfaError = err as MultiFactorError;
                const resolver = getMultiFactorResolver(auth.value, mfaError);

                // Find TOTP hint
                const totpHint = resolver.hints.find(
                    (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
                );

                return {
                    mfaRequired: true,
                    resolver,
                    totpHintUid: totpHint?.uid ?? null,
                };
            }
            error.value = err instanceof Error ? err.message : "Login failed";
            throw err;
        }
    };

    /**
     * Complete MFA sign-in with a TOTP code.
     */
    const verifyTotpSignIn = async (
        resolver: MultiFactorResolver,
        totpHintUid: string,
        otpCode: string
    ): Promise<void> => {
        error.value = null;
        try {
            const { TotpMultiFactorGenerator } = await import("firebase/auth");
            const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHintUid, otpCode);
            const credential = await resolver.resolveSignIn(assertion);
            user.value = credential.user;
            isAdmin.value = await verifyAdminStatus(credential.user);
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : "MFA verification failed";
            throw err;
        }
    };

    /**
     * Reauthenticate the current user with email + password.
     *
     * Firebase requires a recent sign-in (within ~5 min) for security-
     * sensitive ops like MFA enrollment / unenrollment. The
     * `auth/requires-recent-login` error surfaces when that window
     * lapses; callers catch it, prompt for the password, then call
     * this to refresh the session before retrying.
     */
    const reauthenticate = async (password: string): Promise<void> => {
        if (!user.value?.email) throw new Error("User must be signed in");
        const { EmailAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(user.value.email, password);
        await reauthenticateWithCredential(user.value, credential);
    };

    /**
     * Start TOTP enrollment: generate a secret and return it.
     */
    const startTotpEnrollment = async (): Promise<TotpSecret> => {
        if (!user.value) throw new Error("User must be signed in");
        const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
        const session = await multiFactor(user.value).getSession();
        const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
        return totpSecret;
    };

    /**
     * Finalize TOTP enrollment with the verification code from the authenticator app.
     */
    const finalizeTotpEnrollment = async (
        totpSecret: TotpSecret,
        verificationCode: string,
        displayName: string = "Authenticator App"
    ): Promise<void> => {
        if (!user.value) throw new Error("User must be signed in");
        const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
        const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
            totpSecret,
            verificationCode
        );
        await multiFactor(user.value).enroll(assertion, displayName);
    };

    /**
     * Unenroll from TOTP MFA.
     */
    const unenrollTotp = async (): Promise<void> => {
        if (!user.value) throw new Error("User must be signed in");
        const { multiFactor, TotpMultiFactorGenerator } = await import("firebase/auth");
        const enrolled = multiFactor(user.value).enrolledFactors;
        const totpFactor = enrolled.find(
            (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
        );
        if (!totpFactor) throw new Error("No TOTP factor enrolled");
        await multiFactor(user.value).unenroll(totpFactor);
    };

    /** Sign out */
    const logout = async () => {
        if (!auth.value) return;
        try {
            const { signOut } = await import("firebase/auth");
            await signOut(auth.value);
            user.value = null;
            isAdmin.value = false;
        } catch (err) {
            error.value = err instanceof Error ? err.message : "Logout failed";
            throw err;
        }
    };

    return {
        user,
        isAdmin,
        loading,
        error,
        initAuth,
        loginWithEmail,
        verifyTotpSignIn,
        hasTotpEnrolled,
        reauthenticate,
        startTotpEnrollment,
        finalizeTotpEnrollment,
        unenrollTotp,
        logout,
        verifyAdminStatus,
    };
};
