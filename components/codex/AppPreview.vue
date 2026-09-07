<script setup lang="ts">
    import type { Work } from "~/firebase/types";
    import { formatWorkStack } from "~/utils/workFormat";

    const props = withDefaults(
        defineProps<{
            work: Work;
            locale: string;
            variant?: "hero" | "card" | "detail";
        }>(),
        { variant: "card" }
    );

    const localeKey = computed(() => (props.locale === "el" ? "el" : "en"));
    const copy = computed(() => props.work.locale?.[localeKey.value] ?? props.work.locale?.en);
    const title = computed(() => copy.value?.name || props.work.slug);
    const description = computed(() => copy.value?.desc || formatWorkStack(props.work.stack));
    const stack = computed(() => formatWorkStack(props.work.stack));
    const image = computed(
        () => [...(props.work.images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]
    );
    const imageLoading = computed(() => (props.variant === "hero" ? "eager" : "lazy"));
    const imageFetchPriority = computed(() => (props.variant === "hero" ? "high" : "auto"));
    const tone = computed(() => {
        const tones = ["blue", "ember", "olive", "cyan"];
        const index = Math.abs(
            Array.from(props.work.slug).reduce((sum, char) => sum + char.charCodeAt(0), 0)
        );
        return tones[index % tones.length];
    });
</script>

<template>
    <figure class="codex-app-preview" :data-variant="variant" :data-tone="tone">
        <div class="codex-app-preview-media">
            <img
                v-if="image"
                class="codex-app-preview-image"
                :src="image.src"
                :alt="image.alt || title"
                :loading="imageLoading"
                :fetchpriority="imageFetchPriority"
                decoding="async"
            />
            <div v-else class="codex-app-preview-device" aria-hidden="true">
                <div class="codex-app-preview-status">
                    <span />
                    <span />
                    <span />
                </div>
                <div class="codex-app-preview-screen">
                    <div class="codex-app-preview-glyph">
                        {{ work.glyph || title.slice(0, 1) }}
                    </div>
                    <div class="codex-app-preview-lines">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div class="codex-app-preview-pills">
                        <span />
                        <span />
                    </div>
                </div>
            </div>
        </div>
        <figcaption class="codex-app-preview-caption">
            <span>{{ title }}</span>
            <small>{{ description }}</small>
            <em v-if="stack">{{ stack }}</em>
        </figcaption>
    </figure>
</template>

<style scoped>
    .codex-app-preview {
        margin: 0;
        position: relative;
        display: grid;
        gap: 0.9rem;
        min-width: 0;
    }

    .codex-app-preview-media {
        display: grid;
        width: 100%;
        aspect-ratio: 0.74;
        max-height: 34rem;
        min-width: 0;
    }

    .codex-app-preview-device,
    .codex-app-preview-image {
        width: 100%;
        height: 100%;
        min-height: 0;
        border-radius: 28px;
        border: 1px solid color-mix(in oklch, var(--fg) 10%, transparent);
        box-shadow: var(--shadow-soft, 0 18px 50px color-mix(in oklch, var(--fg) 14%, transparent));
    }

    .codex-app-preview-image {
        object-fit: cover;
        background: var(--surface);
    }

    .codex-app-preview-device {
        padding: 0.85rem;
        background:
            linear-gradient(145deg, color-mix(in oklch, var(--fg) 10%, transparent), transparent),
            var(--surface-card, var(--surface));
    }

    .codex-app-preview-status {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.25rem 0.45rem 0.65rem;
    }

    .codex-app-preview-status span {
        display: block;
        height: 0.38rem;
        border-radius: 999px;
        background: color-mix(in oklch, var(--fg) 18%, transparent);
    }

    .codex-app-preview-status span:first-child {
        width: 2.4rem;
    }

    .codex-app-preview-status span:nth-child(2) {
        width: 3.6rem;
        background: color-mix(in oklch, var(--fg) 9%, transparent);
    }

    .codex-app-preview-status span:last-child {
        width: 1.8rem;
    }

    .codex-app-preview-screen {
        height: calc(100% - 1.5rem);
        border-radius: 22px;
        padding: clamp(1rem, 4vw, 1.5rem);
        display: grid;
        align-content: end;
        gap: 1.1rem;
        overflow: hidden;
        background:
            linear-gradient(
                180deg,
                transparent 0%,
                color-mix(in oklch, var(--fg) 12%, transparent) 100%
            ),
            var(--surface-cool, color-mix(in oklch, var(--surface) 76%, var(--blue-bavarian)));
    }

    .codex-app-preview[data-tone="ember"] .codex-app-preview-screen {
        background:
            linear-gradient(
                180deg,
                transparent 0%,
                color-mix(in oklch, var(--fg) 12%, transparent) 100%
            ),
            var(--surface-tint, color-mix(in oklch, var(--surface) 76%, var(--phoenix-ember)));
    }

    .codex-app-preview[data-tone="olive"] .codex-app-preview-screen {
        background:
            linear-gradient(
                180deg,
                transparent 0%,
                color-mix(in oklch, var(--fg) 12%, transparent) 100%
            ),
            var(--surface-olive, color-mix(in oklch, var(--surface) 76%, var(--olive-victor)));
    }

    .codex-app-preview[data-tone="cyan"] .codex-app-preview-screen {
        background:
            linear-gradient(
                180deg,
                transparent 0%,
                color-mix(in oklch, var(--fg) 12%, transparent) 100%
            ),
            color-mix(
                in oklch,
                var(--surface-cool, color-mix(in oklch, var(--surface) 76%, var(--blue-bavarian)))
                    68%,
                var(--santorini-cyan)
            );
    }

    .codex-app-preview-glyph {
        width: clamp(4rem, 16vw, 7rem);
        height: clamp(4rem, 16vw, 7rem);
        display: grid;
        place-items: center;
        border-radius: 24px;
        background: color-mix(in oklch, var(--bg) 82%, transparent);
        color: var(--fg);
        font-family: var(--font-display);
        font-size: clamp(2.4rem, 8vw, 4.5rem);
        line-height: 1;
        box-shadow: 0 12px 30px color-mix(in oklch, var(--fg) 10%, transparent);
    }

    .codex-app-preview-lines {
        display: grid;
        gap: 0.45rem;
    }

    .codex-app-preview-lines span,
    .codex-app-preview-pills span {
        display: block;
        border-radius: 999px;
        background: color-mix(in oklch, var(--fg) 24%, transparent);
    }

    .codex-app-preview-lines span {
        height: 0.55rem;
    }

    .codex-app-preview-lines span:first-child {
        width: 82%;
    }

    .codex-app-preview-lines span:nth-child(2) {
        width: 58%;
    }

    .codex-app-preview-lines span:last-child {
        width: 72%;
    }

    .codex-app-preview-pills {
        display: flex;
        gap: 0.5rem;
    }

    .codex-app-preview-pills span {
        width: 4.5rem;
        height: 1.8rem;
        background: color-mix(in oklch, var(--bg) 76%, transparent);
    }

    .codex-app-preview-caption {
        display: grid;
        gap: 0.12rem;
    }

    .codex-app-preview-caption span {
        font-family: var(--font-sans);
        font-size: 1rem;
        font-weight: 750;
        color: var(--fg);
    }

    .codex-app-preview-caption small,
    .codex-app-preview-caption em {
        color: var(--soft);
        font-size: 0.82rem;
        line-height: 1.45;
    }

    .codex-app-preview-caption em {
        font-family: var(--font-mono);
        font-style: normal;
        color: var(--faint);
    }

    .codex-app-preview[data-variant="hero"] .codex-app-preview-device,
    .codex-app-preview[data-variant="hero"] .codex-app-preview-image {
        transform: rotate(1.4deg) scale(0.97);
        transform-origin: 50% 56%;
    }

    .codex-app-preview[data-variant="hero"] .codex-app-preview-media {
        width: min(100%, 30rem);
        max-height: clamp(22rem, 42vw, 33rem);
        margin: 0 auto clamp(0.75rem, 1.8vw, 1.15rem);
    }

    .codex-app-preview[data-variant="detail"] .codex-app-preview-media {
        aspect-ratio: 1.05;
        max-height: none;
    }

    @media (max-width: 720px) {
        .codex-app-preview-media {
            max-height: 24rem;
        }

        .codex-app-preview[data-variant="hero"] .codex-app-preview-device,
        .codex-app-preview[data-variant="hero"] .codex-app-preview-image {
            transform: none;
        }
    }
</style>
