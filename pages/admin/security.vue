<template>
    <section>
        <AdminPageHeader
            title="Security"
            description="Manage your two-factor authentication settings."
            eyebrow="Admin"
        />

        <!-- MFA Status Panel -->
        <section class="codex-admin-panel codex-security-panel">
            <div class="codex-admin-panel-header codex-security-panel-header">
                <div>
                    <h2 class="codex-admin-panel-title">Two-Factor Authentication</h2>
                    <p class="codex-security-sub">
                        Add an extra layer of security to your account.
                    </p>
                </div>
                <span class="codex-security-badge" :data-state="isTotpEnrolled ? 'on' : 'off'">
                    {{ isTotpEnrolled ? "Enabled" : "Disabled" }}
                </span>
            </div>

            <div class="codex-admin-panel-body">
                <!-- Enrolled state -->
                <div v-if="isTotpEnrolled && enrollStep === 'idle'" class="codex-security-section">
                    <div class="codex-security-callout" data-tone="ok">
                        <FaIcon :icon="['fas', 'check-circle']" class="h-5 w-5" />
                        <div>
                            <p class="codex-security-callout-title">TOTP is active</p>
                            <p class="codex-security-callout-sub">
                                Your account is protected with an authenticator app.
                            </p>
                        </div>
                    </div>
                    <div class="codex-security-actions">
                        <button
                            type="button"
                            class="codex-btn codex-btn-outline"
                            :disabled="isProcessing"
                            @click="startReEnrollment"
                        >
                            <FaIcon :icon="['fas', 'rotate']" class="mr-2 h-4 w-4" />
                            Re-enroll
                        </button>
                        <button
                            type="button"
                            class="codex-btn codex-btn-destructive"
                            :disabled="isProcessing"
                            @click="handleUnenroll"
                        >
                            <FaIcon
                                v-if="isProcessing"
                                :icon="['fas', 'spinner']"
                                class="mr-2 h-4 w-4 animate-spin"
                            />
                            <FaIcon v-else :icon="['fas', 'trash']" class="mr-2 h-4 w-4" />
                            Remove 2FA
                        </button>
                    </div>
                </div>

                <!-- Not enrolled state -->
                <div v-if="!isTotpEnrolled && enrollStep === 'idle'" class="codex-security-section">
                    <p class="codex-security-copy">
                        Protect your admin account by requiring a verification code from an
                        authenticator app (Google Authenticator, Authy, 1Password, etc.) in addition
                        to your password.
                    </p>
                    <div class="codex-security-actions">
                        <button
                            type="button"
                            class="codex-btn codex-btn-primary"
                            :disabled="isProcessing"
                            @click="startEnrollment"
                        >
                            <FaIcon
                                v-if="isProcessing"
                                :icon="['fas', 'spinner']"
                                class="mr-2 h-4 w-4 animate-spin"
                            />
                            <FaIcon v-else :icon="['fas', 'plus']" class="mr-2 h-4 w-4" />
                            Set Up 2FA
                        </button>
                    </div>
                </div>

                <!-- Reauth prompt — shown when Firebase reports a stale sign-in. -->
                <form
                    v-if="enrollStep === 'reauth'"
                    class="codex-security-section"
                    @submit.prevent="handleReauth"
                >
                    <p class="codex-security-copy">
                        For your security, please confirm your password before changing two-factor
                        settings.
                    </p>
                    <div class="codex-security-field">
                        <label for="reauth-password" class="codex-security-label">Password</label>
                        <input
                            id="reauth-password"
                            v-model="reauthPassword"
                            type="password"
                            autocomplete="current-password"
                            required
                            class="codex-security-input"
                        />
                    </div>
                    <div class="codex-security-actions">
                        <button
                            type="submit"
                            class="codex-btn codex-btn-primary"
                            :disabled="isProcessing || !reauthPassword"
                        >
                            <FaIcon
                                v-if="isProcessing"
                                :icon="['fas', 'spinner']"
                                class="mr-2 h-4 w-4 animate-spin"
                            />
                            <FaIcon v-else :icon="['fas', 'check']" class="mr-2 h-4 w-4" />
                            Confirm
                        </button>
                        <button
                            type="button"
                            class="codex-btn codex-btn-outline"
                            @click="cancelEnrollment"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <!-- Enrollment Step: QR Code -->
                <div v-if="enrollStep === 'qr'" class="codex-security-section">
                    <p class="codex-security-copy">
                        Scan this QR code with your authenticator app, then enter the 6-digit code
                        it generates.
                    </p>

                    <div class="codex-security-qr">
                        <canvas ref="qrCanvas" />
                    </div>

                    <div class="codex-security-secret">
                        <p class="codex-security-secret-hint">
                            Can't scan? Enter this key manually:
                        </p>
                        <code class="codex-security-secret-key">{{ secretKey }}</code>
                    </div>

                    <form class="codex-security-section" @submit.prevent="handleVerifyEnrollment">
                        <div class="codex-security-field">
                            <label for="enroll-code" class="codex-security-label">
                                Verification Code
                            </label>
                            <input
                                id="enroll-code"
                                v-model="enrollCode"
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]{6}"
                                maxlength="6"
                                placeholder="000000"
                                required
                                autocomplete="one-time-code"
                                class="codex-security-input codex-security-otp"
                            />
                        </div>
                        <div class="codex-security-actions">
                            <button
                                type="submit"
                                class="codex-btn codex-btn-primary"
                                :disabled="isProcessing || enrollCode.length !== 6"
                            >
                                <FaIcon
                                    v-if="isProcessing"
                                    :icon="['fas', 'spinner']"
                                    class="mr-2 h-4 w-4 animate-spin"
                                />
                                <FaIcon v-else :icon="['fas', 'check']" class="mr-2 h-4 w-4" />
                                Verify &amp; Enable
                            </button>
                            <button
                                type="button"
                                class="codex-btn codex-btn-outline"
                                @click="cancelEnrollment"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Error -->
                <div v-if="errorMessage" class="codex-admin-error codex-security-feedback">
                    <FaIcon :icon="['fas', 'exclamation-circle']" class="mr-2 h-4 w-4" />
                    {{ errorMessage }}
                </div>

                <!-- Success -->
                <div v-if="successMessage" class="codex-security-feedback" data-tone="ok">
                    <FaIcon :icon="['fas', 'check-circle']" class="mr-2 h-4 w-4" />
                    {{ successMessage }}
                </div>
            </div>
        </section>

        <!-- Account Panel -->
        <section class="codex-admin-panel codex-security-panel">
            <div class="codex-admin-panel-header">
                <h2 class="codex-admin-panel-title">Account</h2>
            </div>
            <dl class="codex-security-meta">
                <div class="codex-security-meta-row">
                    <dt>Email</dt>
                    <dd>{{ user?.email || "—" }}</dd>
                </div>
                <div class="codex-security-meta-row">
                    <dt>User ID</dt>
                    <dd class="codex-security-meta-mono">{{ user?.uid || "—" }}</dd>
                </div>
                <div class="codex-security-meta-row">
                    <dt>MFA Factors</dt>
                    <dd>{{ enrolledFactorCount }}</dd>
                </div>
            </dl>
        </section>
    </section>
