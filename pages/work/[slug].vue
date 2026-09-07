<script setup lang="ts">
    import { computed } from "vue";
    import { useRoute } from "vue-router";
    import SkeletonRow from "~/components/codex/SkeletonRow.vue";
    import CodexError from "~/components/codex/CodexError.vue";
    import { formatWorkRange, formatWorkStack } from "~/utils/workFormat";

    // Plan B Task 17 (rev 1.6): /work/[slug] — work detail.
    const route = useRoute();
    const { locale, t } = useI18n();
    const slug = computed(() => String(route.params.slug));
    const { data: work, pending, error, refresh } = useWorkEntry(slug);

    const workRange = computed(() => (work.value ? formatWorkRange(work.value) : ""));
    const workStack = computed(() => (work.value ? formatWorkStack(work.value.stack) : ""));
    const hasMeta = computed(() => Boolean(workRange.value || workStack.value));

    const ogImageUrl = computed(
        () =>
            `https://mikezamayias.com/api/og/work/${encodeURIComponent(slug.value)}?locale=${locale.value}`
    );

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: () =>
            work.value
                ? `${work.value.locale?.[locale.value]?.name ?? work.value.slug} · Mike Zamayias`
                : "Work · Mike Zamayias",
        description: () =>
            work.value?.locale?.[locale.value]?.desc ??
            "A mobile project by Mike Zamayias, built with Flutter and native Android.",
    });
    // Plan F Task 7: per-page og:image points at the server-rendered
    // /api/og/work/[slug] PNG (1200x630). Cached at the edge by the
    // Cache-Control middleware so repeat shares hit CDN, not Firestore.
    useHead(() => ({
        meta: [
            {
                property: "og:image",
                content: ogImageUrl.value,
            },
            {
                name: "twitter:image",
                content: ogImageUrl.value,
            },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
        ],
    }));
</script>

<template>
    <main id="main" role="main" class="codex-container">
        <SkeletonRow v-if="pending && !work" :rows="6" variant="work" />
        <CodexError v-else-if="error" :error="error" :retry="refresh" />
        <article v-else-if="work">
            <div v-if="hasMeta" class="codex-work-meta" aria-label="Work metadata">
                <span v-if="workRange" class="codex-work-meta-item">{{ workRange }}</span>
                <span v-if="workStack" class="codex-work-meta-item">{{ workStack }}</span>
            </div>
            <h1 class="codex-h1-page">
                {{ work.locale?.[locale]?.name ?? work.slug }}
            </h1>
            <p v-if="work.locale?.[locale]?.desc" class="codex-lede">
                {{ work.locale?.[locale]?.desc }}
            </p>
            <p v-if="work.locale?.[locale]?.long" class="codex-long">
                {{ work.locale?.[locale]?.long }}
            </p>
            <ul v-if="work.links?.length" class="codex-link-list">
                <li v-for="(link, i) in work.links" :key="i">
                    <a :href="link.url" target="_blank" rel="noopener noreferrer">
                        {{ link.label ?? link.kind }}
                    </a>
                </li>
            </ul>
        </article>
        <p v-else>{{ t("page.work.notFound") }}</p>
    </main>
</template>

<style scoped>
    .codex-work-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem 0.9rem;
        font-family: var(--font-mono);
        color: var(--soft);
        margin-top: 4rem;
    }
    .codex-work-meta-item {
        display: inline-flex;
        max-width: 100%;
        line-height: 1.55;
        overflow-wrap: anywhere;
    }
    .codex-h1-page {
        font-family: var(--font-display);
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 0.5rem 0 1.5rem;
    }
    .codex-lede {
        font-size: 1.125rem;
        color: var(--fg);
        margin-bottom: 1rem;
    }
    .codex-long {
        color: var(--soft);
        margin-bottom: 2rem;
    }
    .codex-link-list {
        list-style: none;
        padding: 0;
    }
    .codex-link-list li {
        padding: 0.5rem 0;
        border-top: 1px solid var(--rule-soft);
    }
    .codex-link-list a {
        color: var(--accent);
    }
</style>
