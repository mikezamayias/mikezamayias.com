<script setup lang="ts">
    // ContactCta does not read from the home payload — it's static i18n + a
    // hard-coded mailto. The section still lives on the home page, so the
    // injected key invariant is enforced for consistency with siblings.
    import { HOME_DATA_KEY } from "~/composables/useHomeData";

    const home = inject(HOME_DATA_KEY);
    if (!home) throw new Error("HOME_DATA_KEY not provided — render inside pages/index.vue");

    const { t } = useI18n();
    const localePath = useLocalePath();
</script>

<template>
    <section v-codex-reveal class="codex-section codex-container codex-reveal" data-section="cta">
        <h2 class="codex-h2" data-codex-h2>{{ t("section.contact.heading") }}</h2>
        <p class="codex-cta-lede">{{ t("section.contact.lede") }}</p>
        <div class="codex-ctas">
            <NuxtLink :to="localePath('/contact')" class="codex-cta codex-cta-primary">
                {{ t("section.contact.cta.start") }}
            </NuxtLink>
            <a href="mailto:contact@mikezamayias.com" class="codex-cta codex-cta-secondary">
                {{ t("section.contact.cta.email") }}
            </a>
        </div>
    </section>
</template>

<style scoped>
    .codex-section {
        padding: 3rem 0 4rem;
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
    .codex-cta-lede {
        font-size: 1.05rem;
        color: var(--fg);
        line-height: 1.6;
        margin: 0 0 1.5rem;
        max-width: 60ch;
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
        text-decoration: none;
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

    @media (width <= 720px) {
        .codex-ctas {
            flex-direction: column;
            align-items: stretch;
        }
        .codex-cta {
            justify-content: center;
            width: 100%;
        }
    }
</style>
