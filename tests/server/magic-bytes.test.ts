import { describe, it, expect } from "vitest";
import { sniffImageMime } from "~/server/utils/magic-bytes";

describe("sniffImageMime", () => {
    it("detects PNG", () => {
        const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
        expect(sniffImageMime(png)).toBe("image/png");
    });
    it("detects JPEG", () => {
        expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    });
    it("detects WebP", () => {
        const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
        expect(sniffImageMime(webp)).toBe("image/webp");
    });
    it("rejects plain text", () => {
        expect(sniffImageMime(new TextEncoder().encode("not an image"))).toBeNull();
    });
    it("rejects partial PNG (truncated header)", () => {
        expect(sniffImageMime(new Uint8Array([0x89, 0x50]))).toBeNull();
    });
    it("rejects RIFF without WEBP marker", () => {
        const fake = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]); // AVI
        expect(sniffImageMime(fake)).toBeNull();
    });
});
