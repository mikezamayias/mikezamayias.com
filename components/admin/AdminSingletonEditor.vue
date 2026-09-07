<template>
    <section>
        <AdminPageHeader
            :title="definition.label"
            :description="definition.description"
            eyebrow="Settings"
        >
            <template #actions>
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
            <AdminState v-if="errorMessage" tone="error" :message="errorMessage" />

            <AdminFieldRenderer
                v-for="field in primaryFields"
                :key="field.path"
                :field="field"
                :doc="draft"
                @invalid="errorMessage = $event"
            />

            <!--
                EL fields for this singleton live at
                /admin/translations/<route>. Plan I dropped EL from the
                public surface; keeping the data shape behind the
                translations seam lets a future re-introduction stay
                cheap without polluting the canonical editor.
            -->
            <p v-if="hasLocaleFields" class="codex-editor-locale-hint" role="note">
                <Languages class="h-3.5 w-3.5" />
                Translations live under
                <NuxtLink :to="`/admin/translations/${definition.route}`" class="codex-cta-glyph">
                    /admin/translations
                </NuxtLink>
                — main form edits the canonical English copy.
            </p>

            <div
                class="sticky bottom-4 z-10 flex justify-end rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur"
            >
                <Button type="submit" :disabled="saving" class="codex-btn codex-btn-primary">
                    <Save class="mr-2 h-4 w-4" />
                    {{ saving ? "Saving" : "Save changes" }}
                </Button>
            </div>
        </form>
    </section>
</template>

