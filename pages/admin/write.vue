<script setup lang="ts">
    definePageMeta({ layout: "admin", middleware: "admin-auth" });
    await navigateTo("/admin/writing", { redirectCode: 301 });
</script>
