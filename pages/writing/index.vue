<script setup lang="ts">
    import SkeletonRow from "~/components/codex/SkeletonRow.vue";
    import CodexError from "~/components/codex/CodexError.vue";

    // Plan B Task 17 (rev 1.6): /writing index — list of published writing entries.
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const { data: writing, error, refresh } = useWriting({ locale, limit: 50 });

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "Writing · Mike Zamayias",
        description: "Notes by Mike Zamayias on Flutter, Dart, and Android.",
    });
</script>

<template>
    <main id="main" role="main" class="codex-container">
        <h1 class="codex-h1-page">{{ t("page.writing.heading") }}</h1>
        <Transition name="codex-fade" mode="out-in">
            <!--
                writing === null/undefined → snapshot still resolving → skeleton.
                writing.length === 0       → resolved with no published entries → empty state.
                writing.length > 0         → list. Without the explicit nullish check the
                                              old `!writing?.length` predicate stayed truthy
                                              forever once the array came back empty,
                                              leaving /writing in infinite skeleton.
            -->
            <SkeletonRow
                v-if="writing == null && !error"
                key="skeleton"
                :rows="3"
                variant="writing"
            />
            <CodexError v-else-if="error" key="error" :error="error" :retry="refresh" />
            <p v-else-if="!writing || writing.length === 0" key="empty" class="codex-empty">
                Nothing published yet.
            </p>
            <ul v-else key="list" class="codex-list codex-content-list">
                <li v-for="entry in writing" :key="entry.slug">
                    <NuxtLink
                        :to="localePath(`/writing/${entry.slug}`)"
                        class="codex-list-row codex-list-link codex-content-link"
                    >
                        <span class="codex-content-date">{{ entry.date }}</span>
                        <span class="codex-content-title">
                            {{ entry.locale?.[locale]?.title ?? entry.slug }}
                        </span>
                        <span class="codex-content-desc">
                            {{ entry.locale?.[locale]?.sub }}
                        </span>
                        <span class="codex-content-meta">
                            {{ entry.read }}min · {{ entry.tags?.[0] }}
                        </span>
                    </NuxtLink>
                </li>
            </ul>
        </Transition>
    </main>
</template>

<style scoped>
    .codex-h1-page {
        font-family: var(--font-display);
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 4rem 0 2rem;
    }
    .codex-empty {
        color: var(--soft);
        font-family: var(--font-mono);
        padding: 1rem 0;
    }
</style>
