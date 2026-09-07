import { describe, expect, it, vi } from "vitest";
import { useViewTransition } from "../../composables/useViewTransition";

describe("useViewTransition", () => {
    it("calls the update synchronously when API is missing", async () => {
        // jsdom does not implement startViewTransition
        const { run } = useViewTransition();
        const update = vi.fn();
        await run(update);
        expect(update).toHaveBeenCalledOnce();
    });

    it("uses startViewTransition when present", async () => {
        const update = vi.fn();
        const finished = Promise.resolve();
        const startViewTransition = vi.fn((cb: () => void) => {
            cb();
            return { finished };
        });
        // @ts-expect-error - happy-dom Document does not declare startViewTransition; we patch it for this test
        document.startViewTransition = startViewTransition;
        const { run } = useViewTransition();
        await run(update);
        expect(startViewTransition).toHaveBeenCalledOnce();
        expect(update).toHaveBeenCalledOnce();
        // @ts-expect-error - removing the patched non-standard property to clean up state
        delete document.startViewTransition;
    });
});
