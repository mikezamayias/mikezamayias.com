<template>
    <section v-if="mode === 'collection-list'">
        <AdminPageHeader
            :title="collection!.plural"
            :description="`Greek (EL) translations for the ${collection!.plural.toLowerCase()} collection.`"
            eyebrow="Translations"
        >
            <template #actions>
                <Button as-child class="codex-btn codex-btn-outline">
                    <NuxtLink to="/admin/translations">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        All translations
                    </NuxtLink>
                </Button>
            </template>
        </AdminPageHeader>

        <div v-if="listPending" class="grid gap-3">
            <Skeleton v-for="item in 4" :key="item" class="h-20 w-full" />
        </div>

        <AdminState
            v-else-if="!collectionDocs.length"
            tone="empty"
            :message="`No ${collection!.plural.toLowerCase()} documents yet.`"
        />

        <ul v-else class="codex-list">
            <li v-for="doc in collectionDocs" :key="String(doc.id)" class="codex-list-row">
                <NuxtLink
                    :to="`/admin/translations/${collection!.route}/${encodeURIComponent(String(doc.id))}`"
                    class="codex-list-link codex-translations-doc-row"
                >
                    <div class="codex-translations-doc-main">
                        <h3 class="codex-translations-doc-title">{{ collection!.title(doc) }}</h3>
                        <p class="codex-translations-doc-sub">
                            {{ collection!.subtitle(doc) || doc.id }}
                        </p>
                    </div>
                    <div class="codex-translations-doc-meta">
                        <CoverageChip :coverage="coverageFor(doc)" />
                        <ChevronRight class="h-4 w-4" />
                    </div>
                </NuxtLink>
            </li>
        </ul>
    </section>

    <section v-else-if="mode === 'document'">
        <AdminPageHeader
            :title="docTitle"
            :description="`Greek (EL) translation for ${collection!.label.toLowerCase()}.`"
            :eyebrow="`Translations · ${collection!.plural}`"
        >
            <template #actions>
                <Button as-child class="codex-btn codex-btn-outline">
                    <NuxtLink :to="`/admin/translations/${collection!.route}`">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        Back
                    </NuxtLink>
                </Button>
                <Button
                    :disabled="saving || pending"
                    class="codex-btn codex-btn-primary"
                    @click="save"
                >
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save" }}
                </Button>
            </template>
        </AdminPageHeader>

        <div v-if="pending" class="grid gap-4">
            <Skeleton v-for="item in 6" :key="item" class="h-16 w-full" />
        </div>

        <form v-else class="grid gap-5 pb-24" @submit.prevent="save">
            <AdminState v-if="errorMessage" tone="error" :message="errorMessage" />
            <AdminState
                v-else-if="!localeFields.length"
                tone="empty"
                message="This entity has no EL fields."
            />

            <AdminFieldRenderer
                v-for="field in localeFields"
                :key="field.path"
                :field="field"
                :doc="draft"
                @invalid="errorMessage = $event"
            />

            <div
                v-if="localeFields.length"
                class="sticky bottom-4 z-10 flex justify-end gap-2 rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur"
            >
                <Button type="submit" :disabled="saving" class="codex-btn codex-btn-primary">
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save translation" }}
                </Button>
            </div>
        </form>
    </section>

    <section v-else-if="mode === 'singleton'">
        <AdminPageHeader
            :title="singleton!.label"
            :description="`Greek (EL) translation for ${singleton!.label.toLowerCase()}.`"
            eyebrow="Translations"
        >
            <template #actions>
                <Button as-child class="codex-btn codex-btn-outline">
                    <NuxtLink to="/admin/translations">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        All translations
                    </NuxtLink>
                </Button>
                <Button
                    :disabled="saving || pending"
                    class="codex-btn codex-btn-primary"
                    @click="save"
                >
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save" }}
                </Button>
            </template>
        </AdminPageHeader>

        <div v-if="pending" class="grid gap-4">
            <Skeleton v-for="item in 6" :key="item" class="h-16 w-full" />
        </div>

        <form v-else class="grid gap-5 pb-24" @submit.prevent="save">
            <AdminState v-if="errorMessage" tone="error" :message="errorMessage" />
            <AdminState
                v-else-if="!localeFields.length"
                tone="empty"
                message="This singleton has no EL fields."
            />

            <AdminFieldRenderer
                v-for="field in localeFields"
                :key="field.path"
                :field="field"
                :doc="draft"
                @invalid="errorMessage = $event"
            />

            <div
                v-if="localeFields.length"
                class="sticky bottom-4 z-10 flex justify-end gap-2 rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur"
            >
                <Button type="submit" :disabled="saving" class="codex-btn codex-btn-primary">
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save translation" }}
                </Button>
            </div>
        </form>
    </section>

    <section v-else>
        <AdminPageHeader
            title="Not found"
            description="Unknown translation route."
            eyebrow="Translations"
        />
        <AdminState tone="empty" message="Unknown translation route.">
            <template #action>
                <NuxtLink to="/admin/translations" class="codex-cta-glyph">
                    Back to translations
                </NuxtLink>
            </template>
        </AdminState>
    </section>
</template>

