<template>
    <section>
        <AdminPageHeader
            :title="pageTitle"
            :description="definition.description"
            :eyebrow="definition.plural"
        >
            <template #actions>
                <Button variant="outline" as-child class="codex-btn codex-btn-outline">
                    <NuxtLink :to="`/admin/${definition.route}`">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        Back
                    </NuxtLink>
                </Button>
                <Button
                    v-if="!isNew"
                    variant="destructive"
                    :disabled="saving"
                    class="codex-btn codex-btn-destructive"
                    @click="confirmOpen = true"
                >
                    <Trash2 class="mr-2 h-4 w-4" />
                    Delete
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
            <Skeleton v-for="item in 8" :key="item" class="h-16 w-full" />
        </div>

        <form v-else class="grid gap-5 pb-24" @submit.prevent="save">
            <DraftRestoreBanner
                v-if="restorePrompt"
                :saved-at="restorePrompt.savedAt"
                @restore="restoreDraft"
                @dismiss="dismissDraft"
            />

            <AdminState v-if="errorMessage" tone="error" :message="errorMessage" />

            <AdminFieldRenderer
                v-for="field in primaryFields"
                :key="field.path"
                :field="field"
                :doc="draft"
                @invalid="errorMessage = $event"
                @valid="clearFieldError"
            />

            <AdminUploadPanel
                v-if="uploadTarget"
                :target="uploadTarget"
                :doc-id="docIdForUpload"
                :disabled="!docIdForUpload"
                @uploaded="handleUpload"
            />

            <!--
                EL surface lives at /admin/translations. Editors here
                edit the canonical EN copy only; the translations index
                is the single seam for managing localized variants
                (Plan I dropped EL from the public site, but the data
                shape is kept so a future re-introduction is cheap).
            -->
            <p v-if="hasLocaleFields" class="codex-editor-locale-hint" role="note">
                <Languages class="h-3.5 w-3.5" />
                Translations live under
                <NuxtLink
                    :to="`/admin/translations/${definition.route}/${encodeURIComponent(localeEditorId)}`"
                    class="codex-cta-glyph"
                >
                    /admin/translations
                </NuxtLink>
                — main form edits the canonical English copy.
            </p>

            <div
                class="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur"
            >
                <Button
                    type="button"
                    variant="outline"
                    as-child
                    class="codex-btn codex-btn-outline"
                >
                    <NuxtLink :to="`/admin/${definition.route}`">Cancel</NuxtLink>
                </Button>
                <Button type="submit" :disabled="saving" class="codex-btn codex-btn-primary">
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save changes" }}
                </Button>
            </div>
        </form>

        <ConfirmDialog
            :is-open="confirmOpen"
            title="Delete document"
            :message="`Delete ${pageTitle}? This cannot be undone.`"
            confirm-text="Delete"
            @close="confirmOpen = false"
            @confirm="deleteDoc"
        />

        <ConfirmDialog
            :is-open="confirmDiscardOpen"
            title="Discard draft"
            message="Discard your unsaved changes and load the server version? This cannot be undone."
            confirm-text="Discard draft"
            @close="confirmDiscardOpen = false"
            @confirm="performDiscardDraft"
        />
    </section>
</template>

