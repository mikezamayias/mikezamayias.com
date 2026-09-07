<script setup lang="ts">
    import SkeletonRow from "./SkeletonRow.vue";
    import CodexError from "./CodexError.vue";
    import { HOME_DATA_KEY } from "~/composables/useHomeData";

    const home = inject(HOME_DATA_KEY);
    if (!home) throw new Error("HOME_DATA_KEY not provided — render inside pages/index.vue");

    const { t } = useI18n();

    // Visible roadmap entries only (server already filters hidden, but defend just in case).
    const items = computed(() => home.data.value?.roadmap ?? []);

    const isLoading = computed(() => home.pending.value && home.data.value === null);
    const isError = computed(() => Boolean(home.error.value));
    const hasSoftError = computed(() => !home.pending.value && home.data.value === null);

    // Plan I follow-up: EN-only. Helper used to walk en→el fallback;
    // now it just returns the EN slot (or its EL backup for docs
    // that still carry only EL fields). Caller falls back to ID.
    function pickLocale<T>(loc: { en?: T; el?: T } | undefined): T | undefined {
        return loc?.en ?? loc?.el;
    }
</script>

<template>
    <section
        v-codex-reveal
        class="codex-section codex-container codex-reveal"
        data-section="roadmap"
    >
        <h2 class="codex-h2" data-codex-h2>{{ t("section.roadmap.heading") }}</h2>
        <SkeletonRow v-if="isLoading" :rows="3" variant="roadmap" />
        <CodexError
            v-else-if="isError || hasSoftError"
            :error="home.error.value ?? new Error('timeout')"
            :retry="home.refresh"
        />
        <ul v-else class="codex-list">
            <li
                v-for="(task, i) in items"
                :key="task.id"
                v-codex-reveal="i * 80"
                class="codex-reveal"
            >
                <component
                    :is="task.href ? 'a' : 'div'"
                    class="codex-list-row codex-shipping-row"
                    :href="task.href || undefined"
                    :target="task.href ? '_blank' : undefined"
                    :rel="task.href ? 'noopener noreferrer' : undefined"
                    :aria-label="
                        task.href
                            ? `${pickLocale(task.locale)?.title ?? task.id} on GitHub`
                            : undefined
                    "
                >
                    <span class="codex-status" :data-status="task.status">
                        {{ t(`section.roadmap.status.${task.status}`) }}
                    </span>
                    <div class="codex-shipping-body">
                        <span class="codex-shipping-title">
                            {{ pickLocale(task.locale)?.title ?? task.id }}
                        </span>
                        <span v-if="pickLocale(task.locale)?.note" class="codex-shipping-note">
                            {{ pickLocale(task.locale)?.note }}
                        </span>
                    </div>
                    <span class="codex-priority" :data-priority="task.priority">
                        {{ t(`section.roadmap.priority.${task.priority}`) }}
                    </span>
                </component>
            </li>
        </ul>
    </section>
</template>

<style scoped>
    .codex-section {
        padding: 3rem 0 1.5rem;
    }
    .codex-h2 {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--soft);
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--line);
    }
    .codex-shipping-row {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.85rem;
        padding: 1rem 1.1rem;
    }
    .codex-status {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        padding: 0.25rem 0.55rem;
        border: 1px solid currentColor;
        border-radius: 999px;
        color: var(--soft);
        white-space: nowrap;
    }
    .codex-status[data-status="shipping"] {
        color: var(--st-shipping);
    }
    .codex-status[data-status="todo"] {
        color: var(--st-todo);
    }
    .codex-status[data-status="done"] {
        color: var(--st-done);
    }
    .codex-status[data-status="blocked"] {
        color: var(--phoenix-ember);
    }
    .codex-shipping-body {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
    }
    .codex-shipping-title {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: var(--fg);
    }
    .codex-shipping-note {
        font-size: 0.78rem;
        color: var(--soft);
        line-height: 1.4;
    }
    .codex-priority {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--faint);
    }
    .codex-priority[data-priority="high"] {
        color: var(--phoenix-ember);
    }
    .codex-priority[data-priority="medium"] {
        color: var(--athena-bronze);
    }
    .codex-priority[data-priority="low"] {
        color: var(--faint);
    }
    @media (width <= 600px) {
        .codex-shipping-row {
            grid-template-columns: auto 1fr;
            grid-template-areas:
                "status body"
                "priority priority";
            row-gap: 0.35rem;
        }
        .codex-status {
            grid-area: status;
        }
        .codex-shipping-body {
            grid-area: body;
        }
        .codex-priority {
            grid-area: priority;
            justify-self: start;
        }
    }
</style>
