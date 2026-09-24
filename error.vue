<script setup lang="ts">
    // Nuxt universal error boundary. Handles every uncaught error that
    // reaches the page level — 404 from the catch-all route, 5xx from
    // a failed SSR fetch, hydration boundary failures, etc.
    //
    // `error.vue` is a ROOT-level convention that fully replaces
    // `app.vue` during error rendering (not just `<NuxtPage />`), so any
    // global mounts from app.vue must be repeated here. We re-mount
    // SkipLink + the consent banner so the a11y + consent contract is
    // preserved on error pages too, and wrap the page in the default
    // layout so it keeps the site's frame.
    //
    // Receives `error` from Nuxt's renderer (typed as `NuxtError`). The
    // `statusCode` is the only field we branch on; status text and
    // stack are exposed in dev via Nuxt's overlay, not duplicated here.
    import type { NuxtError } from "#app";
    import SkipLink from "~/components/codex/SkipLink.vue";
    import ConsentBanner from "~/components/codex/ConsentBanner.vue";

    const props = defineProps<{ error: NuxtError }>();

    const { t, locale } = useI18n();
    const localePath = useLocalePath();

    // Branch only on 404 (the high-volume case: typo'd URLs, retired
    // routes). Every other status code — 4xx (400/401/403/429 thrown by
    // the contact form + render endpoint), 5xx, network failure — falls
    // through to a generic "something went wrong" copy that doesn't
    // misattribute the failure to "our side" when it could be the
    // request that's malformed.
    const isNotFound = computed<boolean>(() => props.error.statusCode === 404);
    const titleKey = computed(() =>
        isNotFound.value ? "error.page.title404" : "error.page.titleGeneric"
    );
    const kickerKey = computed(() =>
        isNotFound.value ? "error.page.kicker404" : "error.page.kickerGeneric"
    );
    const headingKey = computed(() =>
        isNotFound.value ? "error.page.heading404" : "error.page.headingGeneric"
    );
    const ledeKey = computed(() =>
        isNotFound.value ? "error.page.lede404" : "error.page.ledeGeneric"
    );

    useHead({
        title: () => t(titleKey.value),
        meta: [
            // Both 404 and 5xx tell crawlers not to follow / index — the
            // canonical home page is the right entry surface.
            { name: "robots", content: "noindex, nofollow" },
            // The status code itself is in the HTTP response (Nuxt sets it
            // automatically from the thrown error), no `<meta http-equiv>`
            // shim needed.
        ],
        htmlAttrs: {
            lang: locale.value,
        },
    });

    // `clearError` returns Promise<void>; await it so any redirect-middleware
    // rejection surfaces to Sentry (the unhandled-promise capture is wired
    // but explicit await produces cleaner traces).
    const handleHome = async () => {
        await clearError({ redirect: localePath("/") });
    };
</script>

<template>
    <SkipLink />
    <NuxtLayout name="default">
        <main id="main" class="page" data-section="error">
            <p class="page-kicker">{{ t(kickerKey) }}</p>
            <h1 class="page-title">{{ t(headingKey) }}</h1>
            <p class="page-lede">{{ t(ledeKey) }}</p>
            <!-- NuxtLink rather than a button because this is
                 navigation, not an action. clearError() is called via
                 @click so the error state is reset before the route
                 resolves; the link's `to` still triggers the actual
                 navigation. -->
            <NuxtLink :to="localePath('/')" class="page-pill" @click.prevent="handleHome">
                {{ t("error.page.home") }}
            </NuxtLink>
        </main>
    </NuxtLayout>
    <!-- Same `<ClientOnly>` reasoning as app.vue: useConsent reads
         localStorage which is server-blind. -->
    <ClientOnly>
        <ConsentBanner />
    </ClientOnly>
</template>
