<template>
    <AdminSingletonEditor section="profile" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
</script>
