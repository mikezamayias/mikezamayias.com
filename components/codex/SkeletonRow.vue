<script setup lang="ts">
    defineProps<{
        /** repeat count */
        rows?: number;
        /**
         * Variant matches the section's real-row heights to prevent
         * cumulative layout shift during hydration (rev 1.3 perf HIGH fix).
         */
        variant?: "work" | "writing" | "roadmap" | "about" | "default";
    }>();
</script>

<template>
    <div class="codex-skel" :data-variant="variant ?? 'default'" aria-hidden="true">
        <div v-for="n in rows ?? 3" :key="n" class="codex-skel-row" />
    </div>
</template>

<style scoped>
    .codex-skel {
        display: grid;
        gap: 1rem;
        padding: 1rem 0;
    }
    /* Plan I revisit: previous version used raw `--paper-deep` / `--paper`
     * gradient stops, which are LIGHT BEIGE in BOTH light and dark themes
     * (those raw tokens don't swap with `data-theme`). The skeleton rows
     * therefore rendered as giant cream rectangles over the dark page
     * background — exactly the "tiles popping" complaint. Tokens now
     * point at the theme-swapping `--surface` / `--surface-strong`
     * aliases so dark mode gets a subtle ink-tinted shimmer and light
     * mode keeps the original beige treatment. */
    .codex-skel-row {
        height: 1.25em;
        background: linear-gradient(
            90deg,
            var(--surface) 0%,
            var(--surface-strong) 50%,
            var(--surface) 100%
        );
        background-size: 200% 100%;
        animation: codex-shimmer 1.5s ease-in-out infinite;
        border-radius: 1px;
        opacity: 0.55;
    }

    /* Variant heights — kept smaller than before. The earlier 4.5rem
     * work-row skeleton was visually proportional to the loaded list
     * row but read as "huge filled blocks" against the empty page
     * during cold load. Pulled back to a flat ~3.25rem max so the
     * skeleton reads as "structure forming" rather than "blocks
     * popping in and out". */
    .codex-skel[data-variant="work"] .codex-skel-row {
        height: 3.25rem;
    }
    .codex-skel[data-variant="writing"] .codex-skel-row {
        height: 2.75rem;
    }
    .codex-skel[data-variant="roadmap"] .codex-skel-row {
        height: 2.5rem;
    }
    .codex-skel[data-variant="about"] .codex-skel-row {
        height: 1.25rem;
    }

    @keyframes codex-shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .codex-skel-row {
            animation: none;
            opacity: 0.35;
        }
    }
</style>
