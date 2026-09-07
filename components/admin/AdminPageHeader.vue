<template>
    <div class="codex-page-header">
        <div class="codex-page-header-text">
            <p v-if="eyebrow" class="codex-page-header-eyebrow">{{ eyebrow }}</p>
            <h1 class="codex-page-header-title">{{ title }}</h1>
            <p v-if="description" class="codex-page-header-desc">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="codex-page-header-actions">
            <slot name="actions" />
        </div>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        title: string;
        description?: string;
        eyebrow?: string;
    }>();
</script>

<style scoped>
    .codex-page-header {
        margin-bottom: 1.5rem;
        padding: 1.25rem;
        border: 1px solid color-mix(in oklch, var(--line) 56%, transparent);
        border-radius: 8px;
        background: var(--surface-card, var(--surface));
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 1px 0 color-mix(in oklch, var(--fg) 6%, transparent);
    }

    @media (width >= 640px) {
        .codex-page-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
        }
    }

    .codex-page-header-eyebrow {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--soft);
        margin: 0 0 0.5rem;
    }

    .codex-page-header-title {
        font-family: var(--font-sans);
        font-size: 1.8rem;
        font-weight: 850;
        letter-spacing: -0.025em;
        color: var(--fg);
        margin: 0;
    }

    @media (width >= 640px) {
        .codex-page-header-title {
            font-size: 2rem;
        }
    }

    .codex-page-header-desc {
        margin: 0.5rem 0 0;
        max-width: 42rem;
        font-size: 0.875rem;
        color: var(--soft);
        line-height: 1.55;
    }

    .codex-page-header-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
</style>
