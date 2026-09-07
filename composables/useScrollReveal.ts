// Scroll-reveal observer per design §9: "Scroll-reveals via
// IntersectionObserver, fade + 20px translateY, 0.8s duration."
//
// Returns a directive (`v-codex-reveal`) that any section / row can
// drop on its root element. The observer fires once per element (then
// disconnects) so reveal is one-shot — re-entering viewport doesn't
// re-animate.
//
// Two-stage class model to avoid the SSR-flash class of bug:
//   1. `.codex-reveal` (starting state — opacity:0 + translateY:20px) is
//      added to the element BY THE TEMPLATE / SSR markup, not by the
//      directive. The element ships hidden in the server payload so the
//      first paint is already at the starting state — no flash of
//      visible-then-hidden content during hydration.
//   2. `.codex-revealed` (final state) is added by this directive when
//      the element crosses the viewport-bottom fire line.
//
// Tall-section guard: design §9 didn't specify a fire policy, but a
// threshold-based check (`threshold: 0.15`) fires off-screen for
// sections taller than ~1.18× viewport — the user sees a fully-revealed
// section by the time they scroll to it. Use a pixel rootMargin from
// the viewport bottom instead so the fire line is consistent regardless
// of section height.
//
// Reduced-motion respects `prefers-reduced-motion: reduce` and the
// global page-level guard in assets/css/tailwind.css — when set, the
// element is immediately marked `codex-revealed` so the final state
// renders without animation.

import type { Directive } from "vue";

// Fire when the element's top edge crosses 120px above the viewport
// bottom (i.e. the top of the section is just entering the visible
// area, regardless of how tall the section is).
const REVEAL_ROOT_MARGIN = "0px 0px -120px 0px";

// Cap individual delay to keep section reveals bounded — at high item
// counts (40+ rows in a long admin list) a linear `n × stagger`
// schedule would stretch the cascade well past the 0.8s base
// transition. 0.5s after the section's own reveal is plenty.
const MAX_STAGGER_DELAY_MS = 500;

function reveal(el: HTMLElement) {
    el.classList.add("codex-revealed");
}

function shouldAnimate(): boolean {
    if (typeof window === "undefined") return false;
    if (typeof IntersectionObserver === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Per-element binding value for `v-codex-reveal` is the cascade delay
// in milliseconds — e.g. `v-codex-reveal="i * 80"` on a v-for row sets
// the staggered entry delay. Sections without a value get 0 delay.
type RevealBinding = number | undefined;

function applyDelay(el: HTMLElement, delayMs: number) {
    // Always set OR clear so a row that moves from delay=240ms to
    // delay=0ms after a re-order doesn't keep the stale value. The
    // CSS rule defaults to `0ms` via `var(--codex-reveal-delay, 0ms)`
    // when the property is absent.
    const clamped = Math.max(0, Math.min(delayMs, MAX_STAGGER_DELAY_MS));
    if (clamped > 0) {
        el.style.setProperty("--codex-reveal-delay", `${clamped}ms`);
    } else {
        el.style.removeProperty("--codex-reveal-delay");
    }
}

export const vCodexReveal: Directive<HTMLElement, RevealBinding> = {
    mounted(el, binding) {
        // Template ships `.codex-reveal` already (see :class binding on
        // each adopting section). Don't toggle it here — that would
        // cause the hydration flash this whole pattern is meant to avoid.
        const delayMs = typeof binding.value === "number" ? binding.value : 0;
        applyDelay(el, delayMs);

        if (!shouldAnimate()) {
            // Reveal immediately when motion is reduced or IO is missing —
            // the element still needs the final state so it isn't stuck at
            // opacity:0 / translateY:20px.
            reveal(el);
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        reveal(el);
                        io.disconnect();
                        break;
                    }
                }
            },
            { threshold: 0, rootMargin: REVEAL_ROOT_MARGIN }
        );

        io.observe(el);

        // Stash the observer on the element so unmount can disconnect.
        (el as HTMLElement & { __codexReveal?: IntersectionObserver }).__codexReveal = io;
    },
    updated(el, binding) {
        // Re-apply the delay if the binding value changes. Vue's key-based
        // reconciliation reuses the same DOM node when a parent list
        // re-orders without changing keys, so without this hook a swapped
        // row would keep its original `--codex-reveal-delay`. Once the
        // element has `.codex-revealed`, the delay is ignored anyway —
        // this only matters for re-orders that happen before intersection.
        if (binding.value !== binding.oldValue) {
            const delayMs = typeof binding.value === "number" ? binding.value : 0;
            applyDelay(el, delayMs);
        }
    },
    unmounted(el) {
        const io = (el as HTMLElement & { __codexReveal?: IntersectionObserver }).__codexReveal;
        io?.disconnect();
    },
};
