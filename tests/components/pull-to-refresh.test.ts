import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PullToRefresh from "~/components/admin/PullToRefresh.vue";

function makeTouch(clientY: number): Touch {
    return { clientY } as unknown as Touch;
}

describe("PullToRefresh", () => {
    it("renders slot content", () => {
        const wrapper = mount(PullToRefresh, {
            props: { onRefresh: () => {} },
            slots: { default: '<div data-testid="content">List</div>' },
        });
        expect(wrapper.get('[data-testid="content"]').text()).toBe("List");
    });

    it("does not call onRefresh when the pull is below threshold", async () => {
        const onRefresh = vi.fn();
        const wrapper = mount(PullToRefresh, {
            props: { onRefresh, threshold: 60 },
            slots: { default: "<div>List</div>" },
        });

        await wrapper.trigger("touchstart", { touches: [makeTouch(100)] });
        await wrapper.trigger("touchmove", { touches: [makeTouch(130)] });
        await wrapper.trigger("touchend");
        await flushPromises();

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it("calls onRefresh when the pull exceeds threshold", async () => {
        const onRefresh = vi.fn(async () => {});
        const wrapper = mount(PullToRefresh, {
            props: { onRefresh, threshold: 60 },
            slots: { default: "<div>List</div>" },
        });

        await wrapper.trigger("touchstart", { touches: [makeTouch(100)] });
        await wrapper.trigger("touchmove", { touches: [makeTouch(200)] });
        await wrapper.trigger("touchend");
        await flushPromises();

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("is inert while loading", async () => {
        const onRefresh = vi.fn();
        const wrapper = mount(PullToRefresh, {
            props: { onRefresh, threshold: 60, loading: true },
            slots: { default: "<div>List</div>" },
        });

        await wrapper.trigger("touchstart", { touches: [makeTouch(100)] });
        await wrapper.trigger("touchmove", { touches: [makeTouch(200)] });
        await wrapper.trigger("touchend");
        await flushPromises();

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it("clamps the pull distance to maxPull", async () => {
        const onRefresh = vi.fn();
        const wrapper = mount(PullToRefresh, {
            props: { onRefresh, threshold: 60, maxPull: 120 },
            slots: { default: "<div>List</div>" },
        });

        await wrapper.trigger("touchstart", { touches: [makeTouch(0)] });
        await wrapper.trigger("touchmove", { touches: [makeTouch(500)] });
        // Component caps internal pullDistance at maxPull; verify by
        // reading the indicator's translateY which uses indicatorY.
        const indicator = wrapper.find(".pull-indicator").element as HTMLElement;
        expect(indicator.style.transform).toContain("translateY(88px)");
    });
});
