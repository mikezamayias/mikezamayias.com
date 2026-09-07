<script setup lang="ts">
    import SkeletonRow from "~/components/codex/SkeletonRow.vue";
    import CodexError from "~/components/codex/CodexError.vue";
    import { formatWorkRange, formatWorkStack } from "~/utils/workFormat";

    // Plan B Task 17 (rev 1.6): /work index — list view of published work entries.
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const { data: work, error, refresh } = useWork({ locale, limit: 50 });

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "Work · Mike Zamayias",
        description: "Apps by Mike Zamayias, built with Flutter and native Android.",
    });
</script>

<template>
    <main id="main" role="main" class="codex-container">
        <h1 class="codex-h1-page">{{ t("page.work.heading") }}</h1>
        <Transition name="codex-fade" mode="out-in">
            <!-- See pages/writing/index.vue for rationale on the explicit null check. -->
            <SkeletonRow v-if="work == null && !error" key="skeleton" :rows="4" variant="work" />
            <CodexError v-else-if="error" key="error" :error="error" :retry="refresh" />
            <p v-else-if="!work || work.length === 0" key="empty" class="codex-empty">
                Nothing published yet.
            </p>
            <ul v-else key="list" class="codex-list codex-content-list">
                <li v-for="entry in work" :key="entry.slug">
                    <NuxtLink
                        :to="localePath(`/work/${entry.slug}`)"
                        class="codex-list-row codex-list-link codex-content-link"
                    >
                        <span class="codex-content-date">{{ formatWorkRange(entry) }}</span>
                        <span class="codex-content-title">
                            {{ entry.locale?.[locale]?.name ?? entry.slug }}
                        </span>
                        <span class="codex-content-desc">
                            {{ entry.locale?.[locale]?.desc }}
                        </span>
                        <span class="codex-content-meta">{{ formatWorkStack(entry.stack) }}</span>
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
        color: var(--fg);
    }
    .codex-empty {
        color: var(--soft);
        font-family: var(--font-mono);
        padding: 1rem 0;
    }
</style>
