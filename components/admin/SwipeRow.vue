<script setup lang="ts">
    /**
     * Touch-driven swipeable list row. Reveals a destructive action panel on
     * left-swipe (iOS Mail / Things 3 idiom). Snaps back if swipe distance
     * doesn't cross the 40px threshold; locks to 80px when it does. Tap the
     * revealed button to emit `delete`.
     *
     * Touch-only by design: keyboard / pointer users get the existing delete
     * affordance in the per-document editor. Reveal button is `tabindex="-1"`
     * when hidden so it stays out of the tab order.
     *
     * Reduced-motion: the transform transition is suppressed via the
     * `prefers-reduced-motion: reduce` query. Reveal state is still applied —
     * the animation just snaps.
     */
    import { computed, ref } from "vue";
    import { useSwipe } from "@vueuse/core";

    const props = withDefaults(
        defineProps<{
            disabled?: boolean;
            actionLabel?: string;
        }>(),
        {
            disabled: false,
            actionLabel: "Delete",
        }
    );

    const emit = defineEmits<{
        delete: [];
    }>();

    const target = ref<HTMLElement | null>(null);
    const offsetX = ref(0);
    const revealed = ref(false);

    const REVEAL_DISTANCE = 80;
    const THRESHOLD = 40;

    // `useSwipe.lengthX` is `startX - currentX`: positive on left-swipe,
    // negative on right-swipe. Map both into a clamped reveal offset so the
    // gesture is symmetric regardless of starting state.
    const { lengthX, isSwiping } = useSwipe(target, {
        threshold: 8,
        onSwipe() {
            if (props.disabled) return;
            const base = revealed.value ? REVEAL_DISTANCE : 0;
            offsetX.value = Math.min(REVEAL_DISTANCE, Math.max(0, base + lengthX.value));
        },
        onSwipeEnd() {
            if (props.disabled) return;
            revealed.value = offsetX.value >= THRESHOLD;
            offsetX.value = revealed.value ? REVEAL_DISTANCE : 0;
        },
    });

    const close = () => {
        revealed.value = false;
        offsetX.value = 0;
    };

    const triggerDelete = () => {
        if (props.disabled) return;
        emit("delete");
        close();
    };

    defineExpose({ close });

    // Accessibility live-region hint: announced once when the action panel
    // becomes interactive so screen-reader users learn that swipe revealed
    // an action.
    const announceReveal = computed(() =>
        revealed.value ? `${props.actionLabel} action revealed. Tap to confirm.` : ""
    );
</script>

<template>
    <div class="relative overflow-hidden">
        <div
            ref="target"
            class="swipe-row-surface relative z-10"
            :class="{
                'swipe-row-animating': !isSwiping,
                'swipe-row-locked': revealed,
            }"
            :style="{ transform: `translateX(-${offsetX}px)` }"
        >
            <slot />
        </div>
        <button
            type="button"
            class="swipe-row-action codex-destructive-bg"
            :aria-hidden="!revealed"
            :tabindex="revealed && !disabled ? 0 : -1"
            :disabled="disabled"
            @click="triggerDelete"
        >
            {{ actionLabel }}
        </button>
        <span class="sr-only" aria-live="polite">{{ announceReveal }}</span>
    </div>
</template>

<style scoped>
    .swipe-row-surface {
        will-change: transform;
        touch-action: pan-y;
    }
    .swipe-row-action {
        position: absolute;
        inset: 0 0 0 auto;
        z-index: 20;
        width: 5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 0;
    }
    /* Swipe is a touch-only gesture; desktop has the explicit Delete
     * button in the per-doc editor. The action panel always lives
     * behind the row in the DOM so it can be revealed via transform on
     * swipe, but on hover-capable / fine pointers (mouse, trackpad) it
     * has no way to be triggered AND it's visually loud — the
     * `--phoenix-ember` stripe leaks past the row content's right edge.
     * Hide it entirely on those devices so the admin list reads as a
     * normal hover/click target there. Coarse pointers (touch) keep
     * the swipe-to-reveal behavior. */
    @media (hover: hover) and (pointer: fine) {
        .swipe-row-action {
            display: none;
        }
    }
    /* When revealed, suppress pointer events on the swipe surface so taps on
     * the visually-overlaid Delete button at the right edge don't fall
     * through to the underlying <NuxtLink> and trigger navigation. */
    .swipe-row-locked {
        pointer-events: none;
    }
    .swipe-row-animating {
        transition: transform 0.2s ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
        .swipe-row-animating {
            transition: none;
        }
    }
</style>
