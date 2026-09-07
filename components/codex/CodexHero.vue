<script setup lang="ts">
    import SkeletonRow from "./SkeletonRow.vue";
    import CodexError from "./CodexError.vue";
    import { HOME_DATA_KEY } from "~/composables/useHomeData";
    import { useSocialLinks } from "~/composables/useCodexContent";

    const { locale } = useI18n();
    const home = inject(HOME_DATA_KEY);
    // Plan B Task 15 lands CodexHero on its injected payload. Task 16 wires
    // pages/index.vue to provide HOME_DATA_KEY. Between the two commits the
    // home-page prerender would crash on a missing inject, so we degrade to
    // a skeleton instead. In dev (and in normal use) this branch is dead code
    // because index.vue always provides the key.
    if (!home && import.meta.dev) {
        console.warn("[CodexHero] HOME_DATA_KEY not provided — render inside pages/index.vue");
    }
    const localePath = useLocalePath();

    const hero = computed(() => home?.data.value?.hero ?? null);
    const { data: social } = useSocialLinks();
    const visibleSocial = computed(() => (social.value ?? []).filter((entry) => entry.visible));
    const meta = computed(() => hero.value?.meta?.[locale.value]);
    const ctaLabels = {
        en: { work: "View work", writing: "About me" },
        el: { work: "Δες τις εφαρμογές", writing: "Σχετικά με μένα" },
    };
    const localizedCtaLabels = computed(
        () => ctaLabels[locale.value as keyof typeof ctaLabels] ?? ctaLabels.en
    );
    const featuredWork = computed(() => home?.data.value?.work?.[0] ?? null);

    const isLoading = computed(() => !home || (home.pending.value && !home.data.value));
    const isError = computed(() => Boolean(home?.error.value));
    const hasSoftError = computed(() => !home?.pending.value && home?.data.value === null);
</script>

<template>
    <section class="codex-hero">
        <SkeletonRow v-if="isLoading" :rows="4" />
        <CodexError
            v-else-if="isError || hasSoftError"
            :error="home?.error.value ?? new Error('timeout')"
            :retry="home?.refresh"
        />
        <template v-else-if="hero">
            <div class="codex-hero-copy">
                <p class="codex-hero-kicker">Apps and notes</p>
                <h1 class="codex-h1">I write mobile apps.</h1>
                <p class="codex-lede" data-codex-lede>
                    Flutter for 2.3 years, then native Android for 2 years on three retail
                    e-commerce apps.
                </p>
                <div class="codex-meta">
                    <span v-if="meta?.stack">{{ meta.stack }}</span>
                    <span v-if="meta?.location">{{ meta.location }}</span>
                    <span v-if="meta?.audience">{{ meta.audience }}</span>
                </div>
                <div class="codex-ctas">
                    <NuxtLink :to="localePath('/work')" class="codex-cta codex-cta-primary">
                        {{ localizedCtaLabels.work }}
                    </NuxtLink>
                    <NuxtLink :to="localePath('/about')" class="codex-cta codex-cta-secondary">
                        {{ localizedCtaLabels.writing }}
                    </NuxtLink>
                </div>
                <nav
                    v-if="visibleSocial.length"
                    class="codex-hero-social"
                    aria-label="Social links"
                >
                    <a
                        v-for="item in visibleSocial"
                        :key="item.id"
                        :href="item.url"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ item.label }}
                    </a>
                </nav>
            </div>
            <div v-if="featuredWork" class="codex-hero-visual">
                <CodexAppPreview :work="featuredWork" :locale="locale" variant="hero" />
            </div>
        </template>
    </section>
</template>

