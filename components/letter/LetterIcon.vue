<script setup lang="ts">
    import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

    // Renders a FontAwesome icon definition as a bare inline SVG. The
    // letter imports the few icons it needs straight from the icon
    // packages instead of registering them in the global library.
    const props = defineProps<{ icon: IconDefinition }>();

    const viewBox = computed(() => `0 0 ${props.icon.icon[0]} ${props.icon.icon[1]}`);
    const path = computed(() => {
        const d = props.icon.icon[4];
        return Array.isArray(d) ? d.join(" ") : d;
    });
</script>

<template>
    <svg class="letter-icon" :viewBox="viewBox" aria-hidden="true" focusable="false">
        <path :d="path" fill="currentColor" />
    </svg>
</template>

<style scoped>
    .letter-icon {
        width: 1em;
        height: 1em;
        flex: none;
    }
</style>
