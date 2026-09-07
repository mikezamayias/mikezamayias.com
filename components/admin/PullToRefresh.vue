<script setup lang="ts">
    /**
     * Touch-driven pull-to-refresh wrapper. Listens for vertical drag on
     * the container when the page is scrolled to the top; once the pull
     * crosses the 60px threshold and the user lifts, fires `onRefresh()`.
     * The pull indicator scales with drag distance for tactile feedback.
     *
     * Skipped (no-op) when:
     *   - The host is scrolled below the top (preserves normal scroll UX).
     *   - The user has `prefers-reduced-motion: reduce` set (the gesture
     *     becomes inert; a hidden aria-live region still announces refresh
     *     state when the parent flips `loading`).
     *
     * Pure JS + CSS — no deps beyond Vue's reactivity primitives.
     */
    import { computed, ref } from "vue";
    import { useMediaQuery, useWindowScroll } from "@vueuse/core";

    const props = withDefaults(
        defineProps<{
            onRefresh: () => void | Promise<void>;
            loading?: boolean;
            threshold?: number;
            maxPull?: number;
            /**
             * Slop (px) below `threshold` required before the indicator
             * starts showing. Stops a single brushing touch at the top of
             * a freshly-scrolled list from rendering a half-visible chip.
             */
            slop?: number;
            /**
             * Top offset for the indicator chip — match the admin layout's
             * sticky header height so the indicator doesn't render under
             * it. Default 56px = `h-14` in `layouts/admin.vue`.
             */
            indicatorTop?: number;
        }>(),
        {
            loading: false,
            threshold: 60,
            maxPull: 120,
            slop: 8,
            indicatorTop: 56,
        }
    );

    const root = ref<HTMLElement | null>(null);
    const startY = ref<number | null>(null);
    const pullDistance = ref(0);
    const isDragging = ref(false);

    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    // `useWindowScroll` is SSR-safe (returns 0 / 0 on the server, hydrates
    // on the client without a manual `typeof window` guard).
    const { y: scrollY } = useWindowScroll();

    const progress = computed(() =>
        Math.min(1, Math.max(0, pullDistance.value - props.slop) / (props.threshold - props.slop))
    );
    const indicatorY = computed(() => Math.min(props.maxPull, pullDistance.value));
    const announce = computed(() => {
        if (props.loading) return "Refreshing list.";
        if (pullDistance.value >= props.threshold) return "Release to refresh.";
        return "";
    });

    function reset() {
        startY.value = null;
        pullDistance.value = 0;
        isDragging.value = false;
    }

    function onTouchStart(event: TouchEvent) {
        if (props.loading || prefersReducedMotion.value) return;
        if (scrollY.value > 0) return;
        const touch = event.touches[0];
        if (!touch) return;
        startY.value = touch.clientY;
        isDragging.value = true;
    }

    function onTouchMove(event: TouchEvent) {
        if (startY.value === null || !isDragging.value) return;
        if (props.loading) return;
        const touch = event.touches[0];
        if (!touch) return;
        const delta = touch.clientY - startY.value;
        if (delta <= 0) {
            // Upward motion — release control to native scroll.
            pullDistance.value = 0;
            return;
        }
        pullDistance.value = Math.min(props.maxPull, delta);
        // Prevent body rubber-banding only while we're actually pulling
        // downward — otherwise normal scroll up is blocked.
        if (pullDistance.value > props.slop && event.cancelable) event.preventDefault();
    }

    async function onTouchEnd() {
        if (!isDragging.value) return;
        const distance = pullDistance.value;
        isDragging.value = false;
        startY.value = null;
        if (distance >= props.threshold && !props.loading) {
            // Hold the indicator at the threshold while the refresh runs
            // so the user gets a clear "loading" hint until the parent
            // flips `loading` back to false.
            pullDistance.value = props.threshold;
            try {
                await props.onRefresh();
            } finally {
                pullDistance.value = 0;
            }
        } else {
            pullDistance.value = 0;
        }
    }

    // touchcancel is fired by the OS / browser when the gesture is
    // interrupted (interrupted by a system gesture, app switch, modal
    // overlay, etc). Treat it as a hard abort — never fire onRefresh.
    function onTouchCancel() {
        if (!isDragging.value) return;
        reset();
    }
</script>

<template>
    <div
        ref="root"
        class="pull-to-refresh"
        :class="{ 'is-loading': loading }"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchCancel"
    >
        <div
            class="pull-indicator"
            :class="{ 'pull-indicator-animating': !isDragging }"
            :style="{
                top: `${indicatorTop}px`,
                transform: `translateY(${indicatorY - 32}px)`,
                opacity: progress,
            }"
            aria-hidden="true"
        >
            <span class="pull-indicator-dot" :style="{ transform: `rotate(${progress * 360}deg)` }">
                ↓
            </span>
        </div>
        <span class="sr-only" aria-live="polite">{{ announce }}</span>
        <slot />
    </div>
</template>

<style scoped>
    .pull-to-refresh {
        position: relative;
        touch-action: pan-y;
    }
    .pull-indicator {
        /* `fixed` so the indicator floats above the sticky admin header
         * regardless of where the host is in the document flow. The
         * `top` value is set inline from the `indicatorTop` prop. */
        position: fixed;
        inset-inline: 0;
        z-index: 60;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        will-change: transform, opacity;
    }
    .pull-indicator-animating {
        transition:
            transform 0.2s ease-out,
            opacity 0.2s ease-out;
    }
    .pull-indicator-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 9999px;
        background: var(--bg);
        border: 1px solid var(--line);
        font-size: 0.95rem;
        color: var(--soft);
        transition: transform 0.15s linear;
    }
    .is-loading .pull-indicator-dot {
        animation: ptr-spin 0.8s linear infinite;
    }
    @keyframes ptr-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .pull-indicator-animating {
            transition: none;
        }
        .is-loading .pull-indicator-dot {
            animation: none;
        }
    }
</style>