<script setup lang="ts">
    import { Languages, Save } from "lucide-vue-next";
    import { onKeyStroke } from "@vueuse/core";
    import AdminState from "./AdminState.vue";
    import type { AdminSingletonDefinition } from "~/utils/adminContent";
    import { partitionFields, resolveAdminSingleton } from "~/utils/adminContent";
    import { useAdminApi } from "~/composables/useAdminApi";
    import {
        useAdminCollectionDocSnapshot,
        useAdminSingletonSnapshot,
    } from "~/composables/useAdminRealtime";
    import {
        adminErrorMessage,
        cloneAdminDraft,
        pruneAdminDraft,
        type AdminDraft,
    } from "~/utils/adminForm";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";

    const props = defineProps<{
        section: string;
    }>();

    const definition = computed<AdminSingletonDefinition>(() => {
        const resolved = resolveAdminSingleton(props.section);
        if (!resolved) {
            throw createError({ statusCode: 404, statusMessage: "Unknown admin section" });
        }
        return resolved;
    });

    const api = useAdminApi();
    // Realtime snapshot — same singleton document the public side reads
    // via `useSingletonSnapshot` / `useContactInfoSnapshot`, but the
    // admin variant skips the server-endpoint round-trip and goes
    // straight at Firestore once the admin auth state is ready. A save
    // from another admin client (or the public-side admin) now updates
    // the open editor within ~1 s instead of waiting for a manual
    // reload.
    //
    // `definition.kind` is "singleton" (hero / about / roadmap-settings,
    // backed by `/singletons/{name}`) or "collectionDoc" (contact /
    // profile, backed by `/{collection}/{docId}`). Each admin page
    // mounts `AdminSingletonEditor` with a fixed `section` prop, so the
    // kind is stable for the entire component lifetime — captured here
    // at setup time and never re-evaluated. Composables can't safely be
    // called from conditional/reactive blocks (their `onMounted` hooks
    // must register synchronously during setup), which is why we don't
    // try to swap snapshot kinds at runtime.
    const initialDefinition = definition.value;
    const snapshot =
        initialDefinition.kind === "singleton"
            ? useAdminSingletonSnapshot<Record<string, unknown>>({
                  name: initialDefinition.singleton!,
              })
            : useAdminCollectionDocSnapshot<Record<string, unknown>>({
                  collection: initialDefinition.collection!,
                  docId: initialDefinition.docId!,
              });

    const saving = ref(false);
    const errorMessage = ref<string | null>(null);
    const draft = reactive<AdminDraft>({});
    // `dirty` tracks whether the user has modified the draft since the
    // last server-confirmed load. Snapshots only overwrite the draft
    // when `!dirty.value` — otherwise an external save mid-edit would
    // silently clobber the user's in-progress changes.
    const dirty = ref(false);

    const partitioned = computed(() => partitionFields(definition.value.fields));
    const primaryFields = computed(() => partitioned.value.primary);
    const hasLocaleFields = computed(() => partitioned.value.locale.length > 0);

    // Synchronous deep watcher on the draft — `flush: 'sync'` means the
    // callback fires inside the same tick as the mutation, so the
    // `replaceDraft` helper can mutate the keys, then reset `dirty=false`
    // immediately after, and the user-edit watcher path stays
    // observable. Sync flush is OK here because the watcher body is
    // tiny (one boolean write) and doesn't trigger reactive cascades.
    watch(
        draft,
        () => {
            dirty.value = true;
        },
        { deep: true, flush: "sync" }
    );

    const replaceDraft = (next: Record<string, unknown>) => {
        for (const key of Object.keys(draft)) Reflect.deleteProperty(draft, key);
        Object.assign(draft, cloneAdminDraft(next));
        // The watcher above just flipped dirty=true for these
        // assignments. Reset it AFTER the mutations land — the snapshot
        // / load just rehydrated from the server, so by definition the
        // draft is in-sync.
        dirty.value = false;
    };

    // Pending is driven entirely by the snapshot lifecycle now. Empty
    // snapshot data (rare — singletons usually exist) falls through to
    // the `create()` fallback in the load watcher below.
    const pending = computed(() => snapshot.pending.value);

    // Live-update bridge: every time the snapshot's data ref fires,
    // sync into the local reactive draft IF the user has no unsaved
    // edits. The deep watcher above flips `dirty=true` on any user
    // change; until then, snapshots paint straight through.
    watch(
        () => snapshot.data.value,
        (next) => {
            if (next == null) return;
            if (dirty.value) return;
            replaceDraft(next as Record<string, unknown>);
        },
        { immediate: true, deep: true }
    );

    // Bootstrap fallback: the snapshot composable's `refresh()` already
    // hits the same server endpoint on mount, so this is only the
    // safety net for the "doc doesn't exist yet" case. The snapshot
    // returns `data.value = null` for missing docs, which the
    // snapshot.data watcher skips — leaving the draft in its initial
    // `{}` state. `create()` provides the schema-shaped default so the
    // form renders with the right field skeleton.
    const load = async () => {
        const current = definition.value;
        errorMessage.value = null;
        try {
            const doc =
                current.kind === "singleton"
                    ? await api.getSingleton(current.singleton!)
                    : await api.getCollectionDoc(current.collection!, current.docId!);
            // The snapshot watcher already hydrated draft from a real
            // doc, OR will once the snapshot fires. Skip the redundant
            // assignment unless the draft is still empty (e.g. snapshot
            // hasn't fired yet AND this call resolved first).
            if (!dirty.value && Object.keys(draft).length === 0) {
                replaceDraft(doc);
            }
        } catch {
            // No Firestore doc OR endpoint failed — seed from the
            // definition's `create()` shape so the form has the right
            // field skeleton. Only when the draft is still empty,
            // since the snapshot may already have populated it from a
            // freshly-created sibling doc.
            if (!dirty.value && Object.keys(draft).length === 0) {
                replaceDraft(definition.value.create());
            }
        }
    };

    const save = async () => {
        const current = definition.value;
        saving.value = true;
        errorMessage.value = null;
        try {
            const prepared = current.prepare(pruneAdminDraft(cloneAdminDraft(draft)));
            if (current.kind === "singleton") {
                await api.saveSingleton(current.singleton!, prepared);
            } else {
                await api.saveCollectionDoc(current.collection!, current.docId!, prepared);
            }
            // Clear `dirty` before the snapshot fires the post-save doc
            // so the snapshot watcher's `if (dirty.value) return` guard
            // doesn't block the live-update.
            dirty.value = false;
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            saving.value = false;
        }
    };

    // Initial load: the snapshot fires its own initial fetch on mount,
    // but if it fails (or the section prop changes mid-session before
    // the snapshot resolves) the `load()` call here keeps the legacy
    // server-fetch + `create()` fallback intact. We don't need it on
    // every section flip — the snapshot watcher above does the
    // re-hydration — but it's the only path that calls `create()` for a
    // missing-doc bootstrap.
    watch(
        () => props.section,
        () => {
            void load();
        },
        { immediate: true }
    );

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