<script setup lang="ts">
    import { ArrowLeft, ChevronRight, Save } from "lucide-vue-next";
    import { onKeyStroke } from "@vueuse/core";
    import AdminState from "~/components/admin/AdminState.vue";
    import {
        localeCoverage,
        partitionFields,
        resolveAdminCollection,
        resolveAdminSingleton,
        type AdminCollectionDefinition,
        type AdminSingletonDefinition,
        type LocaleCoverage,
    } from "~/utils/adminContent";
    import { useAdminApi } from "~/composables/useAdminApi";
    import {
        adminErrorMessage,
        cloneAdminDraft,
        pruneAdminDraft,
        type AdminDraft,
    } from "~/utils/adminForm";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";
    import CoverageChip from "~/components/admin/CoverageChip.vue";

    definePageMeta({
        layout: "admin",
        middleware: "admin-auth",
    });

    const route = useRoute();

    // `slug` is the `[...slug]` catch-all segment. Shape:
    //   ["work"]           → collection list
    //   ["work", "abc-id"] → specific doc EL editor
    //   ["hero"]           → singleton EL editor
    const segments = computed<string[]>(() => {
        const raw = route.params.slug;
        if (Array.isArray(raw)) return raw.filter((s): s is string => Boolean(s));
        return raw ? [String(raw)] : [];
    });

    type Mode = "collection-list" | "document" | "singleton" | "not-found";

    const collection = computed<AdminCollectionDefinition | null>(() => {
        const first = segments.value[0];
        return first ? resolveAdminCollection(first) : null;
    });

    const singleton = computed<AdminSingletonDefinition | null>(() => {
        const first = segments.value[0];
        if (!first) return null;
        // Skip singleton lookup when the first segment is a collection
        // route — otherwise the catch-all would resolve `work` as a
        // singleton route on routes like `/admin/translations/work/abc`.
        if (resolveAdminCollection(first)) return null;
        return resolveAdminSingleton(first);
    });

    const mode = computed<Mode>(() => {
        if (collection.value) {
            return segments.value.length === 1 ? "collection-list" : "document";
        }
        if (singleton.value) return "singleton";
        return "not-found";
    });

    const docId = computed(() => segments.value[1] ?? "");

    const api = useAdminApi();
    const draft = reactive<AdminDraft>({});
    const pending = ref(false);
    const saving = ref(false);
    const errorMessage = ref<string | null>(null);
    const docTitle = ref<string>("");

    const localeFields = computed(() => {
        if (collection.value) return partitionFields(collection.value.fields).locale;
        if (singleton.value) return partitionFields(singleton.value.fields).locale;
        return [];
    });

    // --- Collection list state ------------------------------------------------
    const collectionDocs = ref<Array<Record<string, unknown> & { id: string }>>([]);
    const listPending = ref(false);

    function coverageFor(doc: Record<string, unknown>): LocaleCoverage {
        if (!collection.value) return { filled: 0, total: 0 };
        return localeCoverage(doc, collection.value.fields);
    }

    async function loadCollectionList() {
        if (!collection.value) return;
        listPending.value = true;
        try {
            collectionDocs.value = await api.listCollection(collection.value.collection);
        } catch {
            collectionDocs.value = [];
        } finally {
            listPending.value = false;
        }
    }

    // --- Document / singleton draft state -------------------------------------
    const replaceDraft = (next: Record<string, unknown>) => {
        for (const key of Object.keys(draft)) Reflect.deleteProperty(draft, key);
        Object.assign(draft, cloneAdminDraft(next));
    };

    async function loadDoc() {
        if (!collection.value || !docId.value) return;
        pending.value = true;
        errorMessage.value = null;
        try {
            const fetched = await api.getCollectionDoc(collection.value.collection, docId.value);
            replaceDraft(fetched);
            docTitle.value = collection.value.title(fetched) || docId.value;
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            pending.value = false;
        }
    }

    async function loadSingleton() {
        const current = singleton.value;
        if (!current) return;
        pending.value = true;
        errorMessage.value = null;
        try {
            const fetched =
                current.kind === "singleton"
                    ? await api.getSingleton(current.singleton!)
                    : await api.getCollectionDoc(current.collection!, current.docId!);
            replaceDraft(fetched);
        } catch {
            replaceDraft(current.create());
        } finally {
            pending.value = false;
        }
    }

    async function save() {
        saving.value = true;
        errorMessage.value = null;
        try {
            const prepared = pruneAdminDraft(cloneAdminDraft(draft));
            if (collection.value && docId.value) {
                // Re-run the collection's `prepare()` so derived fields
                // like `locales_available` are recomputed before save.
                const finalDoc = collection.value.prepare(prepared, docId.value);
                await api.saveCollectionDoc(collection.value.collection, docId.value, finalDoc);
                await loadDoc();
            } else if (singleton.value) {
                const current = singleton.value;
                const finalDoc = current.prepare(prepared);
                if (current.kind === "singleton") {
                    await api.saveSingleton(current.singleton!, finalDoc);
                } else {
                    await api.saveCollectionDoc(current.collection!, current.docId!, finalDoc);
                }
                await loadSingleton();
            }
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            saving.value = false;
        }
    }

    watch(
        mode,
        async (next) => {
            if (next === "collection-list") {
                await loadCollectionList();
            } else if (next === "document") {
                await loadDoc();
            } else if (next === "singleton") {
                await loadSingleton();
            }
        },
        { immediate: true }
    );

    watch(docId, async (next, prev) => {
        if (mode.value === "document" && next !== prev) await loadDoc();
    });

    onKeyStroke(
        ["s", "S"],
        (event) => {
            if (!(event.metaKey || event.ctrlKey)) return;
            if (mode.value === "collection-list" || mode.value === "not-found") return;
            if (pending.value || saving.value) {
                event.preventDefault();
                return;
            }
            event.preventDefault();
            void save();
        },
        { target: typeof document !== "undefined" ? document : undefined }
    );
</script>

<style scoped>
    .codex-translations-doc-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 1rem;
    }

    .codex-translations-doc-main {
        min-width: 0;
    }

    .codex-translations-doc-title {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--fg);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .codex-translations-doc-sub {
        margin: 0.25rem 0 0;
        font-size: 0.82rem;
        color: var(--soft);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .codex-translations-doc-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--soft);
    }
</style>
