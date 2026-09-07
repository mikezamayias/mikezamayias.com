<template>
    <section class="codex-upload-panel grid gap-3 border border-dashed p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h2 class="text-sm font-semibold">Image upload</h2>
                <p class="mt-1 text-sm text-muted-foreground">PNG, JPEG, or WebP. Max 5 MB.</p>
            </div>
            <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                :disabled="disabled || uploading"
                class="sm:max-w-xs"
                @change="onFileChange"
            />
        </div>
        <div v-if="disabled" class="text-sm text-muted-foreground">
            Save with a slug or ID before uploading images.
        </div>
        <div v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</div>
        <div v-if="lastUpload" class="grid gap-2 rounded-md bg-muted p-3 text-sm">
            <span class="font-medium">Uploaded</span>
            <code class="break-all text-xs">{{ lastUpload.url }}</code>
        </div>
    </section>
</template>

<script setup lang="ts">
    import { Input } from "@/components/ui/input";
    import { useAdminApi } from "~/composables/useAdminApi";
    import { adminErrorMessage } from "~/utils/adminForm";

    interface UploadResponse {
        path: string;
        url: string;
        mime: string;
        size: number;
    }

    const props = defineProps<{
        target: "work" | "writing";
        docId: string;
        disabled?: boolean;
    }>();

    const emit = defineEmits<{
        uploaded: [upload: UploadResponse];
    }>();

    const api = useAdminApi();
    const uploading = ref(false);
    const errorMessage = ref<string | null>(null);
    const lastUpload = ref<UploadResponse | null>(null);

    const onFileChange = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || props.disabled) return;

        uploading.value = true;
        errorMessage.value = null;
        try {
            const form = new FormData();
            form.append("target", props.target);
            form.append("docId", props.docId);
            form.append("file", file);
            const upload = await api.adminFetch<UploadResponse>("/api/admin/upload", {
                method: "POST",
                body: form,
            });
            lastUpload.value = upload;
            emit("uploaded", upload);
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            uploading.value = false;
            input.value = "";
        }
    };
</script>

<style scoped>
    .codex-upload-panel {
        border-radius: 8px;
        border-color: color-mix(in oklch, var(--line) 60%, transparent);
        background: var(--surface-card, var(--surface));
    }
</style>
