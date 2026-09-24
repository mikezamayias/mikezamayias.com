<script setup lang="ts">
    import { useConsent } from "~/composables/useConsent";
    const { needsDecision, accept, decline } = useConsent();
    const { t } = useI18n();

    // Add a html class while the banner is visible so global CSS in
    // assets/css/tailwind.css reserves scroll space (padding-bottom on
    // body + scroll-padding-bottom on html). Without this the banner's
    // `position: fixed` overlays form submit buttons, footer links, and
    // anything else at the page bottom. Reactive — class is removed when
    // the user accepts/declines and `needsDecision` flips to false.
    //
    // Object syntax (not string) so existing html classes set by other
    // composables/layouts are preserved — a string value overwrites the
    // whole `class` attribute.
    //
    // Mounted on <html> rather than <body> so the global CSS selector is
    // a plain descendant (`html.has-consent-banner body { ... }`) and
    // doesn't require `:has()` — Firefox didn't ship `:has()` until v121.
    useHead(() => ({
        htmlAttrs: {
            class: {
                "has-consent-banner": Boolean(needsDecision.value),
            },
        },
    }));
</script>

<template>
    <Transition name="codex-consent">
        <div
            v-if="needsDecision"
            class="codex-consent"
            role="dialog"
            aria-labelledby="consent-title"
            aria-modal="false"
        >
            <div class="codex-consent-body">
                <h2 id="consent-title" class="codex-consent-title">
                    {{ t("consent.title") }}
                </h2>
                <p class="codex-consent-text">{{ t("consent.text") }}</p>
            </div>
            <div class="codex-consent-actions">
                <button type="button" class="codex-consent-deny" @click="decline">
                    {{ t("consent.deny") }}
                </button>
                <button type="button" class="codex-consent-allow" @click="accept">
                    {{ t("consent.allow") }}
                </button>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
    /* A small card in the letter's style, floating in the bottom corner.
     * It sits above the page rather than across it; the global CSS in
     * assets/css/tailwind.css reserves scroll space underneath while it's
     * shown. Colours are the letter tokens, which swap with the theme. */
    .codex-consent {
        position: fixed;
        left: max(16px, env(safe-area-inset-left));
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 80;
        width: min(25rem, calc(100vw - 32px));
        display: grid;
        gap: 14px;
        padding: 18px 20px 20px;
        background: var(--letter-sheet);
        color: var(--letter-text);
        border: 1px solid var(--letter-hairline);
        border-radius: 20px;
        box-shadow: var(--letter-shadow);
    }
    .codex-consent-title {
        margin: 0 0 4px;
        font: italic 400 1.125rem/1.3 var(--font-letter);
        color: var(--letter-primary);
    }
    .codex-consent-text {
        margin: 0;
        font: 400 0.9375rem/1.55 var(--font-letter);
        color: var(--letter-soft);
    }
    .codex-consent-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }
    .codex-consent-deny,
    .codex-consent-allow {
        appearance: none;
        min-height: 40px;
        padding: 8px 16px;
        border-radius: 14px;
        font: 500 0.875rem var(--font-mono);
        cursor: pointer;
        transition:
            background-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
    }
    .codex-consent-allow {
        border: 0;
        background: var(--letter-cta);
        color: var(--letter-on-cta);
    }
    .codex-consent-deny {
        border: 1.5px solid var(--letter-outline);
        background: transparent;
        color: var(--letter-text);
    }
    .codex-consent-allow:hover {
        background: var(--letter-container);
        color: var(--letter-on-container);
        box-shadow: var(--letter-shadow);
    }
    .codex-consent-deny:hover {
        border-color: var(--letter-cta);
    }
    .codex-consent-deny:focus-visible,
    .codex-consent-allow:focus-visible {
        outline: 3px solid var(--letter-primary);
        outline-offset: 3px;
    }
    .codex-consent-enter-active,
    .codex-consent-leave-active {
        transition:
            transform 250ms var(--ease-out-quart),
            opacity 250ms ease;
    }
    .codex-consent-enter-from,
    .codex-consent-leave-to {
        transform: translateY(12px);
        opacity: 0;
    }
    @media (prefers-reduced-motion: reduce) {
        .codex-consent-enter-active,
        .codex-consent-leave-active {
            transition: none;
        }
    }
</style>
