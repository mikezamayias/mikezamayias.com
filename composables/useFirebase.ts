// composables/useFirebase.ts
//
// Lazy Auth accessor. After Task 3.6 (Plan F) we removed nuxt-vuefire,
// so `$auth` is no longer injected synchronously. `useAuth.initAuth`
// is now the single place that calls `getAuth(app)` and hydrates the
// shared ref; callers read from `useFirebase().auth`.
//
// I5 (code-reviewer): the previous `getFirebaseAuth()` export was
// added during the nuxt-vuefire removal but never called — all SDK
// access flows through `useAuth.initAuth` → onAuthStateChanged →
// `auth.value`. Dead exports drift; deleted.
import type { Auth } from "firebase/auth";

export const useFirebase = () => {
    // Shared ref so `useAuth` and callers see the same Auth instance
    // once initAuth() resolves. Keyed via useState so SSR/CSR boundaries
    // don't duplicate the singleton.
    const auth = useState<Auth | null>("firebase-auth", () => null);
    return { auth };
};
