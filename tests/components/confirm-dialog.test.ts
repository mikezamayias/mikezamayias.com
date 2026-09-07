// tests/components/confirm-dialog.test.ts
//
// Regression coverage for the "delete confirm dialog stays open" bug.
//
// Root cause (see commit log): the destructive-action button only emitted
// `confirm`, leaving the dialog open until the parent cleared its own
// `isOpen` state. The AdminDocumentEditor.deleteDoc success path never
// did — it routed straight to `router.push(...)` after the await — so
// the dialog appeared "stuck open" right before the navigation kicked in.
//
// Fix: the Confirm button now emits `confirm` AND `close` so the parent's
// `@close` handler clears the dialog regardless of how the `confirm`
// branch handles its own state.
//
// We stub the underlying shadcn-vue Dialog primitives because their
// DialogPortal teleports content to <body> via Vue's <Teleport>, which
// happy-dom + @vue/test-utils don't reliably project. The behaviour we
// care about lives in ConfirmDialog.vue itself — the slotted footer
// buttons + their emit handlers — so the stubs render the slot inline
// and let us click the actual <Button>s.
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "~/components/admin/ConfirmDialog.vue";

const SlotPassthrough = defineComponent({
    setup(_, { slots }) {
        return () => h("div", slots.default?.());
    },
});

const stubs = {
    // shadcn-vue Dialog wrappers — render their default slot inline so
    // the DialogFooter buttons (Cancel / Delete) show up in the DOM.
    Dialog: SlotPassthrough,
    DialogContent: SlotPassthrough,
    DialogHeader: SlotPassthrough,
    DialogTitle: SlotPassthrough,
    DialogDescription: SlotPassthrough,
    DialogFooter: SlotPassthrough,
};

describe("ConfirmDialog", () => {
    function buttonByText(wrapper: ReturnType<typeof mount>, label: string) {
        const found = wrapper.findAll("button").find((btn) => btn.text().trim() === label);
        if (!found) throw new Error(`No button with label '${label}'`);
        return found;
    }

    it("emits confirm AND close when the destructive button is clicked", async () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                isOpen: true,
                title: "Delete document",
                message: "Are you sure?",
                confirmText: "Delete",
            },
            global: { stubs },
        });

        await buttonByText(wrapper, "Delete").trigger("click");

        // Both events fire so a parent that forgets to clear its own
        // open ref (e.g. AdminDocumentEditor.deleteDoc success path
        // pre-fix) still sees the dialog dismissed via @close.
        expect(wrapper.emitted("confirm")).toHaveLength(1);
        expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits only close when Cancel is clicked", async () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                isOpen: true,
                title: "Delete document",
                message: "Are you sure?",
                confirmText: "Delete",
            },
            global: { stubs },
        });

        await buttonByText(wrapper, "Cancel").trigger("click");

        // Cancel only closes — the destructive action must not fire on
        // dismissal.
        expect(wrapper.emitted("close")).toHaveLength(1);
        expect(wrapper.emitted("confirm")).toBeUndefined();
    });

    it("renders both footer buttons with explicit type='button'", () => {
        const wrapper = mount(ConfirmDialog, {
            props: {
                isOpen: true,
                title: "Delete document",
                message: "Confirm?",
                confirmText: "Delete",
            },
            global: { stubs },
        });

        // Defense-in-depth: if a future shadcn-vue Dialog variant drops
        // the portal and the dialog renders inside a parent <form>, the
        // default `<button>` would submit the form — which would match
        // the user's "screen scrolls back as if a navigation happened"
        // bug report. Explicit type prevents the implicit submit.
        expect(buttonByText(wrapper, "Cancel").attributes("type")).toBe("button");
        expect(buttonByText(wrapper, "Delete").attributes("type")).toBe("button");
    });
});
