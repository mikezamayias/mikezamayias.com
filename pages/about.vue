<script setup lang="ts">
    import SkeletonRow from "~/components/codex/SkeletonRow.vue";
    import CodexError from "~/components/codex/CodexError.vue";
    import {
        useAbout,
        useCertifications,
        useEducation,
        useExperience,
        useSkills,
        useSocialLinks,
    } from "~/composables/useCodexContent";

    const { locale, t } = useI18n();
    const { data: about, pending, error, refresh } = useAbout();
    const { data: experience } = useExperience();
    const { data: skills } = useSkills();
    const { data: education } = useEducation();
    const { data: certifications } = useCertifications();
    const { data: social } = useSocialLinks();
    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "About · Mike Zamayias",
        description:
            "Mike Zamayias, mobile engineer in Heraklion, Crete. Experience, skills, and apps.",
    });

    const localized = (value?: { en?: string; el?: string }) =>
        value?.[locale.value] || value?.en || value?.el || "";
    const groupedSkills = computed(() => {
        const groups = new Map<string, string[]>();
        for (const skill of skills.value ?? []) {
            const list = groups.get(skill.category) ?? [];
            list.push(skill.name);
            groups.set(skill.category, list);
        }
        return Array.from(groups.entries());
    });
    const visibleSocial = computed(() => (social.value ?? []).filter((entry) => entry.visible));
</script>

<template>
    <main id="main" role="main" class="codex-container">
        <SkeletonRow v-if="pending && !about" :rows="8" variant="about" />
        <CodexError v-else-if="error" :error="error" :retry="refresh" />
        <article v-else-if="about">
            <h1 v-if="about.name?.[locale]" class="codex-h1-page">
                {{ about.name[locale] }}
            </h1>
            <p v-if="about.intro?.[locale]" class="codex-lede">
                {{ about.intro[locale] }}
            </p>
            <dl class="codex-about-grid">
                <div v-if="about.role?.[locale]">
                    <dt>{{ t("about.role") }}</dt>
                    <dd>{{ about.role[locale] }}</dd>
                </div>
                <div v-if="about.location?.[locale]">
                    <dt>{{ t("about.location") }}</dt>
                    <dd>{{ about.location[locale] }}</dd>
                </div>
                <div v-if="about.stacks?.[locale]">
                    <dt>{{ t("about.stacks") }}</dt>
                    <dd>{{ about.stacks[locale] }}</dd>
                </div>
                <div v-if="about.current?.[locale]">
                    <dt>{{ t("about.current") }}</dt>
                    <dd>{{ about.current[locale] }}</dd>
                </div>
                <div v-if="about.years?.[locale]">
                    <dt>{{ t("about.years") }}</dt>
                    <dd>{{ about.years[locale] }}</dd>
                </div>
            </dl>
            <p v-if="about.bio?.[locale]" class="codex-bio">
                {{ about.bio[locale] }}
            </p>

            <section v-if="experience?.length" class="codex-detail-section">
                <h2>{{ t("about.experience") }}</h2>
                <div class="codex-timeline">
                    <article v-for="item in experience" :key="item.id" class="codex-timeline-item">
                        <p v-if="item.start || item.end" class="codex-period">
                            {{ item.start }} - {{ item.end || t("about.present") }}
                        </p>
                        <h3 v-if="localized(item.role)">{{ localized(item.role) }}</h3>
                        <a
                            v-if="item.companyUrl && item.company"
                            :href="item.companyUrl"
                            rel="noreferrer"
                            target="_blank"
                        >
                            {{ item.company }}
                        </a>
                        <p v-else-if="item.company">{{ item.company }}</p>
                        <p v-if="localized(item.summary)">{{ localized(item.summary) }}</p>
                    </article>
                </div>
            </section>

            <section v-if="groupedSkills.length" class="codex-detail-section">
                <h2>{{ t("about.skills") }}</h2>
                <div class="codex-skill-groups">
                    <div v-for="[category, names] in groupedSkills" :key="category">
                        <h3>{{ category }}</h3>
                        <ul>
                            <li v-for="name in names" :key="name">{{ name }}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section v-if="education?.length" class="codex-detail-section">
                <h2>{{ t("about.education") }}</h2>
                <div class="codex-list">
                    <article v-for="item in education" :key="item.id">
                        <p v-if="item.start || item.end" class="codex-period">
                            {{ item.start }} - {{ item.end || t("about.present") }}
                        </p>
                        <h3 v-if="item.institution">{{ item.institution }}</h3>
                        <p v-if="localized(item.degree)">{{ localized(item.degree) }}</p>
                    </article>
                </div>
            </section>

            <section v-if="certifications?.length" class="codex-detail-section">
                <h2>{{ t("about.certifications") }}</h2>
                <div class="codex-list">
                    <article v-for="item in certifications" :key="item.id">
                        <p v-if="item.issued" class="codex-period">{{ item.issued }}</p>
                        <h3 v-if="item.name">{{ item.name }}</h3>
                        <p v-if="item.issuer">{{ item.issuer }}</p>
                    </article>
                </div>
            </section>

            <section v-if="visibleSocial.length" class="codex-detail-section">
                <h2>{{ t("about.links") }}</h2>
                <div class="codex-social-links">
                    <a
                        v-for="item in visibleSocial"
                        :key="item.id"
                        :href="item.url"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {{ item.label }}
                    </a>
                </div>
            </section>
        </article>
    </main>
