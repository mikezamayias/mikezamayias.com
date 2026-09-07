// Single source of truth for the preview-mock gate. Used by every
// public read endpoint to short-circuit to canned data in
// non-production environments (staging, dev). Production runs through
// the real Firestore path exactly as before.
//
// Allowlist (not denylist) so unknown / unset `NUXT_PUBLIC_APP_ENV`
// routes through the real Firestore path. Rationale: a manual
// `firebase deploy` from a laptop without setting the env var would
// otherwise silently ship canned mock content to mikezamayias.com —
// visually fine, semantically wrong. Failing through to the real
// path produces a loud `CodexError` instead, which is the correct
// signal for a misconfigured deploy.
//
// Add new short-circuit envs here as we adopt them ("preview",
// "canary", etc.) — explicit opt-in beats default-grant.

export function isPreviewMockEnv(): boolean {
    const appEnv = useRuntimeConfig().public.appEnv;
    return appEnv === "staging" || appEnv === "development";
}
