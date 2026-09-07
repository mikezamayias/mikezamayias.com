<template>
    <div class="codex-login-shell flex min-h-screen items-center justify-center px-4">
        <Card class="codex-login-card w-full max-w-md">
            <CardHeader class="text-center">
                <CardTitle class="text-2xl">Admin Login</CardTitle>
                <CardDescription>
                    {{
                        step === "credentials"
                            ? "Sign in with your credentials"
                            : "Enter your authenticator code"
                    }}
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <!-- Error Message -->
                <div
                    v-if="errorMessage"
                    class="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
                >
                    <div class="flex items-center gap-2 text-destructive">
                        <FaIcon :icon="['fas', 'exclamation-circle']" />
                        <span class="text-sm">{{ errorMessage }}</span>
                    </div>
                </div>

                <!-- Step 1: Email & Password -->
                <form v-if="step === 'credentials'" class="space-y-4" @submit.prevent="handleLogin">
                    <div class="space-y-2">
                        <Label for="email">Email</Label>
                        <Input
                            id="email"
                            v-model="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            autocomplete="email"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="password">Password</Label>
                        <Input
                            id="password"
                            v-model="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            autocomplete="current-password"
                        />
                    </div>
                    <Button
                        type="submit"
                        :disabled="isLoading"
                        class="codex-btn codex-btn-primary w-full"
                        size="lg"
                    >
                        <FaIcon
                            v-if="isLoading"
                            :icon="['fas', 'spinner']"
                            class="mr-2 h-4 w-4 animate-spin"
                        />
                        <FaIcon v-else :icon="['fas', 'right-to-bracket']" class="mr-2 h-5 w-5" />
                        {{ isLoading ? "Signing in..." : "Sign In" }}
                    </Button>
                </form>

                <!-- Step 2: TOTP Verification -->
                <form v-if="step === 'totp'" class="space-y-4" @submit.prevent="handleTotpVerify">
                    <div class="flex justify-center">
                        <FaIcon
                            :icon="['fas', 'shield-halved']"
                            class="h-12 w-12 text-muted-foreground"
                        />
                    </div>
                    <p class="text-center text-sm text-muted-foreground">
                        Open your authenticator app and enter the 6-digit code.
                    </p>
                    <div class="space-y-2">
                        <Label for="totp-code">Verification Code</Label>
                        <Input
                            id="totp-code"
                            v-model="totpCode"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]{6}"
                            maxlength="6"
                            placeholder="000000"
                            required
                            autocomplete="one-time-code"
                            class="text-center text-2xl tracking-widest"
                        />
                    </div>
                    <Button
                        type="submit"
                        :disabled="isLoading || totpCode.length !== 6"
                        class="codex-btn codex-btn-primary w-full"
                        size="lg"
                    >
                        <FaIcon
                            v-if="isLoading"
                            :icon="['fas', 'spinner']"
                            class="mr-2 h-4 w-4 animate-spin"
                        />
                        <FaIcon v-else :icon="['fas', 'check']" class="mr-2 h-4 w-4" />
                        {{ isLoading ? "Verifying..." : "Verify" }}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        class="codex-btn codex-btn-outline w-full"
                        @click="resetForm"
                    >
                        <FaIcon :icon="['fas', 'arrow-left']" class="mr-2 h-4 w-4" />
                        Back to login
                    </Button>
                </form>

                <!-- Back to site -->
                <div class="text-center">
                    <NuxtLink
                        to="/"
                        class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <FaIcon :icon="['fas', 'arrow-left']" class="h-3 w-3" />
                        Back to site
                    </NuxtLink>
                </div>
            </CardContent>
            <CardFooter class="justify-center">
                <p class="text-xs text-muted-foreground">
                    Only authorized accounts can access the admin panel.
                </p>
            </CardFooter>
        </Card>
    </div>
</template>

<script setup lang="ts">
    import type { MultiFactorResolver } from "firebase/auth";
    import {
        Card,
        CardContent,
        CardDescription,
        CardFooter,
        CardHeader,
        CardTitle,
    } from "@/components/ui/card";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";

    definePageMeta({
        layout: false,
    });

    // Login bypasses the admin layout (and therefore its `useHead` robots
    // meta) — apply the same noindex defence directly so search engines
    // can't surface the admin login form in results.
    useHead({
        meta: [{ name: "robots", content: "noindex,nofollow,noarchive" }],
    });

    const router = useRouter();
    const { user, isAdmin, loginWithEmail, verifyTotpSignIn, error: authError } = useAuth();

    const step = ref<"credentials" | "totp">("credentials");
    const email = ref("");
    const password = ref("");
    const totpCode = ref("");
    const isLoading = ref(false);
    const errorMessage = ref<string | null>(null);

    // MFA state
    const mfaResolver = ref<MultiFactorResolver | null>(null);
    const mfaTotpHintUid = ref<string | null>(null);

    // If already logged in as admin, redirect to dashboard
    onMounted(() => {
        if (user.value && isAdmin.value) {
            router.push("/admin");
        }
    });

    const resetForm = () => {
        step.value = "credentials";
        totpCode.value = "";
        mfaResolver.value = null;
        mfaTotpHintUid.value = null;
        errorMessage.value = null;
    };

    const handleLogin = async () => {
        isLoading.value = true;
        errorMessage.value = null;

        try {
            const mfaState = await loginWithEmail(email.value, password.value);

            if (mfaState.mfaRequired) {
                // MFA is required — show TOTP input
                if (!mfaState.totpHintUid) {
                    errorMessage.value = "No TOTP factor found. Please contact the administrator.";
                    return;
                }
                mfaResolver.value = mfaState.resolver;
                mfaTotpHintUid.value = mfaState.totpHintUid;
                step.value = "totp";
            } else {
                // No MFA required — check admin status
                if (isAdmin.value) {
                    router.push("/admin");
                } else {
                    errorMessage.value = "You are not authorized to access the admin panel.";
                }
            }
        } catch {
            errorMessage.value = authError.value || "Failed to sign in. Please try again.";
        } finally {
            isLoading.value = false;
        }
    };

    const handleTotpVerify = async () => {
        if (!mfaResolver.value || !mfaTotpHintUid.value) return;

        isLoading.value = true;
        errorMessage.value = null;

        try {
            await verifyTotpSignIn(mfaResolver.value, mfaTotpHintUid.value, totpCode.value);

            if (isAdmin.value) {
                router.push("/admin");
            } else {
                errorMessage.value = "You are not authorized to access the admin panel.";
                resetForm();
            }
        } catch {
            errorMessage.value = authError.value || "Invalid or expired code. Please try again.";
            totpCode.value = "";
        } finally {
            isLoading.value = false;
        }
    };
</script>

<style scoped>
    .codex-login-shell {
        background: linear-gradient(
            145deg,
            color-mix(in oklch, var(--surface-cool, var(--surface-hover)) 35%, var(--bg)),
            var(--bg) 48%,
            color-mix(in oklch, var(--surface-tint, var(--surface-hover)) 25%, var(--bg))
        );
    }

    .codex-login-card {
        border-radius: 8px;
        border-color: color-mix(in oklch, var(--line) 56%, transparent);
        background: var(--surface-card, var(--surface));
        box-shadow: var(--shadow-soft, 0 18px 50px color-mix(in oklch, var(--fg) 12%, transparent));
    }
</style>
