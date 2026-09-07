<template>
    <section>
        <AdminPageHeader title="Messages" description="Contact form inbox." eyebrow="Contact" />

        <div v-if="pending" class="grid gap-3">
            <Skeleton v-for="item in 5" :key="item" class="h-24 w-full" />
        </div>

        <div v-else-if="errorMessage" class="codex-messages-error">
            {{ errorMessage }}
        </div>

        <div v-else-if="messages.length === 0" class="codex-messages-empty">No messages yet.</div>

        <div v-else class="codex-messages-list">
            <article v-for="message in messages" :key="message.id" class="codex-message-card">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <h2 class="text-sm font-semibold">
                                {{ message.subject || "No subject" }}
                            </h2>
                            <Badge :variant="message.read ? 'outline' : 'secondary'">
                                {{ message.read ? "read" : "unread" }}
                            </Badge>
                        </div>
                        <p class="mt-1 text-sm text-muted-foreground">
                            {{ message.name }} ·
                            <a
                                class="underline underline-offset-4"
                                :href="`mailto:${message.email}`"
                                >{{ message.email }}</a
                            >
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        class="codex-btn codex-btn-outline"
                        :disabled="savingId === message.id"
                        @click="toggleRead(message)"
                    >
                        {{ message.read ? "Mark unread" : "Mark read" }}
                    </Button>
                </div>
                <p class="mt-4 whitespace-pre-wrap text-sm leading-6">{{ message.message }}</p>
            </article>
        </div>
    </section>
</template>

<script setup lang="ts">
    import { Badge } from "@/components/ui/badge";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";
    import { useAdminApi, type AdminMessage } from "~/composables/useAdminApi";
    import { useAdminListSnapshot } from "~/composables/useAdminRealtime";
    import { adminErrorMessage } from "~/utils/adminForm";

    definePageMeta({
        layout: "admin",
        middleware: "admin-auth",
    });

    const api = useAdminApi();
    const savingId = ref<string | null>(null);
    const errorMessage = ref<string | null>(null);

    // Realtime messages list: subscribes to `/messages` with
    // `createdAt desc` so an incoming contact-form submission (Plan E
    // Cloud Function writes the doc server-side after App Check
    // verification) lands at the top of the list within ~1 s without
    // a refresh. Uses `initialFetchFn` because "messages" is not in
    // ALLOWED_CONTENT_COLLECTIONS — it has a dedicated endpoint.
    const snapshot = useAdminListSnapshot<Omit<AdminMessage, "id">>({
        collection: "messages",
        orderBy: [{ field: "createdAt", direction: "desc" }],
        limit: 100,
        initialFetchFn: () => api.listMessages(100) as Promise<AdminMessage[]>,
    });
    const messages = computed<AdminMessage[]>(
        () => (snapshot.data.value as AdminMessage[] | null) ?? []
    );
    const pending = computed(() => snapshot.pending.value);

    // Surface snapshot fetch errors. Snapshot listener failures are
    // logged to the console only (see composable) so the prior data
    // stays visible during transient blips.
    watch(
        () => snapshot.error.value,
        (err) => {
            if (err && messages.value.length === 0) {
                errorMessage.value = adminErrorMessage(err);
            } else if (!err) {
                errorMessage.value = null;
            }
        },
        { immediate: true }
    );

    const toggleRead = async (message: AdminMessage) => {
        savingId.value = message.id;
        errorMessage.value = null;
        try {
            // Server confirms first; the realtime snapshot fires the
            // updated doc within ~1 s and the visible row flips
            // automatically. No local mutation here — letting the
            // snapshot drive avoids the rollback dance when the
            // snapshot lands mid-await with a stale object reference.
            await api.updateMessage(message.id, !message.read);
        } catch (error) {
            errorMessage.value = adminErrorMessage(error);
        } finally {
            savingId.value = null;
        }
    };
</script>

<style scoped>
    .codex-messages-list {
        display: grid;
        gap: 0.8rem;
    }

    .codex-message-card,
    .codex-messages-empty,
    .codex-messages-error {
        border: 1px solid color-mix(in oklch, var(--line) 55%, transparent);
        border-radius: 8px;
        background: var(--surface-card, var(--surface));
        padding: 1rem;
    }

    .codex-message-card {
        box-shadow: 0 1px 0 color-mix(in oklch, var(--fg) 6%, transparent);
    }

    .codex-messages-empty {
        color: var(--soft);
    }

    .codex-messages-error {
        color: var(--phoenix-ember);
        border-color: var(--phoenix-ember);
        background: color-mix(in oklch, var(--bg) 88%, var(--phoenix-ember));
    }
</style>
