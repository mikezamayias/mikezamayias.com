// Register the `v-codex-reveal` directive globally so any section /
// row in the codex layout can drop it without an import. See
// composables/useScrollReveal.ts for the directive definition.
import { vCodexReveal } from "~/composables/useScrollReveal";

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.directive("codex-reveal", vCodexReveal);
});
