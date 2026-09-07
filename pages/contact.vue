<script setup lang="ts">
    import { useContactInfo } from "~/composables/useCodexContent";

    // Plan I follow-up: contact info reads via realtime snapshot so admin
    // edits (email, availability) propagate without a page refresh. SSR
    // still hits `/api/content/contact/main` on first paint; the listener
    // takes over after hydration.
    const { t } = useI18n();
    const head = useLocaleHead();
    const { data: contactInfo } = useContactInfo();
    const contactEmail = computed(() => contactInfo.value?.email || "contact@mikezamayias.com");
    const config = useRuntimeConfig();
    const turnstileSiteKey = config.public.turnstileSiteKey;
    const turnstileEl = ref<HTMLElement | null>(null);
    const turnstileWidgetId = ref<string | null>(null);

    const resetTurnstile = () => {
        if (import.meta.client && typeof window !== "undefined" && window.turnstile) {
            if (turnstileWidgetId.value) {
                window.turnstile.reset(turnstileWidgetId.value);
            } else if (turnstileEl.value) {
                window.turnstile.reset(turnstileEl.value);
            } else {
                window.turnstile.reset();
            }
        }
    };

    const {
        formData,
        honeypot,
        errors,
        isSubmitting,
        isSubmitted,
        canSubmit,
        buttonText,
        validateField,
        handleSubmit,
        resetForm,
    } = useContactForm({
        turnstileEl,
        resetTurnstile,
    });

    const formErrorSummary = computed(() =>
        [errors.name, errors.email, errors.subject, errors.message].filter(Boolean).join(" ")
    );

    useHead(head);
    useHead({
        script: [
            {
                src: "https://challenges.cloudflare.com/turnstile/v0/api.js",
                async: true,
                defer: true,
            },
        ],
    });

    onMounted(() => {
        const renderTurnstile = () => {
            if (!turnstileEl.value || !turnstileSiteKey || !window.turnstile) return;
            if (turnstileEl.value.childElementCount > 0) return;
            try {
                turnstileWidgetId.value = window.turnstile.render(turnstileEl.value, {
                    sitekey: turnstileSiteKey,
                });
            } catch {
                // Container may already be rendered
            }
        };

        if (import.meta.client && typeof window !== "undefined") {
            if (window.turnstile) {
                renderTurnstile();
            } else {
                const poll = setInterval(() => {
                    if (window.turnstile) {
                        clearInterval(poll);
                        renderTurnstile();
                    }
                }, 100);
                setTimeout(() => clearInterval(poll), 10000);
            }
        }
    });

    onUnmounted(() => {
        if (turnstileWidgetId.value && typeof window !== "undefined" && window.turnstile) {
            try {
                window.turnstile.remove(turnstileWidgetId.value);
            } catch {
                // ignore
            }
        }
    });

    useSeoMeta({
        title: "Contact · Mike Zamayias",
        description: "Write to Mike Zamayias, mobile engineer in Heraklion, Crete.",
    });
</script>

<template>
    <main id="main" role="main" class="codex-contact codex-container-wide">
        <section class="codex-contact-intro" aria-labelledby="contact-title">
            <p class="codex-contact-kicker">{{ t("page.contact.kicker") }}</p>
            <h1 id="contact-title" class="codex-h1-page">{{ t("page.contact.heading") }}</h1>
            <p class="codex-lede">{{ t("page.contact.lede") }}</p>
            <a class="codex-cta-link" :href="`mailto:${contactEmail}`">
                {{ contactEmail }}
            </a>
        </section>

        <section class="codex-contact-form-wrap" aria-labelledby="contact-form-title">
            <div v-if="isSubmitted" class="codex-contact-success" aria-live="polite">
                <h2 id="contact-form-title">{{ t("page.contact.successTitle") }}</h2>
                <p>{{ t("page.contact.successText") }}</p>
                <button type="button" class="codex-secondary-button" @click="resetForm">
                    {{ t("page.contact.sendAnother") }}
                </button>
            </div>

            <form
                v-else
                class="codex-contact-form"
                novalidate
                aria-describedby="contact-status"
                @submit="handleSubmit"
            >
                <h2 id="contact-form-title">{{ t("page.contact.formTitle") }}</h2>

                <div class="codex-field-grid">
                    <label class="codex-field">
                        <span>{{ t("page.contact.name") }}</span>
                        <input
                            v-model="formData.name"
                            type="text"
                            name="name"
                            autocomplete="name"
                            :aria-invalid="Boolean(errors.name)"
                            @blur="validateField('name')"
                        />
                        <small v-if="errors.name">{{ errors.name }}</small>
                    </label>

                    <label class="codex-field">
                        <span>{{ t("page.contact.emailLabel") }}</span>
                        <input
                            v-model="formData.email"
                            type="email"
                            name="email"
                            autocomplete="email"
                            :aria-invalid="Boolean(errors.email)"
                            @blur="validateField('email')"
                        />
                        <small v-if="errors.email">{{ errors.email }}</small>
                    </label>
                </div>

                <label class="codex-field">
                    <span>{{ t("page.contact.subject") }}</span>
                    <input
                        v-model="formData.subject"
                        type="text"
                        name="subject"
                        autocomplete="off"
                        :aria-invalid="Boolean(errors.subject)"
                        @blur="validateField('subject')"
                    />
                    <small v-if="errors.subject">{{ errors.subject }}</small>
                </label>

                <label class="codex-field">
                    <span>{{ t("page.contact.message") }}</span>
                    <textarea
                        v-model="formData.message"
                        name="message"
                        rows="8"
                        :aria-invalid="Boolean(errors.message)"
                        @blur="validateField('message')"
                    />
                    <small v-if="errors.message">{{ errors.message }}</small>
                </label>

                <label class="codex-honey" tabindex="-1" aria-hidden="true">
                    <span>Company website</span>
                    <input v-model="honeypot" type="text" name="company" tabindex="-1" />
                </label>

                <div ref="turnstileEl" class="cf-turnstile" :data-sitekey="turnstileSiteKey" />

                <div id="contact-status" class="codex-form-status" aria-live="polite">
                    <span v-if="formErrorSummary">{{ formErrorSummary }}</span>
                </div>

                <button
                    type="submit"
                    class="codex-primary-button"
                    :disabled="!canSubmit || isSubmitting"
                >
                    {{ buttonText }}
                </button>
            </form>
        </section>
    </main>
