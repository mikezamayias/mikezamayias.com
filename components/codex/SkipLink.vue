<script setup lang="ts">
    const { t } = useI18n();
</script>

<template>
    <a class="codex-skip" href="#main">{{ t("a11y.skip") }}</a>
</template>

<style scoped>
    .codex-skip {
        position: absolute;
        left: -9999px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
    .codex-skip:focus {
        position: fixed;
        left: 1rem;
        top: 1rem;
        width: auto;
        height: auto;
        padding: 0.55rem 0.85rem;
        background: var(--fg);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        z-index: 1200;
        border: 2px solid var(--accent);
    }
</style>
