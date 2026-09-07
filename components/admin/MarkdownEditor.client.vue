<template>
    <div ref="editorWrapper" class="codex-markdown-editor" />
</template>

<script setup lang="ts">
    import Editor from "@toast-ui/editor";
    import "@toast-ui/editor/dist/toastui-editor.css";
    import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";
    import { useTheme } from "~/composables/useTheme";

    const props = defineProps<{
        modelValue: string;
    }>();

    const emit = defineEmits<{
        "update:modelValue": [value: string];
    }>();

    const editorWrapper = ref<HTMLElement | null>(null);
    let editorInstance: Editor | null = null;
    const { theme } = useTheme();

    /**
     * Rebuild the editor in-place. Toast UI's constructor accepts a
     * `theme` only on init (no runtime swap), so the cleanest way to
     * follow the Codex `html[data-theme]` flip is to destroy + re-init.
     * Markdown content is restored from the current modelValue so the
     * swap is invisible to the user.
     */
    function mountEditor(initialValue: string) {
        if (!editorWrapper.value) return;
        const isDark = theme.value === "dark";
        editorInstance = new Editor({
            el: editorWrapper.value,
            initialEditType: "markdown",
            previewStyle: "vertical",
            height: "500px",
            initialValue,
            theme: isDark ? "dark" : "default",
            usageStatistics: false,
            toolbarItems: [
                ["heading", "bold", "italic", "strike"],
                ["hr", "quote"],
                ["ul", "ol", "task", "indent", "outdent"],
                ["table", "image", "link"],
                ["code", "codeblock"],
            ],
            events: {
                change: () => {
                    if (editorInstance) {
                        emit("update:modelValue", editorInstance.getMarkdown());
                    }
                },
            },
        });
    }

    onMounted(() => {
        mountEditor(props.modelValue || "");
    });

    // External writes (draft restore, form load) push fresh markdown
    // into the editor without round-tripping through the change event.
    watch(
        () => props.modelValue,
        (newVal) => {
            if (editorInstance && editorInstance.getMarkdown() !== newVal) {
                editorInstance.setMarkdown(newVal || "");
            }
        }
    );

    // Theme swap — Toast UI doesn't expose runtime theme switching, so
    // we tear the editor down and rebuild with the latest markdown
    // value. Fast (< 16ms) and keeps focus on the wrapper, not in the
    // editor itself, so re-init doesn't yank the caret mid-edit on a
    // theme toggle.
    watch(theme, (next, prev) => {
        if (next === prev) return;
        if (!editorInstance) return;
        const value = editorInstance.getMarkdown();
        editorInstance.destroy();
        editorInstance = null;
        mountEditor(value);
    });

    onBeforeUnmount(() => {
        editorInstance?.destroy();
        editorInstance = null;
    });
</script>

<style>
    /* Toast UI overrides — load AFTER toastui-editor.css so the
     * specificity is straightforward (single class) and the bundled
     * editor styles stay the baseline.
     *
     * Not `<style scoped>` because Toast UI mounts its DOM directly
     * into the wrapper at runtime — Vue's scope id (`data-v-XXXX`)
     * never lands on those nodes, so the scoped attribute selector
     * misses them. The `.codex-markdown-editor` wrapper class scopes
     * all rules to this component's instances.
     */
    .codex-markdown-editor {
        font-family: var(--font-mono);
    }

    .codex-markdown-editor .toastui-editor-defaultUI {
        border-color: var(--rule-soft);
        border-radius: 0;
    }

    .codex-markdown-editor .toastui-editor-md-container,
    .codex-markdown-editor .toastui-editor-ww-container,
    .codex-markdown-editor .toastui-editor-md-preview {
        background: var(--bg);
        color: var(--fg);
    }

    .codex-markdown-editor .toastui-editor-md-splitter {
        background: var(--rule-soft);
    }

    .codex-markdown-editor .toastui-editor-mode-switch {
        background: var(--surface);
        border-color: var(--rule-soft);
    }

    .codex-markdown-editor .toastui-editor-mode-switch .tab-item {
        color: var(--soft);
    }

    .codex-markdown-editor .toastui-editor-mode-switch .tab-item.active {
        color: var(--fg);
        background: var(--bg);
    }

    .codex-markdown-editor .toastui-editor-toolbar {
        background: var(--surface);
        border-color: var(--rule-soft);
    }

    .codex-markdown-editor .toastui-editor-defaultUI-toolbar {
        background: var(--surface);
    }

    .codex-markdown-editor .toastui-editor-defaultUI-toolbar button {
        color: var(--fg);
    }

    .codex-markdown-editor .toastui-editor-defaultUI-toolbar button:hover {
        background: var(--surface-hover);
    }

    .codex-markdown-editor .ProseMirror,
    .codex-markdown-editor .toastui-editor-md-preview-highlight,
    .codex-markdown-editor .CodeMirror,
    .codex-markdown-editor .CodeMirror-scroll {
        background: var(--bg) !important;
        color: var(--fg) !important;
    }

    .codex-markdown-editor .CodeMirror-gutters {
        background: var(--surface) !important;
        border-right: 1px solid var(--rule-soft) !important;
    }

    .codex-markdown-editor .CodeMirror-linenumber {
        color: var(--faint) !important;
    }

    /* Dark theme — Toast UI's bundled dark CSS already handles most of
     * the chrome; we override the few token-bound surfaces so the
     * Codex bg / rule colors win over the bundled neutrals.
     */
    html[data-theme="dark"] .codex-markdown-editor .toastui-editor-defaultUI {
        border-color: var(--rule);
    }

    html[data-theme="dark"] .codex-markdown-editor .toastui-editor-md-container,
    html[data-theme="dark"] .codex-markdown-editor .toastui-editor-ww-container,
    html[data-theme="dark"] .codex-markdown-editor .toastui-editor-md-preview {
        background: var(--bg);
    }

    html[data-theme="dark"] .codex-markdown-editor .ProseMirror,
    html[data-theme="dark"] .codex-markdown-editor .CodeMirror,
    html[data-theme="dark"] .codex-markdown-editor .CodeMirror-scroll {
        background: var(--bg) !important;
        color: var(--fg) !important;
    }
</style>