</template>

<style scoped>
    .codex-contact {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
        gap: clamp(2rem, 6vw, 5rem);
        align-items: start;
        padding-top: clamp(3rem, 8vw, 6rem);
        padding-bottom: 5rem;
    }
    .codex-contact-kicker {
        color: var(--soft);
        font-size: 0.76rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        margin: 0 0 1rem;
    }
    .codex-h1-page {
        font-family: var(--font-display);
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 0 0 1rem;
    }
    .codex-lede {
        font-size: 1.125rem;
        color: var(--fg);
        margin-bottom: 1.5rem;
        max-width: 42rem;
    }
    .codex-contact-form-wrap {
        border-left: 1px solid var(--line);
        padding-left: clamp(1.5rem, 4vw, 3rem);
    }
    .codex-contact-form,
    .codex-contact-success {
        display: grid;
        gap: 1rem;
    }
    .codex-contact-form h2,
    .codex-contact-success h2 {
        font-size: 1rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin: 0 0 0.5rem;
    }
    .codex-field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }
    .codex-field {
        display: grid;
        gap: 0.45rem;
    }
    .codex-field span {
        color: var(--soft);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .codex-field input,
    .codex-field textarea {
        width: 100%;
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        background: var(--surface-card, var(--surface));
        color: var(--fg);
        font: inherit;
        padding: 0.85rem 0.9rem;
        border-radius: 8px;
        outline: none;
        transition:
            border-color 0.2s var(--ease-out-expo),
            background-color 0.2s var(--ease-out-expo),
            box-shadow 0.2s var(--ease-out-expo);
    }
    .codex-field input:hover,
    .codex-field textarea:hover {
        border-color: var(--rule);
    }
    .codex-field input:focus,
    .codex-field textarea:focus {
        border-color: var(--accent);
        background: color-mix(in oklch, var(--bg) 94%, var(--accent));
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 14%, transparent);
    }
    .codex-field textarea {
        min-height: 13rem;
        resize: vertical;
    }
    .codex-field input[aria-invalid="true"],
    .codex-field textarea[aria-invalid="true"] {
        border-color: var(--phoenix-ember);
    }
    .codex-field small,
    .codex-form-status {
        min-height: 1.2rem;
        color: var(--phoenix-ember);
        font-size: 0.78rem;
    }
    .codex-honey {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
    .codex-primary-button,
    .codex-secondary-button {
        min-height: 2.75rem;
        width: fit-content;
        border: 1px solid var(--fg);
        background: var(--fg);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        transition:
            background-color 0.25s var(--ease-out-expo),
            color 0.25s var(--ease-out-expo),
            border-color 0.25s var(--ease-out-expo),
            transform 0.25s var(--ease-out-expo);
    }
    .codex-primary-button:hover,
    .codex-secondary-button:hover {
        transform: translateY(-1px);
    }
    .codex-primary-button:hover {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--argent);
    }
    .codex-primary-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
    }
    .codex-secondary-button {
        background: transparent;
        color: var(--fg);
    }
    .codex-secondary-button:hover {
        border-color: var(--accent);
    }
    .codex-contact-success p {
        color: var(--soft);
        margin: 0 0 0.5rem;
    }
    .codex-cta-link {
        color: var(--accent);
        font-family: var(--font-mono);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.28em;
    }
    @media (width <= 820px) {
        .codex-contact {
            grid-template-columns: 1fr;
        }
        .codex-contact-form-wrap {
            border-left: 0;
            padding-left: 0;
            border-top: 1px solid var(--line);
            padding-top: 2rem;
        }
        .codex-field-grid {
            grid-template-columns: 1fr;
        }
    }
    /* Tighter form chrome at phone widths — the desktop padding +
     * 13rem textarea looked vacuous on a 390px viewport. */
    @media (width <= 640px) {
        .codex-field input,
        .codex-field textarea {
            padding: 0.6rem 0.75rem;
        }
        .codex-field textarea {
            min-height: 9rem;
        }
    }
</style>
