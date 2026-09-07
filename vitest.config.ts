import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const runRulesSuite = process.env.RULES_SUITE === "1";

export default defineConfig({
    plugins: [vue()],
    define: {
        // Match Vite client detection so `useAdminRealtime` client branches run in
        // `admin-realtime.client.test.ts`.
        // Must be boolean `false`, not JSON.stringify(false) (that becomes the
        // string "false", which is truthy and disables client branches).
        "import.meta.env.SSR": false,
        "import.meta.client": true,
        "process.client": true,
    },
    test: {
        environment: "happy-dom",
        globals: true,
        // `tests/firestore/**` requires the Firestore emulator on :8085 and
        // `tests/storage/**` requires the Storage emulator on :9199 as well;
        // both are excluded from the default `bun run test` (used by the CI
        // "Test" job). Run via `bun run test:rules` which sets
        // RULES_SUITE=1 and boots both emulators with `firebase
        // emulators:exec`; that flips the exclude off so the rules suites
        // are discovered.
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/.nuxt/**",
            // `.claude/worktrees/` is where the Agent tool's `isolation: "worktree"`
            // mode drops sibling copies of the repo while a sub-agent runs. Those
            // copies have their own `tests/` directory which vitest would
            // otherwise scan — and the worktree's path lacks the parent's
            // `node_modules` resolution, so every test inside it fails to
            // import Nuxt aliases. Exclude the whole worktree root.
            "**/.claude/**",
            // Local PR review worktrees live under `.worktrees/` and can
            // contain stale copies of this repo. They are not part of the
            // active checkout and must not be collected by Vitest.
            "**/.worktrees/**",
            ...(runRulesSuite ? [] : ["tests/firestore/**", "tests/storage/**"]),
        ],
        coverage: {
            provider: "v8",
            // Reporters are for local ergonomics (text in terminal, html in
            // browser, json for tooling). Output lives in `coverage/` — gitignored.
            reporter: ["text", "json", "html"],
            reportsDirectory: "coverage",
            exclude: [
                "node_modules/",
                ".nuxt/",
                ".output/",
                "coverage/",
                "tests/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/types/**",
                "scripts/**",
                "seeds/**",
            ],
            // Coverage was previously reported to Codacy and enforced nowhere, so a
            // regression was invisible. These floors are today's measured numbers
            // rounded down: they ratchet, they do not aspire. Raise them when coverage
            // genuinely improves; never lower them to make a red build green.
            thresholds: {
                statements: 51,
                branches: 41,
                functions: 45,
                lines: 53,
            },
        },
    },
    resolve: {
        alias: {
            "~": resolve(__dirname, "./"),
            "@": resolve(__dirname, "./"),
            "#shared": resolve(__dirname, "./shared"),
            "#shared/*": resolve(__dirname, "./shared/*"),
        },
    },
});
