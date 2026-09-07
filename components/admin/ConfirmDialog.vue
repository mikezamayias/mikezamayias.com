<template>
    <Dialog :open="isOpen" @update:open="handleOpenChange">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription>{{ message }}</DialogDescription>
            </DialogHeader>
            <DialogFooter class="gap-2 sm:gap-0">
                <!--
                    `type="button"` is defensive. DialogPortal teleports
                    these buttons to <body>, so they're not inside any
                    parent <form> at render time — but if the renderer
                    ever changes (or a future shadcn-vue Dialog variant
                    drops the portal), a default `<button>` inside a
                    form posts on click. That would explain the
                    historical "screen scrolls back as if a navigation
                    happened" report.
                -->
                <Button type="button" variant="outline" @click="$emit('close')">Cancel</Button>
                <Button type="button" variant="destructive" @click="onConfirm">
                    {{ confirmText || "Confirm" }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
    import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
    } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";

    defineProps<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
    }>();

    const emit = defineEmits<{
        close: [];
        confirm: [];
    }>();

    // The dialog closes itself the moment Confirm fires — emit `close`
    // alongside `confirm` so a parent that forgets to clear its own
    // `isOpen` state still sees the dialog dismissed. Previously the
    // AdminDocumentEditor delete flow relied on the parent clearing
    // `confirmOpen` after a successful await, which silently leaked
    // when the await led to a router.push and the success branch never
    // assigned `confirmOpen.value = false` before the page unmounted.
    //
    // The double-emit is idempotent: a parent that DOES manage its
    // open state will receive `close` and set its flag to the same
    // false value it already implies. Listeners that only handle
    // `confirm` (no `close`) ignore the extra event.
    const onConfirm = () => {
        emit("confirm");
        emit("close");
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            emit("close");
        }
    };
</script>
