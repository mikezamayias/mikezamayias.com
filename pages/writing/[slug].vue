<script setup lang="ts">
    import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
    import CodexError from "~/components/codex/CodexError.vue";
    import LetterIcon from "~/components/letter/LetterIcon.vue";
    import { formatPostDate } from "~/utils/dateFormat";

    // /writing/<slug>: one post. The body is Markdown rendered and
    // sanitized on the server (/api/render/writing/<slug>), so the page
    // gets HTML and never ships the Markdown renderer.
    const route = useRoute();
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const slug = computed(() => String(route.params.slug));
    const { data: writing, error, refresh } = await useWritingEntry(slug);

    const { data: renderedHtml } = await useAsyncData(
        () => `render:writing:${slug.value}:${locale.value}`,
        () =>
            $fetch<string>(`/api/render/writing/${slug.value}`, {
                query: { locale: locale.value },
            }).catch(() => ""),
        { watch: [slug, locale] }
    );

    const copy = computed(() => writing.value?.locale?.[locale.value] ?? null);
    const title = computed(() => copy.value?.title ?? writing.value?.slug ?? "");

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: () => (writing.value ? `${title.value} · Mike Zamayias` : "Writing · Mike Zamayias"),
        description: () => copy.value?.sub ?? t("page.writing.description"),
    });
</script>

<template>
    <main id="main" class="page">
        <NuxtLink :to="localePath('/writing')" class="page-back">
            <LetterIcon :icon="faArrowLeft" />{{ t("page.writing.back") }}
        </NuxtLink>

        <CodexError v-if="error" :error="error" :retry="refresh" />
        <article v-else-if="writing">
            <p class="page-facts">
                <time :datetime="writing.date">{{ formatPostDate(writing.date) }}</time
                ><template v-if="writing.read">
                    · {{ t("page.writing.readTime", { n: writing.read }) }}</template
                >
            </p>
            <h1 class="page-title">{{ title }}</h1>
            <p v-if="copy?.sub" class="page-lede page-soft">{{ copy.sub }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="renderedHtml" class="page-prose" v-html="renderedHtml" />
            <p v-else class="page-empty" role="status">
                {{ t("page.writing.bodyUnavailable") }}
            </p>
        </article>
        <p v-else class="page-empty">{{ t("page.writing.notFound") }}</p>
    </main>
</template>
