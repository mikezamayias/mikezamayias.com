<template>
    <div class="codex-field">
        <label :for="fieldId" class="codex-field-label">
            {{ field.label }}
            <span v-if="field.required" class="codex-field-required" aria-hidden="true">*</span>
        </label>

        <!-- boolean toggle -->
        <label
            v-if="field.type === 'boolean'"
            :for="fieldId"
            class="codex-field-toggle"
            :data-state="adminFieldBooleanValue(doc, field) ? 'on' : 'off'"
        >
            <input
                :id="fieldId"
                type="checkbox"
                class="codex-field-toggle-input"
                :checked="adminFieldBooleanValue(doc, field)"
                @change="onBooleanChange"
            />
            <span class="codex-field-toggle-track" aria-hidden="true">
                <span class="codex-field-toggle-thumb" />
            </span>
            <span class="codex-field-toggle-label">
                {{ adminFieldBooleanValue(doc, field) ? "Enabled" : "Disabled" }}
            </span>
        </label>

        <!-- select dropdown -->
        <select
            v-else-if="field.type === 'select'"
            :id="fieldId"
            class="codex-field-input"
            :value="String(adminFieldDisplayValue(doc, field))"
            @change="onInput"
        >
            <option
                v-for="option in field.options ?? []"
                :key="String(option.value)"
                :value="String(option.value)"
            >
                {{ option.label }}
            </option>
        </select>

        <!-- markdown editor — lazy client-only wrapper around Toast UI. -->
        <ClientOnly v-else-if="field.type === 'markdown'">
            <MarkdownEditor
                :id="fieldId"
                :model-value="String(adminFieldDisplayValue(doc, field))"
                @update:model-value="onMarkdownUpdate"
            />
            <template #fallback>
                <textarea
                    :id="fieldId"
                    class="codex-field-input codex-field-textarea"
                    :rows="field.rows ?? 12"
                    :value="String(adminFieldDisplayValue(doc, field))"
                    @input="onTextareaInput"
                />
            </template>
        </ClientOnly>

        <!-- textarea or json -->
        <textarea
            v-else-if="field.type === 'textarea' || field.type === 'json'"
            :id="fieldId"
            class="codex-field-input codex-field-textarea"
            :class="field.type === 'json' ? 'codex-field-mono' : ''"
            :rows="field.rows ?? (field.type === 'json' ? 8 : 4)"
            :value="textareaValue"
            @input="onTextareaInput"
            @blur="onTextareaBlur"
        />

        <!-- everything else: text, number, date, month, url, csv -->
        <input
            v-else
            :id="fieldId"
            :type="inputType"
            class="codex-field-input"
            :value="adminFieldDisplayValue(doc, field)"
            @input="onTextInput"
        />

        <p v-if="field.hint" class="codex-field-hint">{{ field.hint }}</p>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, watch } from "vue";
    import type { AdminField } from "~/utils/adminContent";
    import {
        adminFieldBooleanValue,
        adminFieldDisplayValue,
        applyAdminFieldValue,
        type AdminDraft,
    } from "~/utils/adminForm";
    import { getByPath } from "~/utils/adminContent";
    import MarkdownEditor from "./MarkdownEditor.client.vue";

    const props = defineProps<{
        field: AdminField;
        doc: AdminDraft;
    }>();

    const emit = defineEmits<{
        invalid: [message: string];
        valid: [messagePrefix: string];
    }>();

    const fieldId = computed(() => `field-${props.field.path.replace(/[^a-z0-9]+/gi, "-")}`);
    const jsonText = ref("");
    const editingJson = ref(false);

    const inputType = computed(() => {
        if (props.field.type === "number") return "number";
        if (props.field.type === "date") return "date";
        if (props.field.type === "month") return "month";
        if (props.field.type === "url") return "url";
        return "text";
    });

    const textareaValue = computed(() =>
        props.field.type === "json"
            ? jsonText.value
            : String(adminFieldDisplayValue(props.doc, props.field) ?? "")
    );

    const jsonDisplayValue = () => {
        const value = getByPath(props.doc, props.field.path);
        if (value === undefined || value === null) return "";
        return JSON.stringify(value, null, 2);
    };

    const fieldErrorPrefix = computed(() => `${props.field.label}:`);

    watch(
        () => (props.field.type === "json" ? jsonDisplayValue() : undefined),
        (value) => {
            if (value !== undefined && !editingJson.value) {
                jsonText.value = value;
            }
        },
        { immediate: true }
    );

    const onModelUpdate = (value: string | number) => {
        if (props.field.type === "json") {
            editingJson.value = true;
            jsonText.value = String(value);
            return;
        }

        try {
            applyAdminFieldValue(props.doc, props.field, value);
            emit("valid", fieldErrorPrefix.value);
        } catch (error) {
            emit(
                "invalid",
                error instanceof Error
                    ? `${props.field.label}: ${error.message}`
                    : `${props.field.label}: invalid value`
            );
        }
    };

    const onTextInput = (event: Event) => {
        onModelUpdate((event.target as HTMLInputElement).value);
    };

    const onTextareaInput = (event: Event) => {
        onModelUpdate((event.target as HTMLTextAreaElement).value);
    };

    const onMarkdownUpdate = (value: string) => {
        onModelUpdate(value);
    };

    const onTextareaBlur = () => {
        if (props.field.type !== "json") return;
        try {
            applyAdminFieldValue(props.doc, props.field, jsonText.value);
            editingJson.value = false;
            jsonText.value = jsonDisplayValue();
            emit("valid", fieldErrorPrefix.value);
        } catch (error) {
            emit(
                "invalid",
                error instanceof Error
                    ? `${props.field.label}: ${error.message}`
                    : `${props.field.label}: invalid value`
            );
        }
    };

    const onInput = (event: Event) => {
        const target = event.target as HTMLSelectElement;
        onModelUpdate(target.value);
    };

    const onBooleanChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        applyAdminFieldValue(props.doc, props.field, target.checked);
    };
