// server/utils/client-ip.ts
//
// rev 1.5 — Cloud Functions gen2 (Cloud Run substrate) writes the chain
// of forwarders into `x-forwarded-for`. The CLIENT IP is the RIGHTMOST
// entry (closest to the proxy that authenticated it). h3's
// `getRequestIP({ xForwardedFor: true })` returns the LEFTMOST entry,
// which is spoofable by the client. Read rightmost ourselves.
import { getHeader, type H3Event } from "h3";

export function getClientIp(event: H3Event): string {
    const xff = getHeader(event, "x-forwarded-for");
    if (xff) {
        const parts = xff
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (parts.length) return parts[parts.length - 1]!;
    }
    return event.node.req.socket.remoteAddress ?? "unknown";
}
