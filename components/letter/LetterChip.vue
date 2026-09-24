<script setup lang="ts">
    import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
    import LetterIcon from "./LetterIcon.vue";

    // A disclosure button that sits inside a sentence of the letter, in
    // place of the word it annotates. It opens the note that follows the
    // paragraph (`controls` is that note's id).
    defineProps<{
        controls: string;
        expanded: boolean;
        icon: IconDefinition;
    }>();
    defineEmits<{ toggle: [] }>();
</script>

<template>
    <button
        class="letter-chip"
        type="button"
        :aria-expanded="expanded"
        :aria-controls="controls"
        @click="$emit('toggle')"
    >
        <LetterIcon :icon="icon" />
        <slot />
        <svg class="letter-chip-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M2 4.5 6 8.5 10 4.5" />
        </svg>
    </button>
</template>

<style scoped>
    .letter-chip {
        font-family: var(--font-mono);
        font-size: 0.74em;
        font-weight: 500;
        line-height: 1.2;
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        min-height: 28px;
        padding: 0.25em 0.7em 0.25em 0.6em;
        margin-inline: 0.05em;
        vertical-align: 0.08em;
        border: 0;
        border-radius: 11px;
        background: var(--letter-cta);
        color: var(--letter-on-cta);
        cursor: pointer;
        white-space: nowrap;
        transition:
            background-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.12s ease;
    }
    .letter-chip:hover,
    .letter-chip[aria-expanded="true"] {
        background: var(--letter-container);
        color: var(--letter-on-container);
        box-shadow: var(--letter-shadow);
    }
    .letter-chip:active {
        transform: scale(0.96);
    }
    .letter-chip:focus-visible {
        outline: 3px solid var(--letter-primary);
        outline-offset: 3px;
    }
    .letter-chip-caret {
        width: 0.7em;
        height: 0.7em;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.5;
        transition: transform 0.2s ease;
    }
    .letter-chip[aria-expanded="true"] .letter-chip-caret {
        transform: rotate(180deg);
    }
    @media (prefers-reduced-motion: reduce) {
        .letter-chip,
        .letter-chip-caret {
            transition: none;
        }
    }
</style>
