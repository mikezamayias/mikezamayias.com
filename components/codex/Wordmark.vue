<script setup lang="ts">
    import LetterMark from "~/components/letter/LetterMark.vue";

    /**
     * The "M." mark, inline SVG outlined from Literata, so the nav logo
     * never waits on a font or degrades into a broken-image icon.
     */
    const props = withDefaults(
        defineProps<{
            /** target href for the wordmark click — usually the home route */
            to?: string;
            /** rendered height in px */
            size?: number;
        }>(),
        { size: 36, to: undefined }
    );

    const localePath = useLocalePath();
    const target = computed(() => props.to ?? localePath("/"));
    const style = computed(() => ({ "--codex-wordmark-size": `${props.size}px` }));
</script>

<template>
    <NuxtLink :to="target" class="codex-wordmark" :style="style" aria-label="Mike Zamayias, home">
        <LetterMark />
    </NuxtLink>
</template>

<style scoped>
    .codex-wordmark {
        display: inline-grid;
        width: var(--codex-wordmark-size);
        height: var(--codex-wordmark-size);
        flex: 0 0 auto;
        border-radius: 22%;
        transition: transform 180ms var(--ease-out-quart);
    }

    .codex-wordmark :deep(svg) {
        width: 100%;
        height: 100%;
    }

    .codex-wordmark:hover {
        transform: translateY(-1px);
    }

    .codex-wordmark:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 4px;
    }
</style>
