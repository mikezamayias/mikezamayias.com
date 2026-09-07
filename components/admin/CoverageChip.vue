<template>
    <!--
        Coverage badge for the /admin/translations index. `state` is
        computed from filled/total ratio so the visual signal stays
        consistent across collections (% of translated docs) and
        singletons (% of filled EL fields).
    -->
    <span class="codex-coverage-chip" :data-state="state">
        <span class="codex-coverage-chip-bar" aria-hidden="true">
            <span class="codex-coverage-chip-bar-fill" :style="{ width: `${pct}%` }" />
        </span>
        <span class="codex-coverage-chip-label">{{ filled }}/{{ total }}</span>
    </span>
</template>

<script setup lang="ts">
    import type { LocaleCoverage } from "~/utils/adminContent";

    const props = defineProps<{
        coverage: LocaleCoverage;
    }>();

    const filled = computed(() => props.coverage.filled);
    const total = computed(() => props.coverage.total);

    const pct = computed(() => {
        if (!total.value) return 0;
        return Math.round((filled.value / total.value) * 100);
    });

    const state = computed<"empty" | "partial" | "complete">(() => {
        if (!total.value) return "empty";
        if (filled.value === 0) return "empty";
        if (filled.value === total.value) return "complete";
        return "partial";
    });
</script>

<style scoped>
    .codex-coverage-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.6rem;
        border: 1px solid var(--rule-soft);
        background: var(--surface);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        color: var(--soft);
    }

    .codex-coverage-chip-bar {
        position: relative;
        width: 3.5rem;
        height: 0.4rem;
        background: var(--surface);
        border: 1px solid var(--rule-soft);
        overflow: hidden;
    }

    .codex-coverage-chip-bar-fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--soft);
        transition: width 0.3s var(--ease-out-expo);
    }

    .codex-coverage-chip[data-state="empty"] {
        color: var(--faint);
    }

    .codex-coverage-chip[data-state="empty"] .codex-coverage-chip-bar-fill {
        background: var(--faint);
    }

    .codex-coverage-chip[data-state="partial"] {
        color: var(--ochre);
        border-color: var(--ochre);
    }

    .codex-coverage-chip[data-state="partial"] .codex-coverage-chip-bar-fill {
        background: var(--ochre);
    }

    .codex-coverage-chip[data-state="complete"] {
        color: var(--olive-victor);
        border-color: var(--olive-victor);
    }

    .codex-coverage-chip[data-state="complete"] .codex-coverage-chip-bar-fill {
        background: var(--olive-victor);
    }
</style>
