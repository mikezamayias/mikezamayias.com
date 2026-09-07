<script setup lang="ts">
    /**
     * Inline banner shown above the admin document editor when an
     * IndexedDB draft exists from a previous session and is newer than
     * the server doc's last `updatedAt`. The user must explicitly choose
     * `Restore` (rehydrate the form from the draft) or `Discard` (drop
     * the draft + load the server state). The banner stays visible until
     * one of those choices is made — autosave does not run while it's up.
     *
     * The relative-time copy stays live by binding to `useNow({ interval:
     * 30_000 })`. Without it, the displayed text would freeze at the
     * moment the banner mounted and read "a few seconds ago" even after
     * the user had stepped away for hours — the most decision-relevant
     * piece of copy in the UI would be the most stale.
     */
    import { computed } from "vue";
    import { useNow } from "@vueuse/core";
    import { RotateCcw, X } from "lucide-vue-next";
    import { Button } from "@/components/ui/button";

    const props = defineProps<{
        savedAt: number;
    }>();

    defineEmits<{
        restore: [];
        dismiss: [];
    }>();

    const now = useNow({ interval: 30_000 });

    const relativeTime = computed(() => {
        const deltaMs = now.value.getTime() - props.savedAt;
        const seconds = Math.round(deltaMs / 1000);
        if (seconds < 60) return "a few seconds ago";
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
        const days = Math.round(hours / 24);
        return `${days} ${days === 1 ? "day" : "days"} ago`;
    });
</script>

<template>
    <div
        role="status"
        class="flex flex-wrap items-center gap-3 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm"
    >
        <span class="flex-1 min-w-0">
            Unsaved draft from
            <strong>{{ relativeTime }}</strong>
            available.
        </span>
        <div class="flex items-center gap-2">
            <Button type="button" size="sm" variant="default" @click="$emit('restore')">
                <RotateCcw class="mr-1 h-3.5 w-3.5" />
                Restore
            </Button>
            <Button type="button" size="sm" variant="outline" @click="$emit('dismiss')">
                <X class="mr-1 h-3.5 w-3.5" />
                Discard
            </Button>
        </div>
    </div>
</template>
