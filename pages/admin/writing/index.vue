<template>
    <AdminCollectionList section="writing" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
</script>
