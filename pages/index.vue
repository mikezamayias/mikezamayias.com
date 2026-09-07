<script setup lang="ts">
    import { HOME_DATA_KEY, useHomeData } from "~/composables/useHomeData";

    const { locale, t } = useI18n();
    const home = useHomeData(locale);
    provide(HOME_DATA_KEY, home);

    // Defaults emit <html lang>, <html dir>, OG locale, and hreflang
    // alternates — and they update reactively with the active locale.
    const head = useLocaleHead();
    useHead(head);

    // Plan F: localized meta description for Lighthouse SEO (≥0.95).
    useSeoMeta({
        title: "Home · Mike Zamayias",
        description: () => t("meta.description.home"),
    });

    // Eager prewarm of every public list moved to `app.vue` so the
    // SSR pass populates the payload for `/work` + `/writing` on
    // any entry route — not just `/`.
</script>

<template>
    <main id="main" role="main" class="codex-home codex-container-wide">
        <!--
            Above-the-fold: hero + Selected Work mount eagerly. These
            are the LCP candidates and must hydrate immediately so the
            typewriter / list interactions are usable on first paint.
        -->
        <CodexHero />
        <CodexSelectedWork />

        <!--
            Below-the-fold: defer hydration until the section enters
            the viewport. `<Lazy*>` auto-imports defer the component
            chunk download AND `:hydrate-on-visible` skips the
            hydration cost until IntersectionObserver fires. SSR
            still renders the HTML so users on slow connections see
            the full page from the SSR response — only the JS
            wakeup is deferred. Cuts ~400-500 ms off the home
            first-paint TTI on cold loads.
        -->
        <LazyCodexRecentWriting :hydrate-on-visible="{ rootMargin: '100px' }" />
        <LazyCodexCurrentlyShipping :hydrate-on-visible="{ rootMargin: '100px' }" />
        <LazyCodexAboutSummary :hydrate-on-visible="{ rootMargin: '100px' }" />
        <LazyCodexContactCta :hydrate-on-visible="{ rootMargin: '100px' }" />
    </main>
</template>
