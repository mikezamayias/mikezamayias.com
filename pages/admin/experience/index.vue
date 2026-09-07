<template>
    <AdminCollectionList section="experience" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
</script>