</template>

<style scoped>
    .codex-h1-page {
        font-family: var(--font-display);
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 4rem 0 1rem;
    }
    .codex-lede {
        font-size: 1.125rem;
        color: var(--fg);
        margin-bottom: 2rem;
    }
    .codex-about-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
        font-family: var(--font-mono);
        font-size: 0.875rem;
    }
    .codex-about-grid dt {
        color: var(--faint);
        margin-bottom: 0.25rem;
    }
    .codex-about-grid dd {
        color: var(--fg);
        margin: 0;
    }
    .codex-bio {
        color: var(--soft);
        line-height: 1.7;
        max-width: 38rem;
    }
    .codex-detail-section {
        border-top: 1px solid var(--line);
        margin-top: 2.5rem;
        padding-top: 2rem;
    }
    .codex-detail-section h2 {
        color: var(--soft);
        font-family: var(--font-mono);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        margin: 0 0 1rem;
    }
    .codex-timeline,
    .codex-list {
        display: grid;
        gap: 1.25rem;
    }
    .codex-timeline-item,
    .codex-list article {
        display: grid;
        gap: 0.35rem;
    }
    .codex-timeline h3,
    .codex-list h3,
    .codex-skill-groups h3 {
        font-size: 1rem;
        margin: 0;
    }
    .codex-timeline p,
    .codex-list p {
        color: var(--soft);
        margin: 0;
    }
    .codex-timeline a {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 0.25em;
    }
    .codex-period {
        color: var(--faint) !important;
        font-family: var(--font-mono);
        font-size: 0.78rem;
    }
    .codex-skill-groups {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .codex-skill-groups ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        list-style: none;
        margin: 0.5rem 0 0;
        padding: 0;
    }
    .codex-skill-groups li,
    .codex-social-links a {
        border: 1px solid color-mix(in oklch, var(--line) 62%, transparent);
        border-radius: 999px;
        background: color-mix(in oklch, var(--surface-card, var(--surface)) 86%, transparent);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 0.78rem;
        padding: 0.4rem 0.55rem;
        text-decoration: none;
        transition:
            border-color 0.2s var(--ease-out-expo),
            background-color 0.2s var(--ease-out-expo),
            transform 0.2s var(--ease-out-expo);
    }
    .codex-social-links a:hover {
        border-color: color-mix(in oklch, var(--accent) 45%, var(--line));
        background: var(--surface-hover);
        transform: translateY(-1px);
    }
    .codex-social-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    @media (width <= 600px) {
        .codex-about-grid {
            grid-template-columns: 1fr;
        }
        .codex-skill-groups {
            grid-template-columns: 1fr;
        }
    }
</style>
