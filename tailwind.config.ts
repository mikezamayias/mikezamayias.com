import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
// Two Tailwind plugins were removed from this config after audits found
// they emitted nothing referenced anywhere in the repo:
//   * `@headlessui/tailwindcss` — zero `ui-(open|active|checked|...)` hits;
//     menus and dialogs use radix-vue (via shadcn-vue) with plain
//     `data-[state=*]` variants instead.
//   * `@formkit/themes/tailwindcss` — zero `<FormKit>` usages, no
//     `formkit.config.ts`, and no `formkit-(invalid|valid|loading):`
//     variants found anywhere. FormKit isn't actually wired in.
// Both tracked in
// `docs/superpowers/plans/2026-05-22-plan-perf-tailwind-bloat.md` (Option B).

export default <Partial<Config>>{
    darkMode: ["class", "html[data-theme='dark']"],
    content: [
        "./components/**/*.{vue,js,ts}",
        "./app/components/**/*.{vue,js,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./composables/**/*.{js,ts}",
        "./app/composables/**/*.{js,ts}",
        "./content/**/*.md",
        "./app.vue",
        "./error.vue",
    ],
    theme: {
        extend: {
            colors: {
                paper: "var(--paper)",
                "paper-deep": "var(--paper-deep)",
                argent: "var(--argent)",
                ink: "var(--ink)",
                "ink-soft": "var(--ink-soft)",
                "ink-faint": "var(--ink-faint)",
                rule: "var(--rule)",
                "rule-soft": "var(--rule-soft)",
                "blue-orlov": "var(--blue-orlov)",
                "blue-epidaurus": "var(--blue-epidaurus)",
                "blue-bavarian": "var(--blue-bavarian)",
                "blue-royal": "var(--blue-royal)",
                "blue-junta": "var(--blue-junta)",
                "blue-modern": "var(--blue-modern)",
                "blue-coat": "var(--blue-coat)",
                "vergina-gold": "var(--vergina-gold)",
                "imperial-gold": "var(--imperial-gold)",
                "olive-victor": "var(--olive-victor)",
                "olive-deep": "var(--olive-deep)",
                "phoenix-ember": "var(--phoenix-ember)",
                "phoenix-ash": "var(--phoenix-ash)",
                "tyrian-purple": "var(--tyrian-purple)",
                "athena-bronze": "var(--athena-bronze)",
                "aegean-deep": "var(--aegean-deep)",
                "santorini-cyan": "var(--santorini-cyan)",
                terracotta: "var(--terracotta)",
                ochre: "var(--ochre)",
                // semantic aliases — used in Codex components, swap with theme
                bg: "var(--bg)",
                fg: "var(--fg)",
                soft: "var(--soft)",
                faint: "var(--faint)",
                line: "var(--line)",
                // brand alias for the Codex accent (aegean-deep / blue-bavarian).
                // Use `text-brand`, `bg-brand`, `border-brand` in Codex code.
                // The Tailwind `accent` key is reserved for shadcn's hover-surface
                // semantics below — they are not the same role.
                brand: "var(--accent)",
                // shadcn compatibility — legacy admin/UI surfaces still use
                // these token names. Mapped to the new semantic aliases so
                // those routes keep rendering until Plan F sweeps them.
                // NOTE: shadcn's `accent` is a subtle hover surface
                // (focus:bg-accent on dropdowns, etc.) — NOT the brand
                // accent. Keep these mappings aligned with shadcn semantics.
                background: "var(--bg)",
                foreground: "var(--fg)",
                card: "var(--bg)",
                "card-foreground": "var(--fg)",
                popover: "var(--bg)",
                "popover-foreground": "var(--fg)",
                primary: "var(--accent)",
                "primary-foreground": "var(--bg)",
                // `surface` / `surface-hover` swap with `data-theme`. The
                // raw `--paper-deep` token does NOT, so wiring shadcn
                // hover/fill semantics directly at it produced light
                // hover bg under light text in dark mode — the
                // poor-contrast hover state we saw in Plan H.4 testing.
                secondary: "var(--surface)",
                "secondary-foreground": "var(--fg)",
                muted: "var(--surface)",
                "muted-foreground": "var(--soft)",
                accent: "var(--surface-hover)",
                "accent-foreground": "var(--fg)",
                destructive: "var(--phoenix-ember)",
                "destructive-foreground": "var(--bg)",
                border: "var(--line)",
                input: "var(--line)",
                ring: "var(--accent)",
            },
            fontFamily: {
                display: "var(--font-display)",
                serif: "var(--font-serif)",
                sans: "var(--font-sans)",
                mono: "var(--font-mono)",
            },
            transitionTimingFunction: {
                "out-quart": "var(--ease-out-quart)",
                "out-expo": "var(--ease-out-expo)",
            },
        },
    },
    plugins: [tailwindAnimate],
};
