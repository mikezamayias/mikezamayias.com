<template>
    <div
        :class="
            cn(
                'animate-pulse rounded-md bg-surfacevariant-light dark:bg-surfacevariant-dark',
                props.class
            )
        "
    />
</template>

<script setup lang="ts">
    import { cn } from "~/lib/utils";

    const props = defineProps<{
        class?: string;
    }>();
</script>