</script>

<style scoped>
    .codex-field {
        display: grid;
        gap: 0.5rem;
    }

    .codex-field-label {
        font-family: var(--font-mono);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--soft);
    }

    .codex-field-required {
        color: var(--phoenix-ember);
        margin-left: 0.2rem;
    }

    .codex-field-hint {
        margin: 0;
        font-size: 0.78rem;
        color: var(--faint);
        line-height: 1.45;
    }

    .codex-field-input {
        font-family: var(--font-sans);
        font-size: 0.9rem;
        line-height: 1.5;
        padding: 0.72rem 0.85rem;
        background: var(--bg);
        color: var(--fg);
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        outline: none;
        transition:
            border-color 0.2s var(--ease-out-expo),
            background-color 0.2s var(--ease-out-expo);
        width: 100%;
        appearance: none;
        border-radius: 8px;
    }

    /* Color-scheme: align native dropdown/calendar picker chrome with
     * the current theme. Without this, dark-mode admin forms paint
     * light system pickers (date / month / select). */
    .codex-field-input {
        color-scheme: light dark;
    }

    .codex-field-input:hover {
        border-color: var(--rule);
    }

    .codex-field-input:focus,
    .codex-field-input:focus-visible {
        border-color: var(--accent);
        background: color-mix(in oklch, var(--bg) 94%, var(--accent));
    }

    .codex-field-textarea {
        font-family: var(--font-mono);
        line-height: 1.55;
        resize: vertical;
        min-height: 5rem;
    }

    .codex-field-mono {
        font-family: var(--font-mono);
        font-size: 0.8rem;
    }

    /* boolean toggle — pill switch with mono label */

    .codex-field-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 999px;
        background: var(--bg);
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--soft);
        width: max-content;
    }

    .codex-field-toggle:hover {
        border-color: var(--rule);
    }

    .codex-field-toggle-input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .codex-field-toggle-input:focus-visible + .codex-field-toggle-track {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    .codex-field-toggle-track {
        position: relative;
        display: inline-block;
        width: 2.25rem;
        height: 1.2rem;
        background: var(--surface);
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 999px;
        transition: background-color 0.2s var(--ease-out-expo);
    }

    .codex-field-toggle-thumb {
        position: absolute;
        top: 0.15rem;
        left: 0.15rem;
        width: 0.8rem;
        height: 0.8rem;
        border-radius: 999px;
        background: var(--soft);
        transition:
            left 0.2s var(--ease-out-expo),
            background-color 0.2s var(--ease-out-expo);
    }

    .codex-field-toggle[data-state="on"] {
        color: var(--fg);
        border-color: var(--accent);
    }

    .codex-field-toggle[data-state="on"] .codex-field-toggle-track {
        background: var(--accent);
        border-color: var(--accent);
    }

    .codex-field-toggle[data-state="on"] .codex-field-toggle-thumb {
        left: calc(2.25rem - 0.95rem);
        background: var(--bg);
    }
</style>
