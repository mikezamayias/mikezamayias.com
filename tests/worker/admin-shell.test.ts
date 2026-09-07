import { describe, expect, it, vi } from "vitest";
import worker, { isAdminPath } from "../../worker/index";
import { isAdminPath as isAdminPathFromRouting } from "../../worker/routing";

describe("isAdminPath", () => {
    it("returns true for exact /admin", () => {
        expect(isAdminPath("/admin")).toBe(true);
        expect(isAdminPathFromRouting("/admin")).toBe(true);
    });

    it("returns true for /admin/", () => {
        expect(isAdminPath("/admin/")).toBe(true);
    });

    it("returns true for static admin paths like /admin/login", () => {
        expect(isAdminPath("/admin/login")).toBe(true);
    });

    it("returns true for dynamic admin subpaths like /admin/work/abc-123", () => {
        expect(isAdminPath("/admin/work/abc-123")).toBe(true);
    });

    it("returns false for paths starting with /admin but not matching /admin or /admin/", () => {
        expect(isAdminPath("/administrator")).toBe(false);
        expect(isAdminPath("/adminx")).toBe(false);
        expect(isAdminPath("/admin-dashboard")).toBe(false);
    });

    it("returns false for non-admin public paths", () => {
        expect(isAdminPath("/work")).toBe(false);
        expect(isAdminPath("/")).toBe(false);
        expect(isAdminPath("")).toBe(false);
    });

    it("returns false for /api/admin/verify (starts with /api)", () => {
        expect(isAdminPath("/api/admin/verify")).toBe(false);
    });
});

describe("worker fetch scoped admin fallback", () => {
    it("falls back to /admin when asset 404s on GET for an admin path", async () => {
        const fallbackResponse = new Response("admin shell", { status: 200 });
        const assets = {
            fetch: vi
                .fn()
                .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
                .mockResolvedValueOnce(fallbackResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/admin/work/abc-123", {
            method: "GET",
        });

        const response = await worker.fetch(request, env);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("admin shell");
        expect(assets.fetch).toHaveBeenCalledTimes(2);
        const secondCallArg = assets.fetch.mock.calls[1]?.[0] as Request | undefined;
        expect(secondCallArg).toBeInstanceOf(Request);
        expect(new URL(secondCallArg!.url).pathname).toBe("/admin");
    });

    it("returns asset response as-is when ASSETS returns 200 on GET /admin/login", async () => {
        const loginResponse = new Response("admin login page", { status: 200 });
        const assets = {
            fetch: vi.fn().mockResolvedValue(loginResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/admin/login", {
            method: "GET",
        });

        const response = await worker.fetch(request, env);
        expect(response).toBe(loginResponse);
        expect(response.status).toBe(200);
        expect(assets.fetch).toHaveBeenCalledTimes(1);
    });

    it("returns 404 as-is without fallback on GET /nope", async () => {
        const notFoundResponse = new Response("Not Found", { status: 404 });
        const assets = {
            fetch: vi.fn().mockResolvedValue(notFoundResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/nope", {
            method: "GET",
        });

        const response = await worker.fetch(request, env);
        expect(response).toBe(notFoundResponse);
        expect(response.status).toBe(404);
        expect(assets.fetch).toHaveBeenCalledTimes(1);
    });

    it("returns 404 as-is without fallback on GET /administrator (prefix must not match)", async () => {
        const notFoundResponse = new Response("Not Found", { status: 404 });
        const assets = {
            fetch: vi.fn().mockResolvedValue(notFoundResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/administrator", {
            method: "GET",
        });

        const response = await worker.fetch(request, env);
        expect(response).toBe(notFoundResponse);
        expect(response.status).toBe(404);
        expect(assets.fetch).toHaveBeenCalledTimes(1);
    });

    it("does not fall back on POST to an admin path when asset 404s", async () => {
        const notFoundResponse = new Response("Not Found", { status: 404 });
        const assets = {
            fetch: vi.fn().mockResolvedValue(notFoundResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/admin/work/x", {
            method: "POST",
        });

        const response = await worker.fetch(request, env);
        expect(response).toBe(notFoundResponse);
        expect(response.status).toBe(404);
        expect(assets.fetch).toHaveBeenCalledTimes(1);
    });

    it("returns 400 with errors and message on POST /api/contact with invalid JSON body without touching ASSETS", async () => {
        const assets = {
            fetch: vi.fn(),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/api/contact", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: "{not-valid-json",
        });

        const response = await worker.fetch(request, env);
        expect(response.status).toBe(400);
        expect(assets.fetch).not.toHaveBeenCalled();

        const body = (await response.json()) as { errors: unknown; message: unknown };
        expect(body).toHaveProperty("errors");
        expect(body).toHaveProperty("message");
        expect(Array.isArray(body.errors)).toBe(true);
        expect(typeof body.message).toBe("string");
    });

    it("falls through to ASSETS on GET /api/contact (route is POST only)", async () => {
        const assetResponse = new Response("Not Found", { status: 404 });
        const assets = {
            fetch: vi.fn().mockResolvedValue(assetResponse),
        };
        const env = { ASSETS: assets } as unknown as Parameters<typeof worker.fetch>[1];

        const request = new Request("https://mikezamayias.com/api/contact", {
            method: "GET",
        });

        const response = await worker.fetch(request, env);
        expect(response).toBe(assetResponse);
        expect(response.status).toBe(404);
        expect(assets.fetch).toHaveBeenCalledTimes(1);
    });
});
