<template>
    <AdminDocumentEditor :id="String(route.params.id)" section="skills" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
    const route = useRoute();
</script>
