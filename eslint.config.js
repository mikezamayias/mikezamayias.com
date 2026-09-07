import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default withNuxt(
    {
        ignores: ["**/.worktrees/**", "**/.claude/**"],
    },
    eslintPluginPrettierRecommended,
    {
        rules: {
            "vue/multi-word-component-names": "off",
            "vue/no-multiple-template-root": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
        },
    },
    {
        // CLI scripts (seed, migrate, etc.) — stdout IS the product. Every
        // pipeline step expects readable progress output. Allow every
        // console method; nothing here ships to the client bundle.
        files: ["scripts/**/*.ts"],
        rules: {
            "no-console": "off",
        },
    },
    {
        // Client plugins emit dev-mode init diagnostics (guarded by
        // `import.meta.dev`). The guard ensures prod bundles tree-shake
        // them out; ESLint's static check can't see that, so widen the
        // allowed methods here instead of sprinkling per-line eslint-
        // disable comments through plugin code.
        files: ["plugins/**/*.ts"],
        rules: {
            "no-console": "off",
        },
    }
);
