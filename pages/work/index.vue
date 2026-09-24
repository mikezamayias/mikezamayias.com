<script setup lang="ts">
    import CodexError from "~/components/codex/CodexError.vue";
    import { WORK_STATUSES, type WorkStatus } from "#shared/workStatus";
    import { formatWorkFacts } from "~/utils/workFormat";
    import type { Work } from "~/firebase/types";

    // /work: every published entry, grouped by where it stands (open for
    // testing, under construction, out and in use), each with its facts
    // line and one-line description. Entries without a status close the
    // page under "Also".
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const { data: work, error, refresh } = await useWork({ locale, limit: 50 });

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: "Work · Mike Zamayias",
        description: () => t("page.work.description"),
    });

    // The letter's order: what you can try, what's coming, what's out.
    const GROUP_ORDER: WorkStatus[] = ["testing", "building", "live"];
    const groups = computed(() => {
        const entries = work.value ?? [];
        const byStatus = GROUP_ORDER.map((status) => ({
            key: status as string,
            heading: t(`page.work.group.${status}`),
            entries: entries.filter((entry) => entry.status === status),
        }));
        const rest = entries.filter(
            (entry) => !(WORK_STATUSES as readonly string[]).includes(entry.status ?? "")
        );
        return [
            ...byStatus,
            { key: "other", heading: t("page.work.group.other"), entries: rest },
        ].filter((group) => group.entries.length > 0);
    });

    const nameOf = (entry: Work) => entry.locale?.[locale.value]?.name ?? entry.slug;
    // The group heading already says the status, so the facts line leaves it out.
    const factsOf = (entry: Work) => formatWorkFacts({ ...entry, status: undefined }, t);
</script>

<template>
    <main id="main" class="page">
        <h1 class="page-title">{{ t("page.work.heading") }}</h1>
        <p class="page-lede">{{ t("page.work.lede") }}</p>

        <CodexError v-if="error" :error="error" :retry="refresh" />
        <p v-else-if="!groups.length" class="page-empty">{{ t("page.work.empty") }}</p>
        <section
            v-for="group in groups"
            v-else
            :key="group.key"
            class="page-section"
            :aria-labelledby="`work-${group.key}`"
        >
            <h2 :id="`work-${group.key}`">{{ group.heading }}</h2>
            <ul class="page-entries">
                <li v-for="entry in group.entries" :key="entry.slug" class="page-entry">
                    <h3 class="page-entry-title">
                        <NuxtLink :to="localePath(`/work/${entry.slug}`)">{{
                            nameOf(entry)
                        }}</NuxtLink>
                    </h3>
                    <p v-if="factsOf(entry)" class="page-facts">{{ factsOf(entry) }}</p>
                    <p v-if="entry.locale?.[locale]?.desc">{{ entry.locale[locale]!.desc }}</p>
                </li>
            </ul>
        </section>
    </main>
</template>
