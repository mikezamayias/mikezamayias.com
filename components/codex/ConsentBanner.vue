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
    .codex-consent {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 80;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 1.5rem;
        align-items: center;
        padding: 1rem 1.5rem;
        /* Use var(--bg) across both themes — the prior light-theme override to
         * --paper-deep (#ece4d2) put --soft (#4a453d) text at 7.5:1. That
         * passes WCAG 2 AA (>=4.5:1) by margin but axe-core's pixel sampler
         * flagged it intermittently in CI on the fixed-positioned banner. With
         * var(--bg) the consent text sits at a deterministic 9.5:1 in both
         * themes; the border-top keeps the banner visually distinct. */
        background: var(--bg);
        border-top: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 0.875rem;
    }
    .codex-consent-title {
        font-size: 0.875rem;
        color: var(--fg);
        margin: 0 0 0.25rem;
    }
    .codex-consent-text {
        color: var(--soft);
        margin: 0;
        max-width: 48ch;
    }
    .codex-consent-actions {
        display: flex;
        gap: 0.5rem;
    }
    .codex-consent-deny,
    .codex-consent-allow {
        appearance: none;
        border: 1px solid var(--rule);
        background: transparent;
        color: var(--fg);
        padding: 0.5rem 0.875rem;
        font-family: inherit;
        font-size: 0.8125rem;
        cursor: pointer;
        transition: border-color 150ms ease-in-out;
    }
    .codex-consent-allow {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
    }
    .codex-consent-deny:hover,
    .codex-consent-allow:hover {
        filter: brightness(1.05);
    }
    @media (width <= 640px) {
        /* matches Tailwind sm: + the body padding-bottom flip in
         * assets/css/tailwind.css */
        .codex-consent {
            grid-template-columns: 1fr;
        }
    }
    .codex-consent-enter-active,
    .codex-consent-leave-active {
        transition: transform 250ms var(--ease-out-quart);
    }
    .codex-consent-enter-from,
    .codex-consent-leave-to {
        transform: translateY(100%);
    }
</style>
