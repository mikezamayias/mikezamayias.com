<script setup lang="ts">
    /**
     * Text-rendered mark instead of a PNG. The nav wordmark is first
     * viewport UI, so it should never degrade into a broken-image icon if
     * an asset request is stale, blocked, or cached incorrectly.
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
    <NuxtLink :to="target" class="codex-wordmark" :style="style" aria-label="mz, home">
        <span aria-hidden="true">mz</span>
    </NuxtLink>
</template>

<style scoped>
    .codex-wordmark {
        display: inline-grid;
        width: var(--codex-wordmark-size);
        height: var(--codex-wordmark-size);
        place-items: center;
        flex: 0 0 auto;
        border-radius: 0;
        background: var(--accent);
        color: var(--argent);
        font-family: var(--font-sans);
        font-size: calc(var(--codex-wordmark-size) * 0.42);
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0;
        text-decoration: none;
        box-shadow: none;
        transition:
            transform 180ms var(--ease-out-quart),
            background-color 180ms var(--ease-out-quart);
    }

    .codex-wordmark:hover {
        transform: translateY(-1px);
        background: color-mix(in oklch, var(--accent) 82%, var(--argent));
    }

    .codex-wordmark:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 4px;
    }
</style>
