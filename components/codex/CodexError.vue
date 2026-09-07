<script setup lang="ts">
    defineProps<{
        /** Surfaced error from useAsyncData. */
        error: Error | null;
        /** Optional retry handler — usually `refresh` from useAsyncData. */
        retry?: () => void | Promise<void>;
    }>();
    const { t } = useI18n();
</script>

<template>
    <div v-if="error" class="codex-error" role="alert">
        <p class="codex-error-line">— {{ t("error.line") }}</p>
        <p class="codex-error-detail">{{ t("error.detail") }}</p>
        <button v-if="retry" type="button" class="codex-error-retry" @click="retry">
            {{ t("error.retry") }}
        </button>
    </div>
</template>

<style scoped>
    .codex-error {
        padding: 1.5rem 0;
        border-top: 1px solid var(--rule-soft);
        border-bottom: 1px solid var(--rule-soft);
        text-align: left;
    }
    .codex-error-line {
        font-family: var(--font-mono);
        color: var(--phoenix-ember);
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
    }
    .codex-error-detail {
        color: var(--soft);
        margin: 0 0 1rem;
        font-size: 0.9rem;
    }
    .codex-error-retry {
        appearance: none;
        background: transparent;
        border: 1px solid var(--rule);
        color: var(--fg);
        padding: 0.5rem 0.875rem;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        cursor: pointer;
        transition: border-color 150ms ease-in-out;
    }
    .codex-error-retry:hover {
        border-color: var(--accent);
    }
    .codex-error-retry:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
