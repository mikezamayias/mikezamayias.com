declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    "error-callback"?: () => void;
                    "expired-callback"?: () => void;
                    theme?: "light" | "dark" | "auto";
                    [key: string]: unknown;
                }
            ) => string;
            reset: (widgetId?: string | HTMLElement) => void;
            remove: (widgetId?: string) => void;
            getResponse: (widgetId?: string | HTMLElement) => string | undefined;
        };
    }
}

export interface UseContactFormOptions {
    turnstileEl?: Ref<HTMLElement | null>;
    resetTurnstile?: () => void;
}

const RATE_LIMIT_KEY = "contact-form-last-submit";
const RATE_LIMIT_SECONDS = 30;
const DEBOUNCE_MS = 300;

interface FormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

interface ContactRequestPayload {
    name: string;
    email: string;
    subject: string;
    message: string;
    _honey: string;
    turnstileToken: string;
}

export const useContactForm = (options?: UseContactFormOptions) => {
    const formData = reactive<FormData>({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    // Honeypot field — bots fill it, humans don't see it
    const honeypot = ref("");

    const errors = reactive<FormErrors>({});
    const isSubmitting = ref(false);
    const isSubmitted = ref(false);
    const rateLimitRemaining = ref(0);

    const internalTurnstileEl = ref<HTMLElement | null>(null);
    const turnstileEl = options?.turnstileEl ?? internalTurnstileEl;
    const turnstileToken = ref("");

    const resetWidget = () => {
        turnstileToken.value = "";
        if (options?.resetTurnstile) {
            options.resetTurnstile();
            return;
        }
        if (import.meta.client && typeof window !== "undefined" && window.turnstile) {
            try {
                if (turnstileEl.value) {
                    window.turnstile.reset(turnstileEl.value);
                } else {
                    window.turnstile.reset();
                }
            } catch {
                // Ignore reset errors if widget is not ready
            }
        }
    };

    const getTurnstileToken = (): string => {
        if (!import.meta.client || typeof window === "undefined") {
            return "";
        }
        if (turnstileToken.value) {
            return turnstileToken.value;
        }
        if (window.turnstile) {
            try {
                const token = turnstileEl.value
                    ? window.turnstile.getResponse(turnstileEl.value)
                    : window.turnstile.getResponse();
                if (token) return token;
            } catch {
                // Ignore retrieval errors
            }
        }
        const el = turnstileEl.value || (typeof document !== "undefined" ? document : null);
        const input = el?.querySelector?.(
            'input[name="cf-turnstile-response"]'
        ) as HTMLInputElement | null;
        return input?.value || "";
    };

    // Validation functions
    const validateName = (value: string): string | undefined => {
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.length > 100) return "Name must be at most 100 characters";
        return undefined;
    };

    const validateEmail = (value: string): string | undefined => {
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Please enter a valid email";
        if (value.length > 200) return "Email must be at most 200 characters";
        return undefined;
    };

    const validateSubject = (value: string): string | undefined => {
        if (!value.trim()) return "Subject is required";
        if (value.trim().length < 3) return "Subject must be at least 3 characters";
        if (value.length > 160) return "Subject must be at most 160 characters";
        return undefined;
    };

    const validateMessage = (value: string): string | undefined => {
        if (!value.trim()) return "Message is required";
        if (value.trim().length < 10) return "Message must be at least 10 characters";
        if (value.length > 5000) return "Message must be at most 5000 characters";
        return undefined;
    };

    // Debounced validation
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const validateField = (field: keyof FormData) => {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            switch (field) {
                case "name":
                    errors.name = validateName(formData.name);
                    break;
                case "email":
                    errors.email = validateEmail(formData.email);
                    break;
                case "subject":
                    errors.subject = validateSubject(formData.subject);
                    break;
                case "message":
                    errors.message = validateMessage(formData.message);
                    break;
            }
        }, DEBOUNCE_MS);
    };

    const validateAll = (): boolean => {
        errors.name = validateName(formData.name);
        errors.email = validateEmail(formData.email);
        errors.subject = validateSubject(formData.subject);
        errors.message = validateMessage(formData.message);

        return !errors.name && !errors.email && !errors.subject && !errors.message;
    };

    // Rate limiting (client-side — UX improvement, not security)
    const checkRateLimit = (): boolean => {
        if (!import.meta.client) return true;

        const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
        if (!lastSubmit) return true;

        const elapsed = (Date.now() - parseInt(lastSubmit)) / 1000;
        if (elapsed < RATE_LIMIT_SECONDS) {
            rateLimitRemaining.value = Math.ceil(RATE_LIMIT_SECONDS - elapsed);
            return false;
        }

        return true;
    };

    const setRateLimit = () => {
        if (!import.meta.client) return;
        localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
    };

    // Update rate limit countdown
    let rateLimitInterval: ReturnType<typeof setInterval> | null = null;

    const startRateLimitCountdown = () => {
        if (rateLimitInterval) clearInterval(rateLimitInterval);

        rateLimitInterval = setInterval(() => {
            if (!checkRateLimit()) {
                // rateLimitRemaining is updated in checkRateLimit
            } else {
                rateLimitRemaining.value = 0;
                if (rateLimitInterval) clearInterval(rateLimitInterval);
            }
        }, 1000);
    };

    // Computed states
    const isValid = computed(() => {
        return (
            formData.name.trim().length >= 2 &&
            formData.name.length <= 100 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
            formData.email.length <= 200 &&
            formData.subject.trim().length >= 3 &&
            formData.subject.length <= 160 &&
            formData.message.trim().length >= 10 &&
            formData.message.length <= 5000
        );
    });

    const canSubmit = computed(() => {
        return isValid.value && !isSubmitting.value && rateLimitRemaining.value === 0;
    });

    const buttonText = computed(() => {
        if (isSubmitting.value) return "Sending...";
        if (rateLimitRemaining.value > 0) return `Wait ${rateLimitRemaining.value}s`;
        return "Send Message";
    });

    // Form submission via Worker route
    const handleSubmit = async (event: Event) => {
        event.preventDefault();

        if (!validateAll()) return;
        if (!checkRateLimit()) {
            startRateLimitCountdown();
            return;
        }

        const token = getTurnstileToken();
        if (!token) {
            errors.message = "Please complete the security check";
            return;
        }

        isSubmitting.value = true;

        try {
            const payload: ContactRequestPayload = {
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                _honey: honeypot.value,
                turnstileToken: token,
            };

            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setRateLimit();
                isSubmitted.value = true;
            } else {
                resetWidget();
                let errorMessage = "Form submission failed";
                try {
                    const result = (await response.json()) as { message?: string };
                    errorMessage = result.message || errorMessage;
                } catch {
                    // Response body wasn't valid JSON — use default message
                }

                if (response.status === 429) {
                    errors.message = errorMessage;
                    setRateLimit();
                    startRateLimitCountdown();
                } else {
                    throw new Error(errorMessage);
                }
            }
        } catch (error) {
            resetWidget();
            console.error("Form submission error:", error);
            errors.message =
                error instanceof Error && error.message !== "Form submission failed"
                    ? error.message
                    : "Failed to send. Please try again.";
        } finally {
            isSubmitting.value = false;
        }
    };

    // Reset form
    const resetForm = () => {
        formData.name = "";
        formData.email = "";
        formData.subject = "";
        formData.message = "";
        honeypot.value = "";
        errors.name = undefined;
        errors.email = undefined;
        errors.subject = undefined;
        errors.message = undefined;
        isSubmitted.value = false;
        resetWidget();
    };

    // Initialize rate limit check on client
    onMounted(() => {
        checkRateLimit();
        if (rateLimitRemaining.value > 0) {
            startRateLimitCountdown();
        }
    });

    onUnmounted(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (rateLimitInterval) clearInterval(rateLimitInterval);
    });

    return {
        formData,
        honeypot,
        errors,
        isSubmitting,
        isSubmitted,
        isValid,
        canSubmit,
        buttonText,
        rateLimitRemaining,
        turnstileEl,
        turnstileToken,
        resetTurnstile: resetWidget,
        validateField,
        handleSubmit,
        resetForm,
    };
};
