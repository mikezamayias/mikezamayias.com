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
        description: () => t("page.contact.description"),
    });
</script>

<template>
    <main id="main" class="page">
        <h1 class="page-title">{{ t("page.contact.heading") }}</h1>
        <p class="page-lede">{{ t("page.contact.lede") }}</p>
        <p>
            {{ t("page.contact.direct") }}
            <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>

        <section class="page-section" aria-labelledby="contact-form-title">
            <div v-if="isSubmitted" aria-live="polite">
                <h2 id="contact-form-title">{{ t("page.contact.successTitle") }}</h2>
                <p>{{ t("page.contact.successText") }}</p>
                <button type="button" class="page-pill page-pill--quiet" @click="resetForm">
                    {{ t("page.contact.sendAnother") }}
                </button>
            </div>

            <form
                v-else
                class="page-form"
                novalidate
                aria-describedby="contact-status"
                @submit="handleSubmit"
            >
                <h2 id="contact-form-title">{{ t("page.contact.formTitle") }}</h2>

                <div class="page-field-row">
                    <label class="page-field">
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

                    <label class="page-field">
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

                <label class="page-field">
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

                <label class="page-field">
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

                <label class="contact-honey" tabindex="-1" aria-hidden="true">
                    <span>Company website</span>
                    <input v-model="honeypot" type="text" name="company" tabindex="-1" />
                </label>

                <div ref="turnstileEl" class="cf-turnstile" :data-sitekey="turnstileSiteKey" />

                <div id="contact-status" class="page-form-status" aria-live="polite">
                    <span v-if="formErrorSummary">{{ formErrorSummary }}</span>
                </div>

                <div>
                    <button type="submit" class="page-pill" :disabled="!canSubmit || isSubmitting">
                        {{ buttonText }}
                    </button>
                </div>
            </form>
        </section>
    </main>
</template>

<style scoped>
    /* The honeypot stays in the form for bots and out of sight for people. */
    .contact-honey {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
    .page-section h2 {
        font-size: 1.3em;
        line-height: 1.25;
        font-style: italic;
        font-weight: 400;
        margin: 0 0 0.2em;
    }
</style>