</template>

<script setup lang="ts">
    import type { TotpSecret } from "firebase/auth";
    import { multiFactor } from "firebase/auth";
    import { encode as encodeQR } from "uqr";

    definePageMeta({
        layout: "admin",
        middleware: "admin-auth",
    });

    const {
        user,
        hasTotpEnrolled,
        reauthenticate,
        startTotpEnrollment,
        finalizeTotpEnrollment,
        unenrollTotp,
    } = useAuth();

    type EnrollStep = "idle" | "reauth" | "qr";
    const enrollStep = ref<EnrollStep>("idle");
    const enrollCode = ref("");
    const secretKey = ref("");
    const isProcessing = ref(false);
    const errorMessage = ref<string | null>(null);
    const successMessage = ref<string | null>(null);
    const qrCanvas = ref<HTMLCanvasElement | null>(null);

    // Reauth flow — Firebase requires recent sign-in (~5min) for MFA
    // enroll / unenroll. When `auth/requires-recent-login` lands we
    // pivot to the password prompt and resume the original action
    // (`enrollment` | `unenroll`) once the credential refresh
    // succeeds.
    type PendingAction = "enrollment" | "unenroll" | null;
    const pendingAction = ref<PendingAction>(null);
    const reauthPassword = ref("");

    // Store the TOTP secret during enrollment
    let currentTotpSecret: TotpSecret | null = null;

    const isTotpEnrolled = ref(false);
    const enrolledFactorCount = ref(0);

    // Firebase mutates the underlying User object's `enrolledFactors`
    // array in-place after `multiFactor.enroll()` / `unenroll()`. The
    // Vue user ref points at the same User instance, so a computed
    // over `multiFactor(user.value).enrolledFactors.length` would not
    // recompute on the in-place mutation. Snapshot the values into
    // refs explicitly and re-run after every enroll/unenroll.
    const refreshTotpEnrollment = async () => {
        isTotpEnrolled.value = await hasTotpEnrolled();
        enrolledFactorCount.value = user.value ? multiFactor(user.value).enrolledFactors.length : 0;
    };
    watch(user, refreshTotpEnrollment, { immediate: true });

    const clearMessages = () => {
        errorMessage.value = null;
        successMessage.value = null;
    };

    const isRecentLoginError = (err: unknown): boolean => {
        return (err as { code?: string })?.code === "auth/requires-recent-login";
    };

    const friendlyError = (err: unknown, fallback: string): string => {
        const code = (err as { code?: string })?.code;
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
            return "Incorrect password. Try again.";
        }
        if (code === "auth/too-many-requests") {
            return "Too many attempts. Wait a minute and try again.";
        }
        return err instanceof Error ? err.message : fallback;
    };

    const renderQrToCanvas = (canvas: HTMLCanvasElement, text: string) => {
        const { data } = encodeQR(text);
        const moduleCount = data.length;
        const size = 220;
        const margin = 1;
        const moduleSize = (size - margin * 2) / moduleCount;

        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = "#000000";
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (data[row]?.[col]) {
                    ctx.fillRect(
                        margin + col * moduleSize,
                        margin + row * moduleSize,
                        moduleSize,
                        moduleSize
                    );
                }
            }
        }
    };

    const runEnrollment = async () => {
        currentTotpSecret = await startTotpEnrollment();
        secretKey.value = currentTotpSecret.secretKey;
        enrollStep.value = "qr";

        await nextTick();
        if (qrCanvas.value && user.value?.email) {
            const uri = currentTotpSecret.generateQrCodeUrl(user.value.email, "MZ Portfolio Admin");
            renderQrToCanvas(qrCanvas.value, uri);
        }
    };

    const startEnrollment = async () => {
        clearMessages();
        isProcessing.value = true;

        try {
            await runEnrollment();
        } catch (err) {
            if (isRecentLoginError(err)) {
                pendingAction.value = "enrollment";
                enrollStep.value = "reauth";
                clearMessages();
            } else {
                errorMessage.value = friendlyError(err, "Failed to start enrollment");
            }
        } finally {
            isProcessing.value = false;
        }
    };

    const startReEnrollment = async () => {
        clearMessages();
        isProcessing.value = true;

        try {
            await unenrollTotp();
            await runEnrollment();
        } catch (err) {
            if (isRecentLoginError(err)) {
                pendingAction.value = "enrollment";
                enrollStep.value = "reauth";
                clearMessages();
            } else {
                errorMessage.value = friendlyError(err, "Failed to start re-enrollment");
            }
        } finally {
            isProcessing.value = false;
        }
    };

    const handleVerifyEnrollment = async () => {
        if (!currentTotpSecret) return;

        clearMessages();
        isProcessing.value = true;

        try {
            await finalizeTotpEnrollment(currentTotpSecret, enrollCode.value, "Authenticator App");
            currentTotpSecret = null;
            enrollCode.value = "";
            enrollStep.value = "idle";
            successMessage.value = "Two-factor authentication has been enabled.";
            await refreshTotpEnrollment();
        } catch (err) {
            errorMessage.value = friendlyError(err, "Invalid code. Please try again.");
            enrollCode.value = "";
        } finally {
            isProcessing.value = false;
        }
    };

    const cancelEnrollment = () => {
        currentTotpSecret = null;
        enrollCode.value = "";
        reauthPassword.value = "";
        pendingAction.value = null;
        enrollStep.value = "idle";
        clearMessages();
    };

    const handleUnenroll = async () => {
        clearMessages();
        isProcessing.value = true;

        try {
            await unenrollTotp();
            successMessage.value = "Two-factor authentication has been removed.";
            await refreshTotpEnrollment();
        } catch (err) {
            if (isRecentLoginError(err)) {
                pendingAction.value = "unenroll";
                enrollStep.value = "reauth";
                clearMessages();
            } else {
                errorMessage.value = friendlyError(err, "Failed to remove 2FA");
            }
        } finally {
            isProcessing.value = false;
        }
    };

    const handleReauth = async () => {
        clearMessages();
        isProcessing.value = true;

        try {
            await reauthenticate(reauthPassword.value);
            reauthPassword.value = "";
            const next = pendingAction.value;
            pendingAction.value = null;
            enrollStep.value = "idle";

            if (next === "enrollment") {
                await startEnrollment();
            } else if (next === "unenroll") {
                await handleUnenroll();
            }
        } catch (err) {
            errorMessage.value = friendlyError(err, "Reauthentication failed");
        } finally {
            isProcessing.value = false;
        }
    };
