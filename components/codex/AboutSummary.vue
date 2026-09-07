<script setup lang="ts">
    import SkeletonRow from "./SkeletonRow.vue";
    import CodexError from "./CodexError.vue";
    import { HOME_DATA_KEY } from "~/composables/useHomeData";

    const home = inject(HOME_DATA_KEY);
    if (!home) throw new Error("HOME_DATA_KEY not provided — render inside pages/index.vue");

    const { locale, t } = useI18n();

    const about = computed(() => home.data.value?.about ?? null);

    const isLoading = computed(() => home.pending.value && home.data.value === null);
    const isError = computed(() => Boolean(home.error.value));
    const hasSoftError = computed(() => !home.pending.value && home.data.value === null);
</script>

<template>
    <section v-codex-reveal class="codex-section codex-container codex-reveal" data-section="about">
        <h2 class="codex-h2" data-codex-h2>{{ t("section.about.heading") }}</h2>
        <SkeletonRow v-if="isLoading" :rows="6" variant="about" />
        <CodexError
            v-else-if="isError || hasSoftError"
            :error="home.error.value ?? new Error('timeout')"
            :retry="home.refresh"
        />
        <template v-else-if="about">
            <p v-if="about.intro?.[locale]" class="codex-about-intro">
                {{ about.intro[locale] }}
            </p>
            <dl class="codex-about-grid">
                <div v-if="about.name?.[locale]" class="codex-about-cell">
                    <dt>name</dt>
                    <dd>{{ about.name[locale] }}</dd>
                </div>
                <div v-if="about.location?.[locale]" class="codex-about-cell">
                    <dt>location</dt>
                    <dd>{{ about.location[locale] }}</dd>
                </div>
                <div v-if="about.role?.[locale]" class="codex-about-cell">
                    <dt>role</dt>
                    <dd>{{ about.role[locale] }}</dd>
                </div>
                <div v-if="about.stacks?.[locale]" class="codex-about-cell">
                    <dt>stacks</dt>
                    <dd>{{ about.stacks[locale] }}</dd>
                </div>
                <div v-if="about.current?.[locale]" class="codex-about-cell">
                    <dt>current</dt>
                    <dd>{{ about.current[locale] }}</dd>
                </div>
                <div v-if="about.years?.[locale]" class="codex-about-cell">
                    <dt>years</dt>
                    <dd>{{ about.years[locale] }}</dd>
                </div>
            </dl>
            <p v-if="about.bio?.[locale]" class="codex-about-bio">
                {{ about.bio[locale] }}
            </p>
        </template>
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
    .codex-about-intro {
        font-size: 1rem;
        color: var(--fg);
        line-height: 1.6;
        margin: 0 0 1.5rem;
        max-width: 60ch;
    }
    .codex-about-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem 1.5rem;
        margin: 0 0 1.5rem;
    }
    .codex-about-cell {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--rule-soft);
    }
    .codex-about-cell dt {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--faint);
    }
    .codex-about-cell dd {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: var(--fg);
        margin: 0;
    }
    .codex-about-bio {
        font-size: 0.95rem;
        color: var(--soft);
        line-height: 1.7;
        margin: 0;
        max-width: 65ch;
    }

    @media (width <= 600px) {
        .codex-about-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }
    }
</style>
