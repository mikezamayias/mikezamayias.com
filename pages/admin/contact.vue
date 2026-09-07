<template>
    <AdminSingletonEditor section="contact" />
</template>

<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
</script>
