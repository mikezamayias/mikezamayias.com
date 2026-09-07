<template>
    <!--
        Plan I — public default layout.

        Lives OUTSIDE the `<NuxtPage>` transition wrapper in
        `app.vue`, so the nav + shell stay anchored on every route
        change. Only the `<slot />` (page content) fades, which
        gives the eye a stable frame to scan during nav. Before
        this layout existed, every public page rendered its own
        `<CodexNav>` + `<div class="codex-shell">`, so the
        universal page transition faded the nav out and back in on
        every route — no visual anchor.

        Admin pages use `layouts/admin.vue`; the catch-all 404 page
        renders its own shell.
    -->
    <div class="codex-shell">
        <CodexNav />
        <slot />
        <CodexFooter />
    </div>
</template>

<script setup lang="ts">
    import CodexNav from "~/components/codex/CodexNav.vue";
    import CodexFooter from "~/components/codex/CodexFooter.vue";
</script>
