<template>
    <section>
        <AdminPageHeader
            :title="definition.plural"
            :description="definition.description"
            eyebrow="Content"
        >
            <template #actions>
                <Button as-child class="codex-btn codex-btn-primary">
                    <NuxtLink :to="`/admin/${definition.route}/new`">
                        <Plus class="mr-2 h-4 w-4" />
                        New {{ definition.label }}
                    </NuxtLink>
                </Button>
            </template>
        </AdminPageHeader>

        <!--
            Background-refresh chip — visible only when the cache has
            rows AND a fetch is in flight. Keeps the "something is
            happening" signal while the prior list stays on screen.
        -->
        <div v-if="refreshing" class="codex-admin-refreshing" role="status" aria-live="polite">
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
            <span>Refreshing</span>
        </div>

        <PullToRefresh :on-refresh="refresh" :loading="pending">
            <Transition name="codex-fade" mode="out-in">
                <!--
                    Loading discriminator is `pending && !items.length` so an
                    empty collection (snapshot resolved to []) drops out of
                    the skeleton state and reaches the empty-state branch
                    below. The previous `!items.length` predicate kept the
                    skeleton up forever when the snapshot legitimately
                    returned zero docs.
                -->
                <div
                    v-if="pending && !items.length && !errorMessage"
                    key="skeleton"
                    class="grid gap-3"
                >
                    <Skeleton v-for="item in 4" :key="item" class="h-20 w-full" />
                </div>

                <div
                    v-else-if="errorMessage && !items.length"
                    key="error"
                    class="codex-admin-error"
                >
                    {{ errorMessage }}
                </div>

                <div v-else-if="items.length === 0" key="empty" class="codex-admin-empty">
                    No {{ definition.plural.toLowerCase() }} yet.
                </div>

                <div v-else key="list" class="codex-list codex-admin-list">
                    <SwipeRow
                        v-for="item in items"
                        :key="item.id"
                        :disabled="pendingDeleteIds.has(item.id)"
                        class="codex-list-row"
                        @delete="requestDelete(item.id)"
                    >
                        <NuxtLink
                            :to="`/admin/${definition.route}/${encodeURIComponent(item.id)}`"
                            class="codex-list-link codex-admin-row"
                            :class="{
                                'is-pending': pendingDeleteIds.has(item.id),
                            }"
                            :aria-busy="pendingDeleteIds.has(item.id)"
                            @click="(event: MouseEvent) => onRowClick(event, item.id)"
                        >
                            <div class="codex-admin-row-main">
                                <div class="codex-admin-row-title-line">
                                    <h2 class="codex-admin-row-title">
                                        {{ definition.title(item) }}
                                    </h2>
                                    <Badge v-if="definition.badge" variant="secondary">{{
                                        definition.badge(item)
                                    }}</Badge>
                                </div>
                                <p class="codex-admin-row-sub">
                                    {{ definition.subtitle(item) || item.id }}
                                </p>
                            </div>
                            <div class="codex-admin-row-meta">
                                <span class="codex-admin-row-id">{{ item.id }}</span>
                                <Loader2
                                    v-if="pendingDeleteIds.has(item.id)"
                                    class="h-4 w-4 animate-spin"
                                />
                                <ChevronRight v-else class="h-4 w-4" />
                            </div>
                        </NuxtLink>
                    </SwipeRow>
                </div>
            </Transition>
        </PullToRefresh>

        <ConfirmDialog
            :is-open="confirmTargetId !== null"
            :title="`Delete ${definition.label.toLowerCase()}?`"
            :message="confirmMessage"
            confirm-text="Delete"
            @close="confirmTargetId = null"
            @confirm="performDelete"
        />
    </section>
</template>

