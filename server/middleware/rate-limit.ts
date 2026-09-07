// server/middleware/rate-limit.ts
//
// In-memory token bucket per-IP. 30 req/min default; admin paths get 600.
// rev 1.5: requires nitro.firebase httpsOptions.maxInstances: 1 in
// nuxt.config.ts (Task 2.6), otherwise buckets divide across N instances.
import { defineEventHandler, createError } from "h3";
import { getClientIp } from "~/server/utils/client-ip";

interface Bucket {
    tokens: number;
    lastRefill: number;
}
const buckets = new Map<string, Bucket>();

// rev 1.7: bound the buckets Map. Without eviction, every unique IP that
// touches /api/* lives forever on the single instance and the Map grows
// unbounded. Drop stale entries lazily when adding a new IP.
const IDLE_MS = 5 * 60 * 1000;
const MAX_BUCKETS = 10_000;

// Plan B+ cost-cap tightening: public limit halved from 60 → 30 req/min/IP.
// Worst-case scraper cost drops from ~$9/month to ~$4.50/month per IP at
// sustained max rate. Admin stays at 600/min (CRUD-burst headroom).
const PUBLIC_PER_MIN = 30;
const ADMIN_PER_MIN = 600;

function evictStale(now: number) {
    if (buckets.size < MAX_BUCKETS / 2) return; // amortise
    for (const [ip, b] of buckets) {
        if (now - b.lastRefill > IDLE_MS) buckets.delete(ip);
        if (buckets.size < MAX_BUCKETS / 2) break;
    }
}

function take(ip: string, capacity: number, perMs: number): boolean {
    const now = Date.now();
    let b = buckets.get(ip);
    if (!b) {
        evictStale(now);
        b = { tokens: capacity, lastRefill: now };
        buckets.set(ip, b);
    }
    const elapsed = now - b.lastRefill;
    if (elapsed > 0) {
        b.tokens = Math.min(capacity, b.tokens + (elapsed / perMs) * capacity);
        b.lastRefill = now;
    }
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
}

export default defineEventHandler((event) => {
    const url = event.path ?? "";
    if (!url.startsWith("/api/")) return;
    const ip = getClientIp(event);
    const isAdminPath = url.startsWith("/api/admin/");
    const allowed = take(ip, isAdminPath ? ADMIN_PER_MIN : PUBLIC_PER_MIN, 60_000);
    if (!allowed) {
        throw createError({ statusCode: 429, message: "rate limit exceeded" });
    }
});

// Exported for testing; not part of the middleware contract.
export const _take = take;
export const _buckets = buckets;
