<script setup lang="ts">
    import SkipLink from "~/components/codex/SkipLink.vue";
    import ConsentBanner from "~/components/codex/ConsentBanner.vue";
    // `computed` and `useRoute` are Nuxt auto-imports — no explicit
    // import needed. Matches the existing app.vue pattern.
    const route = useRoute();
    // Skip the consent banner under the admin layout — admins are the
    // operator (not the audience for analytics), and the banner would
    // otherwise stack above the admin mobile nav (z-50 vs the banner's
    // z-80, see PR #82 review follow-up).
    //
    // Two-channel check because `pages/admin/login.vue` deliberately uses
    // `definePageMeta({ layout: false })` to render its own card-only
    // shell, so a `meta.layout === "admin"` check alone would re-admit
    // the banner on the login screen. The path-prefix fallback covers
    // it. The `(\/el)?\/admin` pattern handles the i18n locale prefix
    // (`/admin/*` for the default EN locale, `/el/admin/*` for EL) and
    // requires a trailing `/` or end-of-path so `/administrators-list`
    // (hypothetical) doesn't accidentally match.
    const isAdminContext = computed<boolean>(
        () => route.meta.layout === "admin" || /^(?:\/el)?\/admin(?:\/|$)/.test(route.path)
    );
    const showConsentBanner = computed<boolean>(() => !isAdminContext.value);
</script>

<template>
    <SkipLink />
    <NuxtLayout>
        <!--
            Plan I — universal page transition + per-route component
            caching across the public surface.

            `<NuxtPage>` `transition` wraps every route change in a
            250 ms fade so the eye stops registering each nav as a
            discrete "page popped". `:keepalive` instructs Vue to
            preserve the component instances in memory as the user
            navigates, so /work → /writing → /work doesn't unmount
            + remount the list pages. That kills the cause of the
            cold-fetch flash entirely: `useAsyncData` doesn't
            re-run, the snapshot listener stays open, the rendered
            DOM is just hidden and reshown.

            Admin routes opt out by setting `definePageMeta({
                pageTransition: false,
                keepalive: false,
            })` if/when we want bespoke behaviour there.
        -->
        <NuxtPage :transition="{ name: 'codex-page', mode: 'out-in' }" :keepalive="{ max: 8 }" />
    </NuxtLayout>
    <!-- ConsentBanner is client-only: useConsent reads localStorage which
         is server-blind. Without ClientOnly, returning users hit a Vue
         hydration mismatch warning (server: needsDecision=true → client
         flips to false on mount). -->
    <ClientOnly>
        <ConsentBanner v-if="showConsentBanner" />
    </ClientOnly>
</template>