<script setup lang="ts">
    import { ChevronRight, Loader2, Plus } from "lucide-vue-next";
    import { useMediaQuery } from "@vueuse/core";
    import { toast } from "vue-sonner";
    import SwipeRow from "./SwipeRow.vue";
    import PullToRefresh from "./PullToRefresh.vue";
    import ConfirmDialog from "./ConfirmDialog.vue";
    import type { AdminCollectionDefinition } from "~/utils/adminContent";
    import { resolveAdminCollection } from "~/utils/adminContent";
    import { useAdminApi } from "~/composables/useAdminApi";
    import {
        compareAdminRowsByOrderThenId,
        useAdminListSnapshot,
    } from "~/composables/useAdminRealtime";
    import { adminErrorMessage } from "~/utils/adminForm";
    import { Badge } from "@/components/ui/badge";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";

    const props = defineProps<{
        section: string;
    }>();

    const definition = computed<AdminCollectionDefinition>(() => {
        const resolved = resolveAdminCollection(props.section);
        if (!resolved) {
            throw createError({ statusCode: 404, statusMessage: "Unknown admin section" });
        }
        return resolved;
    });

    const api = useAdminApi();
    type AdminListItem = Record<string, unknown> & { id: string };

    // Plan I.8: per-collection cache survives in-app nav. The admin
    // dashboard prewarms each section list on mount (see
    // `pages/admin/index.vue`); navigating into /admin/work or
    // /admin/writing then paints the cached rows immediately while the
    // realtime snapshot below promotes them to authoritative.
    const listCache = useState<Record<string, AdminListItem[]>>("admin-list-cache", () => ({}));

    // Realtime snapshot: replaces the prior `loadItems` one-shot fetch.
    // Initial fetch goes through `/api/admin/content/{collection}` so we
    // get the same admin-auth + server-side sort as before; then an
    // `onSnapshot` listener takes over on the bare collection (no
    // published/hidden/visibility filter — admin must see drafts +
    // hidden rows). CRUD from this tab OR another admin client now
    // patches the visible list within ~1 s without manual refresh.
    //
    // Each section instance opens its own snapshot via a `key` on the
    // parent page (pages/admin/{section}/index.vue), so switching
    // sections tears down the prior listener cleanly. The dashboard's
    // prewarm to `admin-list-cache` still paints the cached rows
    // instantly while the snapshot wires up.
    const snapshot = useAdminListSnapshot<AdminListItem>({
        // The composable's `data` is `Ref<Array<{id,...}>>`; the
        // collection name is captured at mount time. Switching admin
        // section unmounts the AdminCollectionList instance (each
        // /admin/{section}/index.vue uses a `key` derived from the
        // route), so we don't have to handle a reactive collection
        // change inside the composable.
        collection: definition.value.collection,
        sort: compareAdminRowsByOrderThenId,
        initial: () => listCache.value[definition.value.collection],
    });

    // Whenever the snapshot's data updates (initial fetch, snapshot
    // event, or a local optimistic splice), mirror it into the shared
    // `admin-list-cache` so cross-page navigation paints the latest
    // state immediately and so AdminDocumentEditor's save flow stays in
    // sync with what the user sees here.
    watch(
        () => snapshot.data.value,
        (next) => {
            if (next == null) return;
            const collection = definition.value.collection;
            // Skip the write if the cache already holds the same array
            // reference (e.g. snapshot reusing its prior slice). Avoids
            // a redundant useState write that would re-trigger every
            // downstream watcher.
            if (listCache.value[collection] === next) return;
            listCache.value = { ...listCache.value, [collection]: next };
        },
        { immediate: true, deep: true }
    );

    // `items` stays a writable computed so the existing optimistic-
    // delete + optimisticSave helpers (which take a `Ref<T[]>`) keep
    // working unchanged. The reads target the snapshot's authoritative
    // data ref; writes patch it in place AND mirror into the shared
    // cache via the watcher above.
    const items = computed<AdminListItem[]>({
        get: () => snapshot.data.value ?? listCache.value[definition.value.collection] ?? [],
        set: (next) => {
            snapshot.data.value = next;
        },
    });

    const errorMessage = computed<string | null>(() =>
        snapshot.error.value ? adminErrorMessage(snapshot.error.value) : null
    );
    const pending = computed(() => snapshot.pending.value);
    // Subtle "refreshing" chip while a background fetch is in flight
    // against an already-rendered list. Empty-list pending falls
    // through to the skeleton path.
    const refreshing = computed(() => pending.value && items.value.length > 0);

    const refresh = async () => {
        try {
            await snapshot.refresh();
        } catch (error) {
            // refresh() never rejects in the current composable — it
            // catches internally and surfaces via `error.value` — but
            // wrap defensively in case the contract changes.
            toast.error(adminErrorMessage(error) || "Failed to refresh list");
        }
    };

    // --- Mobile bottom-sheet editor ---------------------------------------

    // Intercept row taps on mobile (≤1023px) and open the bottom-sheet
    // editor instead of navigating to /admin/{section}/{id}. Desktop keeps
    // full-page navigation. The breakpoint matches `layouts/admin.vue`,
    // which flips the sidebar / bottom-tab nav at the same threshold.
    const isMobileViewport = useMediaQuery("(max-width: 1023px)");
    const editorSheet = useAdminEditorSheet();

    const onRowClick = (event: MouseEvent, id: string) => {
        if (!isMobileViewport.value) return;
        // Honor modified clicks (cmd/ctrl-click → open in new tab, etc.).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        // Blur the row before opening the sheet. vaul-vue marks the rest
        // of the document `aria-hidden` while the drawer is open; if the
        // tapped NuxtLink still has focus, the browser flags it as
        // "focused element inside aria-hidden ancestor" — accessibility
        // violation. Blurring lets the drawer's FocusScope take over
        // cleanly.
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.blur();
        }
        // Pass the admin-route key. Plan H aligned route/collection 1:1
        // (`work`, `writing`, `roadmap`), so the two are interchangeable
        // for the live admin sections; `AdminDocumentEditor` still
        // resolves via `resolveAdminCollection(section)` keyed by route.
        editorSheet.openSheet(definition.value.route, id);
    };

    // --- Swipe-to-delete ---------------------------------------------------

    const confirmTargetId = ref<string | null>(null);
    const pendingDeleteIds = ref<Set<string>>(new Set());

    const confirmMessage = computed(() => {
        if (!confirmTargetId.value) return "";
        const target = items.value.find((x) => x.id === confirmTargetId.value);
        const title = target ? definition.value.title(target) : confirmTargetId.value;
        return `Permanently delete "${title}"? This cannot be undone.`;
    });

    const requestDelete = (id: string) => {
        confirmTargetId.value = id;
    };

    const performDelete = async () => {
        const id = confirmTargetId.value;
        confirmTargetId.value = null;
        if (!id) return;

        // Snapshot the collection + label so a `definition` switch
        // mid-request still surfaces the correct toast text.
        const collectionAtRequest = definition.value.collection;
        const labelAtRequest = definition.value.label;

        try {
            const removed = await api.optimisticDelete(
                collectionAtRequest,
                id,
                items,
                pendingDeleteIds
            );
            // `optimisticDelete` is a no-op when the target id isn't in
            // the list (e.g., the row was already spliced by another
            // path). Skip the success toast in that case so we don't lie
            // about an action that didn't happen.
            if (removed) toast.success(`${labelAtRequest} deleted`);
        } catch (error) {
            toast.error(adminErrorMessage(error) || `Failed to delete ${labelAtRequest}`);
        }
    };
