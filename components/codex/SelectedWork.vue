<script setup lang="ts">
    import SkeletonRow from "./SkeletonRow.vue";
    import CodexError from "./CodexError.vue";
    import { HOME_DATA_KEY } from "~/composables/useHomeData";
    import { formatWorkRange, formatWorkStack } from "~/utils/workFormat";

    const home = inject(HOME_DATA_KEY);
    if (!home) throw new Error("HOME_DATA_KEY not provided — render inside pages/index.vue");

    const { locale, t } = useI18n();
    const localePath = useLocalePath();

    // Top 4 work entries from the batched payload.
    const items = computed(() => (home.data.value?.work ?? []).slice(0, 4));

    const isLoading = computed(() => home.pending.value && home.data.value === null);
    const isError = computed(() => Boolean(home.error.value));
    const hasSoftError = computed(() => !home.pending.value && home.data.value === null);
</script>

<template>
    <section v-codex-reveal class="codex-section codex-container codex-reveal" data-section="work">
        <h2 class="codex-h2" data-codex-h2>{{ t("section.work.heading") }}</h2>
        <SkeletonRow v-if="isLoading" :rows="4" variant="work" />
        <CodexError
            v-else-if="isError || hasSoftError"
            :error="home.error.value ?? new Error('timeout')"
            :retry="home.refresh"
        />
        <ul v-else class="codex-list codex-content-list">
            <li
                v-for="(project, i) in items"
                :key="project.slug"
                v-codex-reveal="i * 80"
                class="codex-reveal"
            >
                <NuxtLink
                    :to="localePath(`/work/${project.slug}`)"
                    class="codex-list-row codex-list-link codex-content-link"
                >
                    <span class="codex-content-date">{{ formatWorkRange(project) }}</span>
                    <span class="codex-content-title">{{
                        project.locale[locale]?.name ?? project.slug
                    }}</span>
                    <span class="codex-content-meta">{{ formatWorkStack(project.stack) }}</span>
                    <span class="codex-content-desc">{{ project.locale[locale]?.desc }}</span>
                </NuxtLink>
            </li>
        </ul>
    </section>
</template>

<style scoped>
    .codex-section {
        padding: 3rem 0 1.5rem;
    }
    .codex-h2 {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--soft);
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--line);
    }
</style>