<style scoped>
    .codex-hero {
        min-height: calc(100vh - 5rem);
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.72fr);
        gap: clamp(2.5rem, 7vw, 6rem);
        align-items: center;
        padding: clamp(4rem, 10vw, 7rem) 0 clamp(3rem, 8vw, 5rem);
    }

    .codex-hero-copy {
        min-width: 0;
    }

    .codex-hero-kicker {
        display: inline-flex;
        margin: 0 0 1rem;
        color: var(--soft);
        font-family: var(--font-mono);
        font-size: 0.76rem;
        letter-spacing: 0.04em;
    }

    .codex-h1 {
        font-family: var(--font-display);
        font-weight: 400;
        font-size: clamp(3.5rem, 10vw, 7.8rem);
        letter-spacing: -0.035em;
        line-height: 0.9;
        margin-bottom: 1.5rem;
        min-height: 1.85em;
        color: var(--fg);
        max-width: 26ch;
    }

    .codex-lede {
        font-family: var(--font-sans);
        font-size: clamp(1.03rem, 1.8vw, 1.28rem);
        color: var(--soft);
        max-width: 54ch;
        line-height: 1.7;
        margin-bottom: 1.75rem;
    }
    .codex-meta {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
        font-size: 0.78rem;
        margin-bottom: 1.75rem;
    }
    .codex-meta span {
        padding: 0.4rem 0.65rem;
        border: 1px solid color-mix(in oklch, var(--line) 58%, transparent);
        border-radius: 999px;
        background: var(--surface-card, var(--surface));
        color: var(--soft);
    }
    .codex-ctas {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
    .codex-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 1.05rem;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        cursor: pointer;
        border-radius: 8px;
        transition:
            background-color 0.45s var(--ease-out-expo),
            color 0.45s var(--ease-out-expo),
            border-color 0.45s var(--ease-out-expo),
            transform 0.45s var(--ease-out-expo);
    }
    .codex-cta-primary {
        background: var(--fg);
        color: var(--bg);
        border: 1px solid var(--fg);
    }
    .codex-cta-primary:hover {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--argent);
        transform: translateY(-2px);
    }
    .codex-cta-primary::after {
        content: "→";
        transition: transform 0.5s var(--ease-out-expo);
    }
    .codex-cta-primary:hover::after {
        transform: translateX(5px);
    }
    .codex-cta-secondary {
        border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
        background: var(--surface-card, var(--surface));
        color: var(--fg);
    }
    .codex-cta-secondary:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
    }
    .codex-cta-secondary::after {
        content: "→";
        color: var(--accent);
        margin-left: 0.25rem;
        transition: transform 0.5s var(--ease-out-expo);
    }
    .codex-cta-secondary:hover::after {
        transform: translateX(5px);
    }

    .codex-hero-social {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        margin-top: 1rem;
    }
    .codex-hero-social a {
        display: inline-flex;
        align-items: center;
        min-height: 2.15rem;
        padding: 0 0.72rem;
        border: 1px solid color-mix(in oklch, var(--line) 62%, transparent);
        border-radius: 999px;
        background: color-mix(in oklch, var(--surface-card, var(--surface)) 86%, transparent);
        color: var(--soft);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.03em;
        text-decoration: none;
        transition:
            color 0.25s var(--ease-out-expo),
            border-color 0.25s var(--ease-out-expo),
            background-color 0.25s var(--ease-out-expo),
            transform 0.25s var(--ease-out-expo);
    }
    .codex-hero-social a:hover {
        color: var(--fg);
        border-color: color-mix(in oklch, var(--accent) 45%, var(--line));
        background: var(--surface-hover);
        transform: translateY(-1px);
    }

    .codex-hero-visual {
        min-width: 0;
    }

    @media (max-width: 860px) {
        .codex-hero {
            min-height: 0;
            grid-template-columns: 1fr;
            padding: 3rem 0 2rem;
        }
        .codex-h1 {
            font-size: clamp(3rem, 17vw, 5rem);
            min-height: 1.85em;
        }
        .codex-meta {
            gap: 0.4rem;
            max-width: min(100%, calc(100vw - 3rem));
        }
        .codex-meta span {
            width: fit-content;
            max-width: 100%;
            min-width: 0;
            padding: 0.36rem 0.58rem;
        }
        .codex-ctas {
            flex-direction: column;
            align-items: stretch;
        }
        .codex-cta {
            justify-content: center;
            width: 100%;
        }
        .codex-hero-visual {
            max-width: 20rem;
            margin: 0 auto;
            width: 100%;
        }
    }
</style>