</script>

<style scoped>
    .codex-admin-row {
        display: grid;
        gap: 0.5rem;
        align-items: start;
    }

    @media (width >= 640px) {
        .codex-admin-row {
            grid-template-columns: 1fr auto;
            align-items: center;
        }
    }

    .codex-admin-row.is-pending {
        opacity: 0.55;
        pointer-events: none;
    }

    .codex-admin-row-main {
        min-width: 0;
    }

    .codex-admin-row-title-line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
    }

    .codex-admin-row-title {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--fg);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 36rem;
    }

    .codex-admin-row-sub {
        margin: 0.25rem 0 0;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--soft);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .codex-admin-row-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--soft);
    }

    .codex-admin-row-id {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        color: var(--faint);
    }

    .codex-admin-error {
        padding: 1rem;
        border: 1px solid var(--phoenix-ember);
        background: color-mix(in oklch, var(--bg) 90%, var(--phoenix-ember));
        color: var(--phoenix-ember);
        font-size: 0.85rem;
    }

    .codex-admin-empty {
        padding: 2rem;
        border: 1px dashed var(--rule-soft);
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--soft);
    }

    .codex-admin-refreshing {
        margin: 0 0 0.75rem;
        padding: 0.35rem 0.65rem;
        align-self: flex-end;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--soft);
        border: 1px solid var(--rule-soft);
        background: color-mix(in oklch, var(--bg) 94%, var(--accent));
        width: max-content;
    }
</style>