</script>

<style scoped>
    .codex-admin-panel {
        border: 1px solid color-mix(in oklch, var(--line) 55%, transparent);
        border-radius: 8px;
        background: var(--surface-card, var(--surface));
        overflow: hidden;
    }

    .codex-admin-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid color-mix(in oklch, var(--line) 48%, transparent);
    }

    .codex-admin-panel-body {
        padding: 1rem;
    }

    .codex-admin-panel-title {
        margin: 0;
        font-weight: 850;
        color: var(--fg);
    }

    .codex-admin-error {
        border-radius: 8px;
        border: 1px solid var(--phoenix-ember);
        background: color-mix(in oklch, var(--bg) 90%, var(--phoenix-ember));
        color: var(--phoenix-ember);
        padding: 0.75rem 1rem;
    }

    .codex-security-panel {
        margin-bottom: 1.5rem;
    }

    .codex-security-panel-header {
        align-items: flex-start;
        gap: 1rem;
    }

    .codex-security-sub {
        margin: 0.4rem 0 0;
        font-size: 0.82rem;
        color: var(--soft);
        line-height: 1.5;
    }

    .codex-security-badge {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 0.3rem 0.6rem;
        border: 1px solid color-mix(in oklch, var(--line) 58%, transparent);
        border-radius: 999px;
        color: var(--soft);
        background: var(--surface);
        white-space: nowrap;
    }

    .codex-security-badge[data-state="on"] {
        color: var(--olive-victor);
        border-color: var(--olive-victor);
        background: color-mix(in oklch, var(--bg) 90%, var(--olive-victor));
    }

    .codex-security-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .codex-security-section + .codex-security-section {
        margin-top: 1rem;
    }

    .codex-security-copy {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.55;
        color: var(--soft);
    }

    .codex-security-callout {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border: 1px solid color-mix(in oklch, var(--line) 58%, transparent);
        border-radius: 8px;
        background: var(--surface);
    }

    .codex-security-callout[data-tone="ok"] {
        border-color: var(--olive-victor);
        background: color-mix(in oklch, var(--bg) 92%, var(--olive-victor));
        color: var(--olive-victor);
    }

    .codex-security-callout-title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--fg);
    }

    .codex-security-callout-sub {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: var(--soft);
        line-height: 1.45;
    }

    .codex-security-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .codex-security-actions .codex-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.55rem 0.95rem;
        cursor: pointer;
    }

    .codex-security-actions .codex-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .codex-security-field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .codex-security-label {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--soft);
    }

    .codex-security-input {
        font-family: var(--font-sans);
        font-size: 0.92rem;
        padding: 0.72rem 0.85rem;
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 8px;
        background: var(--bg);
        color: var(--fg);
        outline: none;
        transition:
            border-color 0.2s var(--ease-out-expo),
            background-color 0.2s var(--ease-out-expo);
    }

    .codex-security-input:focus {
        border-color: var(--accent);
        background: color-mix(in oklch, var(--bg) 94%, var(--accent));
    }

    .codex-security-otp {
        text-align: center;
        letter-spacing: 0.4em;
        font-size: 1.5rem;
    }

    .codex-security-qr {
        align-self: flex-start;
        padding: 1rem;
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 8px;
        background: #ffffff;
    }

    .codex-security-secret {
        padding: 0.85rem;
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 8px;
        background: var(--surface);
    }

    .codex-security-secret-hint {
        margin: 0 0 0.35rem;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--faint);
    }

    .codex-security-secret-key {
        display: block;
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--fg);
        word-break: break-all;
    }

    .codex-security-feedback {
        margin-top: 1rem;
        display: flex;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 0.82rem;
    }

    .codex-security-feedback[data-tone="ok"] {
        padding: 0.75rem 1rem;
        border: 1px solid var(--olive-victor);
        background: color-mix(in oklch, var(--bg) 92%, var(--olive-victor));
        color: var(--olive-victor);
    }

    .codex-security-meta {
        margin: 0;
        padding: 0;
    }

    .codex-security-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 1rem;
        border-top: 1px solid color-mix(in oklch, var(--line) 48%, transparent);
        font-size: 0.85rem;
    }

    .codex-security-meta-row:first-child {
        border-top: 0;
    }

    .codex-security-meta-row dt {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--soft);
    }

    .codex-security-meta-row dd {
        margin: 0;
        color: var(--fg);
        text-align: right;
    }

    .codex-security-meta-mono {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        color: var(--soft);
    }
</style>
