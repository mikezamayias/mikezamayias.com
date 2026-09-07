import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AdminFieldRenderer from "~/components/admin/AdminFieldRenderer.vue";
import type { AdminField } from "~/utils/adminContent";

const jsonField = {
    path: "links",
    label: "Links JSON",
    type: "json",
} satisfies AdminField;

describe("AdminFieldRenderer JSON fields", () => {
    it("buffers edits locally and validates JSON only on blur", async () => {
        const doc: Record<string, unknown> = {
            links: [{ kind: "site", url: "https://example.com" }],
        };
        const wrapper = mount(AdminFieldRenderer, {
            props: {
                field: jsonField,
                doc,
            },
        });
        const textarea = wrapper.get("textarea");

        expect((textarea.element as HTMLTextAreaElement).value).toContain(
            '"url": "https://example.com"'
        );

        await textarea.setValue("{");

        expect(doc.links).toEqual([{ kind: "site", url: "https://example.com" }]);
        expect(wrapper.emitted("invalid")).toBeUndefined();

        await textarea.trigger("blur");

        expect(doc.links).toEqual([{ kind: "site", url: "https://example.com" }]);
        expect(wrapper.emitted("invalid")?.[0]?.[0]).toContain("Links JSON:");

        await textarea.setValue('{"kind":"repo","url":"https://github.com"}');
        await textarea.trigger("blur");

        expect(doc.links).toEqual({ kind: "repo", url: "https://github.com" });
        expect(wrapper.emitted("valid")?.at(-1)?.[0]).toBe("Links JSON:");
    });
});