<script setup lang="ts">
    import { ArrowLeft, Languages, Save, Trash2 } from "lucide-vue-next";
    import { onKeyStroke } from "@vueuse/core";
    import AdminState from "./AdminState.vue";
    import type { AdminCollectionDefinition } from "~/utils/adminContent";
    import {
        defaultDocumentId,
        getByPath,
        partitionFields,
        resolveAdminCollection,
        setByPath,
    } from "~/utils/adminContent";
    import { useAdminApi } from "~/composables/useAdminApi";
    import {
        useDraftStore,
        makeDraftKey,
        resetNewDocNamespace,
        type AdminDraftRecord,
    } from "~/composables/useDraftStore";
    import {
        adminErrorMessage,
        cloneAdminDraft,
        pruneAdminDraft,
        type AdminDraft,
    } from "~/utils/adminForm";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";
    import ConfirmDialog from "./ConfirmDialog.vue";
    import DraftRestoreBanner from "./DraftRestoreBanner.vue";

    const props = defineProps<{
        section: string;
        id: string;
    }>();

    // Emitted after a successful save / delete so a host (e.g., the mobile
    // bottom-sheet) can dismiss itself. Standalone full-page usage simply
    // ignores it.
    const emit = defineEmits<{
        saved: [docId: string];
        deleted: [docId: string];
    }>();

    const definition = computed<AdminCollectionDefinition>(() => {
        const resolved = resolveAdminCollection(props.section);
        if (!resolved) {
            throw createError({ statusCode: 404, statusMessage: "Unknown admin section" });
        }
        return resolved;
    });

    const api = useAdminApi();
    const router = useRouter();
    const draftStore = useDraftStore();
    const isNew = computed(() => props.id === "new");
    const pending = ref(true);
    const saving = ref(false);
    const errorMessage = ref<string | null>(null);
    const confirmOpen = ref(false);
    const draft = reactive<AdminDraft>({});

    const partitioned = computed(() => partitionFields(definition.value.fields));
    const primaryFields = computed(() => partitioned.value.primary);
    const hasLocaleFields = computed(() => partitioned.value.locale.length > 0);
    const localeEditorId = computed(() =>
        isNew.value ? defaultDocumentId(definition.value, draft) || "new" : props.id
    );

    // --- Draft autosave (IndexedDB via Dexie) ---------------------------
    //
    // Sequence: load() → check for stale draft → set restorePrompt OR
    // mark isReady=true. Autosave watcher reads isReady and skips while
    // the banner is up so the deep watch on `draft` during hydration
    // doesn't silently clobber the user's saved draft with the initial
    // server payload.
    const restorePrompt = ref<AdminDraftRecord | null>(null);
    const isReady = ref(false);
    const lastBaseUpdatedAt = ref<number | null>(null);

    const draftKey = computed(() => makeDraftKey(props.section, props.id));

    // Manual debounce so we can `flush()` synchronously on unmount.
    // `useDebounceFn` from @vueuse/core does not expose a flush hook
    // (only internal cancellation), which means a tab-close mid-edit
    // would silently drop the latest 400ms window of typing. Hand-rolling
    // the timer keeps the flush path tight + auditable.
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    const DRAFT_DEBOUNCE_MS = 400;

    async function runPersistDraft() {
        if (!isReady.value) return;
        if (!import.meta.client) return;
        try {
            await draftStore.saveDraft(
                draftKey.value,
                cloneAdminDraft(draft),
                lastBaseUpdatedAt.value
            );
        } catch (error) {
            // IDB write failures stay out of the user's face — the server
            // save path is the authoritative persistence channel and
            // surfacing autosave failures would be noise. Logged as a
            // breadcrumb for ops to find via Sentry's console-capture.
            console.warn("draft autosave failed", error);
        }
    }

    function schedulePersistDraft() {
        if (pendingTimer !== null) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
            pendingTimer = null;
            void runPersistDraft();
        }, DRAFT_DEBOUNCE_MS);
    }

    function flushPersistDraft() {
        if (pendingTimer === null) return;
        clearTimeout(pendingTimer);
        pendingTimer = null;
        // Fire-and-forget — onBeforeUnmount can't await, but the IDB
        // transaction starts synchronously enough that the browser
        // typically lets it complete during the unload event.
        void runPersistDraft();
    }

    watch(draft, schedulePersistDraft, { deep: true });

    onBeforeUnmount(flushPersistDraft);

    const confirmDiscardOpen = ref(false);

    function restoreDraft() {
        if (!restorePrompt.value) return;
        replaceDraft(restorePrompt.value.data);
        restorePrompt.value = null;
        isReady.value = true;
    }

    function dismissDraft() {
        // Discard is destructive — the draft can't be recovered after the
        // IDB entry is cleared. Gate it behind a confirmation dialog
        // (same `ConfirmDialog` pattern as the document delete flow).
        if (!restorePrompt.value) return;
        confirmDiscardOpen.value = true;
    }

    async function performDiscardDraft() {
        confirmDiscardOpen.value = false;
        if (!restorePrompt.value) return;
        try {
            await draftStore.clearDraft(draftKey.value);
        } catch (error) {
            console.warn("draft clear failed", error);
        }
        restorePrompt.value = null;
        isReady.value = true;
    }

    const pageTitle = computed(() => {
        if (isNew.value) return `New ${definition.value.label}`;
        return definition.value.title(draft) || props.id;
    });
    const uploadTarget = computed<"work" | "writing" | null>(() => {
        const collection = definition.value.collection;
        return collection === "work" || collection === "writing" ? collection : null;
    });
    const docIdForUpload = computed(() => {
        const current = definition.value;
        return isNew.value ? defaultDocumentId(current, draft) : props.id;
    });

    const replaceDraft = (next: Record<string, unknown>) => {
        for (const key of Object.keys(draft)) Reflect.deleteProperty(draft, key);
        Object.assign(draft, cloneAdminDraft(next));
    };

    // Returns true when a fresher IDB draft has been queued for the
    // restore-banner; the caller should leave `isReady` false so the
    // autosave watcher does not stomp the user's saved draft with the
    // server payload during banner display. Returns false when there is
    // no draft (or the draft was stale and was cleared).
    async function maybeQueueDraftRestore(): Promise<boolean> {
        if (!import.meta.client) return false;
        try {
            const stored = await draftStore.loadDraft(draftKey.value);
            if (!stored) return false;
            const baseline = lastBaseUpdatedAt.value;
            const isFresher = baseline === null || stored.savedAt > baseline;
            if (isFresher) {
                restorePrompt.value = stored;
                return true;
            }
            // Stale draft (server doc updated by someone else after our
            // local draft was saved). Drop it.
            await draftStore.clearDraft(draftKey.value);
            return false;
        } catch (error) {
            console.warn("draft load failed", error);
            return false;
        }
    }

    const load = async () => {
        pending.value = true;
        errorMessage.value = null;
        isReady.value = false;
        restorePrompt.value = null;
        const current = definition.value;
        try {
            let serverDoc: Record<string, unknown>;
            if (isNew.value) {
                serverDoc = current.create("new");
                lastBaseUpdatedAt.value = null;
            } else {
                serverDoc = await api.getCollectionDoc(current.collection, props.id);
                const updatedAt = serverDoc.updatedAt;
                lastBaseUpdatedAt.value = typeof updatedAt === "number" ? updatedAt : null;
            }
            replaceDraft(serverDoc);
            const restored = await maybeQueueDraftRestore();
            if (!restored) isReady.value = true;
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            pending.value = false;
        }
    };

    // Plan I.8: editor save patches the shared admin list cache
    // (`useState("admin-list-cache")` in `pages/admin/index.vue` +
    // `components/admin/AdminCollectionList.vue`) BEFORE the server
    // round-trip, so a user who navigates back to /admin/{section}
    // immediately sees the new / updated row at the top instead of
    // an empty/stale list. On failure the cache snapshot is restored.
    type CachedItem = Record<string, unknown> & { id: string };
    const listCache = useState<Record<string, CachedItem[]>>("admin-list-cache", () => ({}));

    function patchListCacheOptimistic(collection: string, doc: CachedItem) {
        const list = listCache.value[collection] ?? [];
        const idx = list.findIndex((x) => x.id === doc.id);
        const next = idx < 0 ? [doc, ...list] : list.with(idx, doc);
        listCache.value = { ...listCache.value, [collection]: next };
        return { idx, prior: idx < 0 ? null : (list[idx] ?? null) };
    }

    function revertListCache(
        collection: string,
        docId: string,
        snap: { idx: number; prior: CachedItem | null }
    ) {
        const list = listCache.value[collection] ?? [];
        const idx = list.findIndex((x) => x.id === docId);
        if (idx < 0) return;
        const next =
            snap.idx < 0 ? list.filter((x) => x.id !== docId) : list.with(idx, snap.prior!);
        listCache.value = { ...listCache.value, [collection]: next };
    }

    const save = async () => {
        const current = definition.value;
        saving.value = true;
        errorMessage.value = null;
        try {
            const docId = isNew.value ? defaultDocumentId(current, draft) : props.id;
            if (!docId) {
                throw new Error("Add an ID or slug before saving.");
            }
            const prepared = current.prepare(pruneAdminDraft(cloneAdminDraft(draft)), docId);
            const optimisticDoc = { ...(prepared as CachedItem), id: docId };
            const snap = patchListCacheOptimistic(current.collection, optimisticDoc);
            try {
                await api.saveCollectionDoc(current.collection, docId, prepared);
            } catch (saveErr) {
                revertListCache(current.collection, docId, snap);
                throw saveErr;
            }
            // Server-side save succeeded — drop the autosaved draft so
            // we don't restore stale state on a future open.
            if (import.meta.client) {
                try {
                    await draftStore.clearDraft(draftKey.value);
                } catch (error) {
                    console.warn("draft clear after save failed", error);
                }
            }
            if (isNew.value) {
                // The new doc just got a real id. Clear the per-tab "new"
                // namespace so the next "/{section}/new" session in this
                // tab starts with a fresh UUID — otherwise it would
                // shadow the just-saved doc's draft slot.
                resetNewDocNamespace();
                await router.replace(`/admin/${current.route}/${encodeURIComponent(docId)}`);
            } else {
                await load();
            }
            emit("saved", docId);
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            saving.value = false;
        }
    };

    const deleteDoc = async () => {
        const current = definition.value;
        // Close the confirm dialog immediately — both the success path
        // (router.push to the list) and the error path used to leak
        // `confirmOpen=true` to the next render, which made the dialog
        // appear "stuck open" right before the navigation kicked in.
        // ConfirmDialog also emits `close` alongside `confirm` now as a
        // belt-and-braces second guard, but clearing here keeps the
        // parent's source of truth honest.
        confirmOpen.value = false;
        saving.value = true;
        errorMessage.value = null;
        try {
            await api.deleteCollectionDoc(current.collection, props.id);
            emit("deleted", props.id);
            if (import.meta.client) {
                try {
                    await draftStore.clearDraft(draftKey.value);
                } catch (error) {
                    console.warn("draft clear after delete failed", error);
                }
            }
            await router.push(`/admin/${current.route}`);
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            saving.value = false;
        }
    };

    const clearFieldError = (messagePrefix: string) => {
        if (errorMessage.value?.startsWith(messagePrefix)) {
            errorMessage.value = null;
        }
    };

    const escapeMarkdownAlt = (value: string) =>
        value.replace(/[\\[\]()`!]/g, "\\$&").trim() || "Uploaded image";

    const handleUpload = (upload: { url: string }) => {
        const current = definition.value;
        if (current.collection === "work") {
            const images = Array.isArray(draft.images) ? draft.images : [];
            draft.images = [
                ...images,
                {
                    src: upload.url,
                    alt: current.title(draft),
                    order: images.length,
                },
            ];
            return;
        }

        if (current.collection === "writing") {
            // EN body is the canonical surface here; EL body (if any) is
            // edited under /admin/translations/<route>/<id>.
            const bodyPath = `locale.en.body`;
            const body = String(getByPath(draft, bodyPath) ?? "");
            const alt = escapeMarkdownAlt(current.title(draft));
            setByPath(draft, bodyPath, `${body}\n\n![${alt}](${upload.url})\n`);
        }
    };

    watch(() => props.id, load, { immediate: true });

    // ⌘+S / Ctrl+S save shortcut. Skipped while the draft load is
    // pending (no doc to save) or while a save is already in flight
    // (avoid double-submission on stuck networks). The keystroke is
    // captured at the document level so it fires from inside any of
    // the form's child inputs, including the markdown editor iframe.
    onKeyStroke(
        ["s", "S"],
        (event) => {
            if (!(event.metaKey || event.ctrlKey)) return;
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
    .codex-editor-locale-hint {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        align-self: flex-start;
        padding: 0.5rem 0.75rem;
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.02em;
        color: var(--soft);
        background: var(--surface);
        border: 1px solid var(--rule-soft);
    }

    .codex-editor-locale-hint a {
        color: var(--accent);
        text-decoration: none;
    }
</style>
