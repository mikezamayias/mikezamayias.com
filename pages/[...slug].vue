<script setup lang="ts">
    // 404 catch-all. Throws a 404 NuxtError so the universal error
    // boundary at `~/error.vue` renders the brand-styled 404 page
    // (in the site frame). Plan B Task 18 simplified this from the
    // legacy Nuxt-Content dynamic-page lookup — only the throw remains.
    throw createError({
        statusCode: 404,
        statusMessage: "Page Not Found",
        // `fatal: true` ensures the boundary triggers on client-side
        // navigation too — not just SSR. Without it, a SPA navigation to
        // an unmatched route renders the page's empty template instead of
        // routing to error.vue.
        fatal: true,
    });
</script>

<template>
    <!-- Template never renders — the throw above is hit during setup,
         Nuxt routes to error.vue. Kept as a placeholder for the
         single-file-component convention. -->
    <div />
</template>
