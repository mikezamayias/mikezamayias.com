import {
    type ContactPayload,
    buildBrevoPayload,
    formatErrorResponse,
    isHoneypotTripped,
    validateContact,
} from "./contact";
import { isAdminPath } from "./routing";

export { isAdminPath };

interface Fetcher {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
    ASSETS: Fetcher;
    TURNSTILE_SECRET_KEY?: string;
    BREVO_API_KEY?: string;
    CONTACT_FROM_EMAIL?: string;
    CONTACT_EMAIL?: string;
    CONTACT_BCC_EMAIL?: string;
}

interface ContactRequestBody extends ContactPayload {
    turnstileToken?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json",
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "cache-control": "no-store",
        },
    });
}

function errorResponse(errors: string[], status: number): Response {
    return jsonResponse(formatErrorResponse(errors), status);
}

async function handleContact(request: Request, env: Env): Promise<Response> {
    // 1. Parse JSON. On parse failure return 400 { "errors": ["Invalid request body"] }.
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return errorResponse(["Invalid request body"], 400);
    }

    if (!body || typeof body !== "object") {
        return errorResponse(["Invalid request body"], 400);
    }

    // 2. Honeypot: if tripped, return 200 { "success": true } without sending anything.
    // Silent accept is deliberate, do not change it to an error.
    if (isHoneypotTripped(body)) {
        return jsonResponse({ success: true }, 200);
    }

    // 3. Turnstile. Fail loud on missing config: if env.TURNSTILE_SECRET_KEY is absent,
    // console.error and return 500 - never skip verification because a key is unset.
    if (!env.TURNSTILE_SECRET_KEY) {
        console.error("TURNSTILE_SECRET_KEY is not configured");
        return errorResponse(["Internal server error"], 500);
    }

    const requestBody = body as ContactRequestBody;
    const rawToken = requestBody.turnstileToken;
    const turnstileToken = typeof rawToken === "string" ? rawToken : "";

    const verifyParams = new URLSearchParams();
    verifyParams.append("secret", env.TURNSTILE_SECRET_KEY);
    verifyParams.append("response", turnstileToken);

    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) {
        verifyParams.append("remoteip", clientIp);
    }

    let turnstileSuccess = false;
    try {
        const turnstileRes = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                body: verifyParams.toString(),
            }
        );

        if (turnstileRes.ok) {
            const turnstileData = (await turnstileRes.json()) as { success?: boolean };
            turnstileSuccess = turnstileData.success === true;
        }
    } catch {
        console.error("Turnstile verification request failed");
    }

    if (!turnstileSuccess) {
        return errorResponse(["Verification failed"], 403);
    }

    // 4. Validate with validateContact. On errors return 400 { errors, message }.
    const validation = validateContact(body);
    if (!validation.ok) {
        return errorResponse(validation.errors, 400);
    }

    // 5. Send via Brevo: POST https://api.brevo.com/v3/smtp/email with headers
    // api-key, accept: application/json, content-type: application/json.
    // If BREVO_API_KEY, CONTACT_EMAIL, or CONTACT_FROM_EMAIL is missing, console.error and return 500.
    // If Brevo responds not-ok, console.error with the response text and return 502.
    if (!env.BREVO_API_KEY || !env.CONTACT_EMAIL || !env.CONTACT_FROM_EMAIL) {
        console.error("BREVO_API_KEY, CONTACT_EMAIL, or CONTACT_FROM_EMAIL is missing");
        return errorResponse(["Internal server error"], 500);
    }

    const submissionId = crypto.randomUUID();

    const brevoPayload = buildBrevoPayload({
        name: validation.value.name,
        email: validation.value.email,
        subject: validation.value.subject,
        message: validation.value.message,
        submissionId,
        to: env.CONTACT_EMAIL,
        from: env.CONTACT_FROM_EMAIL,
        bcc: env.CONTACT_BCC_EMAIL,
    });

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": env.BREVO_API_KEY,
            accept: "application/json",
            "content-type": "application/json",
        },
        body: JSON.stringify(brevoPayload),
    });

    if (!brevoRes.ok) {
        const responseText = await brevoRes.text();
        console.error("Brevo email send failed:", responseText);
        return errorResponse(["Failed to send email"], 502);
    }

    // 6. On success return 200 { "success": true, "submissionId": <id> }.
    return jsonResponse({ success: true, submissionId }, 200);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname === "/api/contact") {
            return handleContact(request, env);
        }
        const assetResponse = await env.ASSETS.fetch(request);
        // Scoped admin fallback: a direct load of dynamic admin routes (e.g.
        // /admin/work/abc-123) has no static asset, so it 404s from ASSETS.
        // Serving the /admin root shell lets vue-router resolve the id client-side.
        // Scoping to /admin keeps every other unknown URL on the real 404 page.
        // Only GET falls back; a POST to an admin path keeps its 404.
        // The admin shell being reachable by anonymous visitors is accepted here
        // because the bundle was always public and the edge gate arrives in Phase 5.
        if (assetResponse.status === 404 && isAdminPath(url.pathname) && request.method === "GET") {
            return env.ASSETS.fetch(new Request(new URL("/admin", request.url), request));
        }
        return assetResponse;
    },
};
