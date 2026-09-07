<template>
    <!--
        Unified empty / loading / error primitive for admin surfaces.
        Drop-in replacement for the ad-hoc state blocks scattered
        across editors and list pages — every admin shell renders the
        same chrome regardless of which surface emits it.

        Pass-through slots:
          - default: replaces body copy when you need a custom message
          - action: optional CTA below body (Reset, Retry, etc.)
    -->
    <div class="codex-state" :data-tone="tone">
        <component :is="icon" v-if="icon" class="codex-state-icon" />
        <p v-if="$slots.default" class="codex-state-body">
            <slot />
        </p>
        <p v-else-if="message" class="codex-state-body">{{ message }}</p>
        <div v-if="$slots.action" class="codex-state-action">
            <slot name="action" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-vue-next";

    type Tone = "neutral" | "empty" | "loading" | "error";

    const props = withDefaults(
        defineProps<{
            tone?: Tone;
            message?: string;
        }>(),
        {
            tone: "neutral",
            message: "",
        }
    );

    const icon = computed<LucideIcon | null>(() => {
        switch (props.tone) {
            case "empty":
                return Inbox;
            case "loading":
                return Loader2;
            case "error":
                return AlertTriangle;
            default:
                return null;
        }
    });
</script>

<style scoped>
    .codex-state {
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        text-align: center;
        padding: 2.5rem 1.5rem;
        border: 1px dashed color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 8px;
        background: var(--surface-card, var(--surface));
        font-family: var(--font-sans);
        font-size: 0.85rem;
        color: var(--soft);
    }

    .codex-state[data-tone="loading"] .codex-state-icon {
        animation: codex-state-spin 1s linear infinite;
    }

    .codex-state[data-tone="error"] {
        border-style: solid;
        border-color: var(--phoenix-ember);
        background: color-mix(in oklch, var(--bg) 92%, var(--phoenix-ember));
        color: var(--phoenix-ember);
    }

    .codex-state[data-tone="empty"] {
        color: var(--soft);
    }

    .codex-state-icon {
        width: 1.6rem;
        height: 1.6rem;
        color: var(--faint);
    }

    .codex-state[data-tone="error"] .codex-state-icon {
        color: var(--phoenix-ember);
    }

    .codex-state-body {
        margin: 0;
        line-height: 1.55;
        max-width: 28rem;
    }

    .codex-state-action {
        margin-top: 0.5rem;
    }

    @keyframes codex-state-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
