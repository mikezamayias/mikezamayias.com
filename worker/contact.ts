export interface ContactPayload {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    _honey?: string;
}

export interface BrevoPayloadParams {
    name: string;
    email: string;
    subject: string;
    message: string;
    submissionId: string;
    to: string;
    from: string;
    bcc?: string;
}

export interface BrevoEmailAddress {
    name?: string;
    email: string;
}

export interface BrevoPayload {
    sender: BrevoEmailAddress;
    replyTo: BrevoEmailAddress;
    to: BrevoEmailAddress[];
    bcc?: BrevoEmailAddress[];
    subject: string;
    htmlContent: string;
}

export interface ValidatedContact {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export type ContactValidation =
    | { ok: true; value: { name: string; email: string; subject: string; message: string } }
    | { ok: false; errors: string[] };

export interface ContactErrorResponse {
    errors: string[];
    message: string;
}

/**
 * Creates an error response payload with both `errors` and `message` (errors joined with '; ').
 */
export function formatErrorResponse(errors: string[]): ContactErrorResponse {
    return {
        errors,
        message: errors.join("; "),
    };
}

/**
 * Sanitize a string for safe inclusion in HTML email content.
 * Escapes &, <, >, ", and ' to prevent HTML injection.
 */
export function sanitizeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

export function normalizePlainTextSubject(str: string): string {
    return str.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Checks if the honeypot field was populated by a bot.
 * True when `_honey` is a non-empty string.
 */
export function isHoneypotTripped(body: unknown): boolean {
    if (!body || typeof body !== "object") {
        return false;
    }
    const honey = (body as Record<string, unknown>)._honey;
    return typeof honey === "string" && honey.length > 0;
}

/**
 * Validate incoming contact form fields according to server-side rules.
 * Returns a discriminated result: { ok: true, value } with trimmed fields
 * on success, or { ok: false, errors } with error messages on failure.
 */
export function validateContact(body: unknown): ContactValidation {
    if (!body || typeof body !== "object") {
        return { ok: false, errors: ["Invalid request body"] };
    }

    const payload = body as ContactPayload;
    const errors: string[] = [];

    const name = typeof payload.name === "string" ? payload.name : undefined;
    if (!name?.trim() || name.trim().length < 2) {
        errors.push("Name must be at least 2 characters");
    }
    if (name && name.length > 100) {
        errors.push("Name must be at most 100 characters");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    if (!email?.trim()) {
        errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Valid email required");
    } else if (email.length > 200) {
        errors.push("Email must be at most 200 characters");
    }

    const subject = typeof payload.subject === "string" ? payload.subject : undefined;
    if (!subject?.trim() || subject.trim().length < 3) {
        errors.push("Subject must be at least 3 characters");
    }
    if (subject && subject.length > 160) {
        errors.push("Subject must be at most 160 characters");
    }

    const message = typeof payload.message === "string" ? payload.message : undefined;
    if (!message?.trim() || message.trim().length < 10) {
        errors.push("Message must be at least 10 characters");
    }
    if (message && message.length > 5000) {
        errors.push("Message must be at most 5000 characters");
    }

    if (errors.length > 0 || !name || !email || !subject || !message) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
        },
    };
}

/**
 * Build the JSON body for sending via Brevo transactional email API.
 */
export function buildBrevoPayload(params: BrevoPayloadParams): BrevoPayload {
    const safeName = sanitizeHtml(params.name);
    const safeEmail = sanitizeHtml(params.email);
    const safeSubject = sanitizeHtml(params.subject);
    const safeMessage = sanitizeHtml(params.message).replace(/\n/g, "<br>");
    const emailSubject = normalizePlainTextSubject(params.subject);

    const payload: BrevoPayload = {
        sender: { name: "Portfolio", email: params.from },
        replyTo: { email: params.email, name: params.name },
        to: [{ email: params.to }],
        subject: `Portfolio Contact: ${emailSubject}`,
        htmlContent: `
                <h2>New contact form submission</h2>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Subject:</strong> ${safeSubject}</p>
                <p><strong>Message:</strong></p>
                <p>${safeMessage}</p>
                <hr>
                <p><small>Submission ID: ${params.submissionId}</small></p>
            `,
    };

    if (params.bcc) {
        payload.bcc = [{ email: params.bcc }];
    }

    return payload;
}
