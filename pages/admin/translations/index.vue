<template>
    <section>
        <AdminPageHeader
            title="Translations"
            description="Greek (EL) variants of every content surface. Public site renders English only; EL data is kept for a future re-introduction."
            eyebrow="Locales"
        />

        <div v-if="pending" class="grid gap-3">
            <Skeleton v-for="item in 6" :key="item" class="h-20 w-full" />
        </div>

        <template v-else>
            <section v-if="singletonRows.length" class="codex-translations-section">
                <h2 class="codex-section-eyebrow">Site & resume pages</h2>
                <ul class="codex-list">
                    <li v-for="row in singletonRows" :key="row.route" class="codex-list-row">
                        <NuxtLink
                            :to="`/admin/translations/${row.route}`"
                            class="codex-list-link codex-translations-row"
                        >
                            <div class="codex-translations-row-main">
                                <h3 class="codex-translations-row-title">{{ row.label }}</h3>
                                <p class="codex-translations-row-sub">{{ row.description }}</p>
                            </div>
                            <div class="codex-translations-row-meta">
                                <CoverageChip :coverage="row.coverage" />
                                <ChevronRight class="h-4 w-4" />
                            </div>
                        </NuxtLink>
                    </li>
                </ul>
            </section>

            <section v-if="collectionRows.length" class="codex-translations-section">
                <h2 class="codex-section-eyebrow">Collections</h2>
                <ul class="codex-list">
                    <li v-for="row in collectionRows" :key="row.route" class="codex-list-row">
                        <NuxtLink
                            :to="`/admin/translations/${row.route}`"
                            class="codex-list-link codex-translations-row"
                        >
                            <div class="codex-translations-row-main">
                                <h3 class="codex-translations-row-title">{{ row.label }}</h3>
                                <p class="codex-translations-row-sub">
                                    {{ row.translatedDocs }} of {{ row.totalDocs }} documents
                                    translated
                                </p>
                            </div>
                            <div class="codex-translations-row-meta">
                                <CoverageChip
                                    :coverage="{ filled: row.translatedDocs, total: row.totalDocs }"
                                />
                                <ChevronRight class="h-4 w-4" />
                            </div>
                        </NuxtLink>
                    </li>
                </ul>
            </section>

            <p v-if="!singletonRows.length && !collectionRows.length" class="codex-admin-empty">
                No locale-aware fields defined.
            </p>
        </template>
    </section>
</template>

<script setup lang="ts">
    import { ChevronRight } from "lucide-vue-next";
    import {
        adminCollections,
        adminSingletons,
        localeCoverage,
        partitionFields,
        type LocaleCoverage,
    } from "~/utils/adminContent";
    import { useAdminApi } from "~/composables/useAdminApi";
    import { Skeleton } from "@/components/ui/skeleton";
    import CoverageChip from "~/components/admin/CoverageChip.vue";

    definePageMeta({
        layout: "admin",
        middleware: "admin-auth",
    });

    interface SingletonRow {
        route: string;
        label: string;
        description: string;
        coverage: LocaleCoverage;
    }

    interface CollectionRow {
        route: string;
        label: string;
        translatedDocs: number;
        totalDocs: number;
    }

    const api = useAdminApi();
    const pending = ref(true);
    const singletonRows = ref<SingletonRow[]>([]);
    const collectionRows = ref<CollectionRow[]>([]);

    /**
     * A collection doc is "translated" when at least 50% of its EL
     * fields carry non-empty values. The threshold trades a strict
     * "all-or-nothing" signal (which would make the index read as 0%
     * during partial translations) for a more honest "in progress"
     * coverage chip.
     */
    const TRANSLATION_THRESHOLD = 0.5;

    onMounted(async () => {
        try {
            const singletonResults = await Promise.all(
                Object.values(adminSingletons)
                    .filter((entry) => partitionFields(entry.fields).locale.length > 0)
                    .map(async (entry) => {
                        let doc: Record<string, unknown> = {};
                        try {
                            doc =
                                entry.kind === "singleton"
                                    ? await api.getSingleton(entry.singleton!)
                                    : await api.getCollectionDoc(entry.collection!, entry.docId!);
                        } catch {
                            doc = entry.create();
                        }
                        return {
                            route: entry.route,
                            label: entry.label,
                            description: entry.description,
                            coverage: localeCoverage(doc, entry.fields),
                        } satisfies SingletonRow;
                    })
            );
            singletonRows.value = singletonResults;

            const collectionResults = await Promise.all(
                Object.values(adminCollections)
                    .filter((entry) => partitionFields(entry.fields).locale.length > 0)
                    .map(async (entry) => {
                        let docs: Array<Record<string, unknown>> = [];
                        try {
                            docs = await api.listCollection(entry.collection);
                        } catch {
                            docs = [];
                        }
                        const translated = docs.filter((doc) => {
                            const { filled, total } = localeCoverage(doc, entry.fields);
                            return total > 0 && filled / total >= TRANSLATION_THRESHOLD;
                        }).length;
                        return {
                            route: entry.route,
                            label: entry.plural,
                            translatedDocs: translated,
                            totalDocs: docs.length,
                        } satisfies CollectionRow;
                    })
            );
            collectionRows.value = collectionResults;
        } finally {
            pending.value = false;
        }
    });
</script>

<style scoped>
    .codex-translations-section {
        margin-bottom: 2rem;
    }

    .codex-translations-section:last-child {
        margin-bottom: 0;
    }

    .codex-translations-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 1rem;
    }

    .codex-translations-row-main {
        min-width: 0;
    }

    .codex-translations-row-title {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--fg);
    }

    .codex-translations-row-sub {
        margin: 0.25rem 0 0;
        font-size: 0.82rem;
        color: var(--soft);
    }

    .codex-translations-row-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--soft);
    }
</style>
