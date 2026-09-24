<script setup lang="ts">
    import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
    import CodexError from "~/components/codex/CodexError.vue";
    import LetterIcon from "~/components/letter/LetterIcon.vue";
    import {
        useAbout,
        useCertifications,
        useEducation,
        useExperience,
        useSkills,
        useSocialLinks,
    } from "~/composables/useCodexContent";
    import type { PerLocaleString } from "~/firebase/types";
    import { formatMonthYear, formatWorkRange } from "~/utils/workFormat";

    // /about: the short version first (intro, facts, bio), then the
    // record: experience, skills, education, certifications, links.
    const { locale, t } = useI18n();
    const [
        { data: about, error, refresh },
        { data: experience },
        { data: skills },
        { data: education },
        { data: certifications },
        { data: social },
    ] = await Promise.all([
        useAbout(),
        useExperience(),
        useSkills(),
        useEducation(),
        useCertifications(),
        useSocialLinks(),
    ]);

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "About · Mike Zamayias",
        description: () => t("page.about.description"),
    });

    const localized = (value?: PerLocaleString) =>
        value?.[locale.value] || value?.en || value?.el || "";

    const facts = computed(() =>
        (["role", "location", "stacks", "current", "years"] as const)
            .map((key) => ({ key, value: localized(about.value?.[key]) }))
            .filter((fact) => fact.value)
    );

    const SKILL_GROUPS = ["language", "framework", "platform", "tool", "other"] as const;
    const skillGroups = computed(() =>
        SKILL_GROUPS.map((category) => ({
            category,
            names: (skills.value ?? [])
                .filter((skill) => (skill.category ?? "other") === category)
                .map((skill) => skill.name),
        })).filter((group) => group.names.length)
    );

    const visibleSocial = computed(() => (social.value ?? []).filter((entry) => entry.visible));
</script>

<template>
    <main id="main" class="page">
        <h1 class="page-title">{{ t("page.about.heading") }}</h1>

        <CodexError v-if="error" :error="error" :retry="refresh" />
        <template v-else-if="about">
            <p v-if="localized(about.intro)" class="page-lede">{{ localized(about.intro) }}</p>
            <dl v-if="facts.length" class="page-dl">
                <template v-for="fact in facts" :key="fact.key">
                    <dt>{{ t(`about.${fact.key}`) }}</dt>
                    <dd>{{ fact.value }}</dd>
                </template>
            </dl>
            <p v-if="localized(about.bio)">{{ localized(about.bio) }}</p>
        </template>

        <section v-if="experience?.length" class="page-section" aria-labelledby="about-experience">
            <h2 id="about-experience">{{ t("about.experience") }}</h2>
            <ul class="page-entries">
                <li v-for="item in experience" :key="item.id" class="page-entry">
                    <h3 class="page-entry-title">{{ localized(item.role) }}</h3>
                    <p class="page-facts">
                        <a
                            v-if="item.companyUrl && item.company"
                            :href="item.companyUrl"
                            target="_blank"
                            rel="noopener"
                            >{{ item.company }}</a
                        ><template v-else>{{ item.company }}</template
                        ><template v-if="item.company && (item.start || item.end)"> · </template
                        >{{ formatWorkRange(item) }}
                    </p>
                    <p v-if="localized(item.summary)">{{ localized(item.summary) }}</p>
                    <ul v-if="item.achievements?.length" class="page-bullets">
                        <li v-for="(line, i) in item.achievements" :key="i">
                            {{ localized(line) }}
                        </li>
                    </ul>
                </li>
            </ul>
        </section>

        <section v-if="skillGroups.length" class="page-section" aria-labelledby="about-skills">
            <h2 id="about-skills">{{ t("about.skills") }}</h2>
            <dl class="page-dl">
                <template v-for="group in skillGroups" :key="group.category">
                    <dt>{{ t(`about.skillGroup.${group.category}`) }}</dt>
                    <dd>
                        <ul class="page-tags">
                            <li v-for="name in group.names" :key="name">{{ name }}</li>
                        </ul>
                    </dd>
                </template>
            </dl>
        </section>

        <section v-if="education?.length" class="page-section" aria-labelledby="about-education">
            <h2 id="about-education">{{ t("about.education") }}</h2>
            <ul class="page-entries">
                <li v-for="item in education" :key="item.id" class="page-entry">
                    <h3 class="page-entry-title">{{ localized(item.degree) }}</h3>
                    <p class="page-facts">
                        {{ item.institution
                        }}<template v-if="item.start || item.end">
                            · {{ formatWorkRange(item) }}</template
                        >
                    </p>
                </li>
            </ul>
        </section>

        <section
            v-if="certifications?.length"
            class="page-section"
            aria-labelledby="about-certifications"
        >
            <h2 id="about-certifications">{{ t("about.certifications") }}</h2>
            <ul class="page-entries">
                <li v-for="item in certifications" :key="item.id" class="page-entry">
                    <h3 class="page-entry-title">
                        <a
                            v-if="item.credentialUrl"
                            :href="item.credentialUrl"
                            target="_blank"
                            rel="noopener"
                            >{{ item.name }}</a
                        ><template v-else>{{ item.name }}</template>
                    </h3>
                    <p class="page-facts">
                        {{ item.issuer
                        }}<template v-if="item.issued">
                            · {{ formatMonthYear(item.issued) }}</template
                        >
                    </p>
                </li>
            </ul>
        </section>

        <section v-if="visibleSocial.length" class="page-section" aria-labelledby="about-links">
            <h2 id="about-links">{{ t("about.links") }}</h2>
            <ul class="page-pills">
                <li v-for="item in visibleSocial" :key="item.id">
                    <a
                        class="page-pill page-pill--quiet"
                        :href="item.url"
                        target="_blank"
                        rel="noopener"
                        >{{ item.label }}<LetterIcon :icon="faArrowUpRightFromSquare"
                    /></a>
                </li>
            </ul>
        </section>
    </main>
</template>
