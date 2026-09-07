import { computed, ref } from "vue";

const STORAGE_KEY = "codex.consent";
type ConsentState = "granted" | "denied" | null;

const state = ref<ConsentState>(null);

function load(): ConsentState {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "granted" || stored === "denied") return stored;
    } catch {
        // Safari private mode / quota — proceed as denied
    }
    return null;
}

function save(value: ConsentState): void {
    if (typeof window === "undefined") return;
    try {
        if (value) localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {
        // Silent-failure fix (C3): localStorage can throw in Safari private
        // mode and when the user has revoked storage permission. The in-memory
        // state still updates so the banner closes for the current session,
        // but on reload the banner re-appears — flapping consent UI. Surface
        // to Sentry + console.error so we know real users are hitting this.
        console.error("[codex] consent save failed", err);
        void import("@sentry/nuxt")
            .then((Sentry) => {
                Sentry.captureException(err, { tags: { component: "consent" } });
            })
            .catch(() => {
                // Reporting failure should not block the consent flow.
            });
    }
}

export function useConsent() {
    if (state.value === null && typeof window !== "undefined") {
        state.value = load();
    }
    const granted = computed(() => state.value === "granted");
    const needsDecision = computed(() => state.value === null);

    return {
        granted,
        needsDecision,
        accept() {
            state.value = "granted";
            save("granted");
        },
        decline() {
            state.value = "denied";
            save("denied");
        },
    };
}
