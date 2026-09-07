// server/utils/magic-bytes.ts
//
// Detect image format by inspecting leading bytes (PNG: 8, JPEG: 3,
// WebP: 12 with RIFF + "WEBP" marker at offset 8). Defends against
// polyglot uploads that claim image/png MIME but contain something
// else. JPEG check is intentionally permissive (3-byte SOI + FFD8FF
// prefix covers JFIF, EXIF, and other APPn variants).

const SIGNATURES: Array<{ mime: "image/png" | "image/jpeg" | "image/webp"; bytes: number[] }> = [
    { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
    { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF; followed by 4-byte length + "WEBP"
];

export function sniffImageMime(buf: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
    for (const sig of SIGNATURES) {
        if (buf.length < sig.bytes.length) continue;
        let match = true;
        for (let i = 0; i < sig.bytes.length; i++) {
            if (buf[i] !== sig.bytes[i]) {
                match = false;
                break;
            }
        }
        if (match) {
            // For WebP, also verify "WEBP" marker at offset 8
            if (sig.mime === "image/webp") {
                if (buf.length < 12) return null;
                if (buf[8] !== 0x57 || buf[9] !== 0x45 || buf[10] !== 0x42 || buf[11] !== 0x50) {
                    return null;
                }
            }
            return sig.mime;
        }
    }
    return null;
}
