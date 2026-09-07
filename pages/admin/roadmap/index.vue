<template>
    <AdminCollectionList section="roadmap" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
</script>
