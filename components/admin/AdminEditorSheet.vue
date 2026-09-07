<script setup lang="ts">
    /**
     * Mobile-only bottom-sheet host for the admin document editor.
     *
     * Mounted once in `layouts/admin.vue`. Reads its target (section +
     * docId) from `useAdminEditorSheet`. Pages call `openSheet(section,
     * id)` to slide the editor up; closing the sheet via the drag handle,
     * overlay tap, save event, or route change calls `closeSheet()`.
     *
     * Desktop (lg+ viewport) keeps full-page navigation to
     * `/admin/{section}/{id}`; nothing on this component fires there.
     */
    import { watch } from "vue";
    import {
        DrawerRoot,
        DrawerPortal,
        DrawerOverlay,
        DrawerContent,
        DrawerHandle,
        DrawerTitle,
        DrawerDescription,
    } from "vaul-vue";
    import AdminDocumentEditor from "./AdminDocumentEditor.vue";

    const sheet = useAdminEditorSheet();
    const route = useRoute();

    function onOpenChange(next: boolean) {
        if (!next) sheet.closeSheet();
    }

    function onEditorSaved() {
        sheet.closeSheet();
    }

    // Close the sheet on delete too — without this, the destructive
    // action in the editor leaves the now-orphaned sheet on screen
    // (the AdminDocumentEditor's `router.push("/admin/{section}")`
    // is a no-op when the host page IS already at that URL, which is
    // the common case when the sheet was opened from the list page).
    function onEditorDeleted() {
        sheet.closeSheet();
    }

    // Close the sheet whenever the user navigates to a different admin
    // route (e.g., via the bottom-tab nav). Otherwise the sheet stays
    // mounted over the destination page and the URL no longer matches
    // the doc inside the sheet.
    watch(
        () => route.fullPath,
        (_next, prev) => {
            if (prev === undefined) return;
            if (sheet.open.value) sheet.closeSheet();
        }
    );
</script>

<template>
    <DrawerRoot :open="sheet.open.value" @update:open="onOpenChange">
        <DrawerPortal>
            <!--
                Overlay z-50 + content z-[60] so both sit above the admin
                layout's sticky header (z-50) and mobile bottom nav (z-50).
                Without this the header / bottom-nav remained interactive
                while the sheet was open.
            -->
            <DrawerOverlay class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
            <DrawerContent
                class="fixed inset-x-0 bottom-0 z-[60] mt-24 flex h-[92vh] flex-col rounded-t-[28px] border border-line/60 bg-background shadow-2xl"
            >
                <DrawerHandle class="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" />
                <DrawerTitle class="sr-only">Edit document</DrawerTitle>
                <!--
                    `<DrawerDescription>` wires aria-describedby
                    automatically through reka-ui's DialogContext. A raw
                    `<p id="...">` + manual `aria-describedby` attribute
                    isn't enough — reka-ui checks for the Description
                    sub-component specifically and emits a warning when
                    it's missing.
                -->
                <DrawerDescription class="sr-only">
                    Bottom-sheet editor for the selected admin document. Drag down or tap outside to
                    dismiss.
                </DrawerDescription>
                <div class="flex-1 overflow-y-auto px-4 pb-24 pt-2">
                    <AdminDocumentEditor
                        v-if="sheet.section.value && sheet.docId.value"
                        :id="sheet.docId.value"
                        :section="sheet.section.value"
                        @saved="onEditorSaved"
                        @deleted="onEditorDeleted"
                    />
                </div>
            </DrawerContent>
        </DrawerPortal>
    </DrawerRoot>
</template>
