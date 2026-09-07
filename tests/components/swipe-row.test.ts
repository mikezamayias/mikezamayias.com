import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SwipeRow from "~/components/admin/SwipeRow.vue";

describe("SwipeRow", () => {
    it("hides the action button from the tab order when not revealed", () => {
        const wrapper = mount(SwipeRow, {
            slots: { default: '<div data-testid="row">Content</div>' },
        });
        const button = wrapper.get("button.swipe-row-action");
        expect(button.attributes("tabindex")).toBe("-1");
        expect(button.attributes("aria-hidden")).toBe("true");
    });

    it("emits delete when the action button is clicked", async () => {
        const wrapper = mount(SwipeRow, {
            slots: { default: "<div>Row</div>" },
        });
        await wrapper.get("button.swipe-row-action").trigger("click");
        expect(wrapper.emitted("delete")).toHaveLength(1);
    });

    it("does not emit delete when disabled", async () => {
        const wrapper = mount(SwipeRow, {
            props: { disabled: true },
            slots: { default: "<div>Row</div>" },
        });
        await wrapper.get("button.swipe-row-action").trigger("click");
        expect(wrapper.emitted("delete")).toBeUndefined();
    });

    it("uses the custom action label when provided", () => {
        const wrapper = mount(SwipeRow, {
            props: { actionLabel: "Archive" },
            slots: { default: "<div>Row</div>" },
        });
        expect(wrapper.get("button.swipe-row-action").text()).toBe("Archive");
    });

    it("renders the slotted row content", () => {
        const wrapper = mount(SwipeRow, {
            slots: { default: '<div data-testid="row">Hello</div>' },
        });
        expect(wrapper.get('[data-testid="row"]').text()).toBe("Hello");
    });

    it("exposes a close method that returns the row to neutral", async () => {
        const wrapper = mount(SwipeRow, {
            slots: { default: "<div>Row</div>" },
        });
        // close() is the public API the parent calls after handling delete.
        // Verify it does not throw and leaves the surface untransformed.
        (wrapper.vm as unknown as { close: () => void }).close();
        await wrapper.vm.$nextTick();
        const surface = wrapper.get(".swipe-row-surface");
        expect(surface.attributes("style")).toContain("translateX(-0px)");
    });
});
