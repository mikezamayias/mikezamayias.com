type UpdateCallback = () => void | Promise<void>;

export function useViewTransition() {
    async function run(update: UpdateCallback): Promise<void> {
        // The TS lib types declare Document.startViewTransition as required
        // since lib.dom.d.ts shipped support, but at runtime older browsers
        // may not implement it — feature-detect explicitly.
        const doc =
            typeof document !== "undefined"
                ? (document as Document & {
                      startViewTransition?: (cb: UpdateCallback) => {
                          finished: Promise<void>;
                      };
                  })
                : null;
        const reducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!doc?.startViewTransition || reducedMotion) {
            await update();
            return;
        }
        const transition = doc.startViewTransition(update);
        try {
            await transition?.finished;
        } catch (err) {
            // The transition may abort if a second startViewTransition runs
            // before this one settles. Swallow the rejection — the DOM update
            // already happened inside `update()` — but log it so a regression
            // in the View Transitions API doesn't fail silently.
            if (import.meta.dev) console.warn("[useViewTransition] transition aborted", err);
        }
    }
    return { run };
}
