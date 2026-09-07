import { computed } from "vue";

/**
 * Request-scoped state for the mobile admin editor bottom sheet.
 *
 * Mobile-only UX (gated by `useMediaQuery("(max-width: 1023px)")` at the
 * call sites). Desktop continues to use full-page navigation to
 * `/admin/{section}/{id}`.
 *
 * The sheet is mounted once in `layouts/admin.vue` and reads its target
 * doc from this composable. Pages call `openSheet(section, id)` to slide
 * the editor up, `closeSheet()` to dismiss it.
 *
 * `section` is the admin-route key from `adminCollections` (e.g.,
 * `"writing"`, `"roadmap"`) — Plan H makes these identical to the
 * Firestore collection name, but we keep the route-key indirection so
 * `AdminDocumentEditor` resolves the definition via the same lookup.
 *
 * State is held in `useState` (Nuxt) so it's request-scoped on SSR — a
 * module-level `ref` would leak state across users during server render.
 *
 * The 300ms "clear targets after close" delay is held in a tracked
 * timeout handle and explicitly cancelled by `openSheet`, so a fast
 * close+reopen cycle never lands stale section/docId values.
 */

const CLOSE_CLEAR_DELAY_MS = 300;

export function useAdminEditorSheet() {
    const open = useState<boolean>("admin-editor-sheet:open", () => false);
    const section = useState<string | null>("admin-editor-sheet:section", () => null);
    const docId = useState<string | null>("admin-editor-sheet:docId", () => null);
    const pendingClear = useState<ReturnType<typeof setTimeout> | null>(
        "admin-editor-sheet:pendingClear",
        () => null
    );

    function cancelPendingClear() {
        if (pendingClear.value) {
            clearTimeout(pendingClear.value);
            pendingClear.value = null;
        }
    }

    function openSheet(routeKey: string, nextDocId: string) {
        cancelPendingClear();
        section.value = routeKey;
        docId.value = nextDocId;
        open.value = true;
    }

    function closeSheet() {
        open.value = false;
        // Defer clearing the doc target so the editor doesn't unmount
        // mid-close-animation, which would tear down the markdown editor
        // state and flash an empty body before the sheet finishes
        // dismissing. The handle is tracked so a fast close+reopen
        // cancels the clear.
        cancelPendingClear();
        if (import.meta.client) {
            pendingClear.value = setTimeout(() => {
                if (!open.value) {
                    section.value = null;
                    docId.value = null;
                }
                pendingClear.value = null;
            }, CLOSE_CLEAR_DELAY_MS);
        }
    }

    return {
        open,
        section,
        docId,
        isActive: computed(() => open.value && section.value !== null && docId.value !== null),
        openSheet,
        closeSheet,
    };
}
