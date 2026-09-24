<script setup lang="ts">
    import CodexError from "~/components/codex/CodexError.vue";
    import { formatPostDate } from "~/utils/dateFormat";

    // /writing: every published post, newest first.
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const { data: writing, error, refresh } = await useWriting({ locale, limit: 50 });

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "Writing · Mike Zamayias",
        description: () => t("page.writing.description"),
    });

    const posts = computed(() => writing.value ?? []);
</script>

<template>
    <main id="main" class="page">
        <h1 class="page-title">{{ t("page.writing.heading") }}</h1>
        <p class="page-lede">{{ t("page.writing.lede") }}</p>

        <CodexError v-if="error" :error="error" :retry="refresh" />
        <p v-else-if="!posts.length" class="page-empty">{{ t("page.writing.empty") }}</p>
        <section v-else class="page-section" :aria-label="t('page.writing.listLabel')">
            <ul class="page-entries">
                <li v-for="post in posts" :key="post.slug" class="page-entry">
                    <p class="page-facts">
                        <time :datetime="post.date">{{ formatPostDate(post.date) }}</time
                        ><template v-if="post.read">
                            · {{ t("page.writing.readTime", { n: post.read }) }}</template
                        >
                    </p>
                    <h2 class="page-entry-title">
                        <NuxtLink :to="localePath(`/writing/${post.slug}`)">{{
                            post.locale?.[locale]?.title ?? post.slug
                        }}</NuxtLink>
                    </h2>
                    <p v-if="post.locale?.[locale]?.sub">{{ post.locale[locale]!.sub }}</p>
                </li>
            </ul>
        </section>
        <p class="page-soft">
            <a href="/rss.xml">{{ t("page.writing.feed") }}</a>
        </p>
    </main>
</template>
