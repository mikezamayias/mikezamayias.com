<script setup lang="ts">
    // The tonal card a chip opens, placed after the paragraph that
    // mentions it. Hidden (not just collapsed) while closed, so its links
    // stay out of the tab order.
    const props = defineProps<{ id: string; open: boolean }>();

    const opening = ref(false);
    watch(
        () => props.open,
        (open) => {
            opening.value = false;
            if (open) requestAnimationFrame(() => (opening.value = true));
        }
    );
</script>

<template>
    <div :id="id" class="letter-note" :class="{ opening }" :hidden="!open">
        <slot />
    </div>
</template>

<style scoped>
    .letter-note {
        font-family: var(--font-mono);
        font-size: 14.5px;
        line-height: 1.6;
        background: var(--letter-container);
        color: var(--letter-on-container);
        border-radius: 20px;
        padding: 16px 20px 18px;
        margin: -0.2em 0 1.2em;
        max-width: 40rem;
        display: grid;
        gap: 6px;
        transform-origin: top left;
    }
    .letter-note[hidden] {
        display: none;
    }
    .letter-note.opening {
        animation: letter-unfold 0.22s var(--ease-out-quart);
    }
    @keyframes letter-unfold {
        from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .letter-note.opening {
            animation: none;
        }
    }
</style>
