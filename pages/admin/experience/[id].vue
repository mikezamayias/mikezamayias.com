<template>
    <AdminDocumentEditor :id="String(route.params.id)" section="experience" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
    const route = useRoute();
</script>
