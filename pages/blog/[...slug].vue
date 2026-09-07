<script setup lang="ts">
    const route = useRoute();
    const slug = Array.isArray(route.params.slug)
        ? route.params.slug.filter(Boolean).join("/")
        : String(route.params.slug || "");

    await navigateTo(slug ? `/writing/${slug}` : "/writing", { redirectCode: 301 });
</script>

<template>
    <span class="sr-only">Redirecting to writing.</span>
</template>
