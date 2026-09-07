import { describe, expect, it } from "vitest";
import {
    buildBrevoPayload,
    formatErrorResponse,
    isHoneypotTripped,
    normalizePlainTextSubject,
    sanitizeHtml,
    validateContact,
} from "../../worker/contact";

describe("isHoneypotTripped", () => {
    it("returns true when _honey is a non-empty string", () => {
        expect(isHoneypotTripped({ _honey: "spam" })).toBe(true);
        expect(isHoneypotTripped({ _honey: " " })).toBe(true);
        expect(isHoneypotTripped({ _honey: "bot-submission" })).toBe(true);
    });

    it("returns false when _honey is empty, missing, or falsy", () => {
        expect(isHoneypotTripped({ _honey: "" })).toBe(false);
        expect(isHoneypotTripped({})).toBe(false);
        expect(isHoneypotTripped({ _honey: undefined })).toBe(false);
        expect(isHoneypotTripped({ _honey: null })).toBe(false);
        expect(isHoneypotTripped({ _honey: 0 })).toBe(false);
    });

    it("returns false when body is null, undefined, or not an object", () => {
        expect(isHoneypotTripped(null)).toBe(false);
        expect(isHoneypotTripped(undefined)).toBe(false);
        expect(isHoneypotTripped("string")).toBe(false);
        expect(isHoneypotTripped(123)).toBe(false);
    });
});

describe("validateContact", () => {
    const validPayload = {
        name: "Jane Doe",
        email: "jane@example.com",
        subject: "Collaboration Inquiry",
        message: "Hello, I would love to discuss an upcoming project with you.",
    };

    it("produces no errors for a valid payload", () => {
        const result = validateContact(validPayload);
        expect(result).toEqual({
            ok: true,
            value: validPayload,
        });
    });

    it("trims fields on success", () => {
        const result = validateContact({
            name: "  Jane Doe  ",
            email: "jane@example.com",
            subject: "  Collaboration Inquiry  ",
            message: "  Hello, I would love to discuss an upcoming project with you.  ",
        });
        expect(result).toEqual({
            ok: true,
            value: {
                name: "Jane Doe",
                email: "jane@example.com",
                subject: "Collaboration Inquiry",
                message: "Hello, I would love to discuss an upcoming project with you.",
            },
        });
    });

    it("fails on invalid body types", () => {
        expect(validateContact(null)).toEqual({ ok: false, errors: ["Invalid request body"] });
        expect(validateContact(undefined)).toEqual({ ok: false, errors: ["Invalid request body"] });
        expect(validateContact("invalid")).toEqual({ ok: false, errors: ["Invalid request body"] });
        expect(validateContact(123)).toEqual({ ok: false, errors: ["Invalid request body"] });
    });

    describe("name validation", () => {
        it("fails when name is missing or empty", () => {
            const resultEmpty = validateContact({ ...validPayload, name: "" });
            expect(resultEmpty.ok).toBe(false);
            if (!resultEmpty.ok) {
                expect(resultEmpty.errors).toContain("Name must be at least 2 characters");
            }

            const resultMissing = validateContact({ ...validPayload, name: undefined });
            expect(resultMissing.ok).toBe(false);
            if (!resultMissing.ok) {
                expect(resultMissing.errors).toContain("Name must be at least 2 characters");
            }
        });

        it("fails when name trimmed is less than 2 characters", () => {
            const resultShort = validateContact({ ...validPayload, name: "A" });
            expect(resultShort.ok).toBe(false);
            if (!resultShort.ok) {
                expect(resultShort.errors).toContain("Name must be at least 2 characters");
            }

            const resultSpaces = validateContact({ ...validPayload, name: " A " });
            expect(resultSpaces.ok).toBe(false);
            if (!resultSpaces.ok) {
                expect(resultSpaces.errors).toContain("Name must be at least 2 characters");
            }
        });

        it("passes when name trimmed is at least 2 characters", () => {
            const result = validateContact({ ...validPayload, name: "Al" });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.name).toBe("Al");
            }
        });

        it("fails when name exceeds 100 characters", () => {
            const longName = "a".repeat(101);
            const result = validateContact({ ...validPayload, name: longName });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Name must be at most 100 characters");
            }
        });

        it("passes when name is exactly 100 characters", () => {
            const name100 = "a".repeat(100);
            const result = validateContact({ ...validPayload, name: name100 });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.name).toBe(name100);
            }
        });
    });

    describe("email validation", () => {
        it("fails when email is missing or empty", () => {
            const resultEmpty = validateContact({ ...validPayload, email: "" });
            expect(resultEmpty.ok).toBe(false);
            if (!resultEmpty.ok) {
                expect(resultEmpty.errors).toContain("Email is required");
            }

            const resultMissing = validateContact({ ...validPayload, email: undefined });
            expect(resultMissing.ok).toBe(false);
            if (!resultMissing.ok) {
                expect(resultMissing.errors).toContain("Email is required");
            }

            const resultSpaces = validateContact({ ...validPayload, email: "   " });
            expect(resultSpaces.ok).toBe(false);
            if (!resultSpaces.ok) {
                expect(resultSpaces.errors).toContain("Email is required");
            }
        });

        it("fails when email is malformed", () => {
            const invalidEmails = [
                "plainaddress",
                "@missingusername.com",
                "username@.com",
                "username@domain",
                "username with spaces@domain.com",
            ];

            for (const email of invalidEmails) {
                const result = validateContact({ ...validPayload, email });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.errors).toContain("Valid email required");
                    expect(result.errors).not.toContain("Email is required");
                }
            }
        });

        it("fails when email exceeds 200 characters", () => {
            const longEmail = `${"a".repeat(190)}@example.com`;
            expect(longEmail.length).toBeGreaterThan(200);

            const result = validateContact({ ...validPayload, email: longEmail });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Email must be at most 200 characters");
            }
        });

        it("passes when email is valid and within length limit", () => {
            const result = validateContact({ ...validPayload, email: "contact@domain.co.uk" });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.email).toBe("contact@domain.co.uk");
            }
        });
    });

    describe("subject validation", () => {
        it("fails when subject is missing or empty", () => {
            const resultEmpty = validateContact({ ...validPayload, subject: "" });
            expect(resultEmpty.ok).toBe(false);
            if (!resultEmpty.ok) {
                expect(resultEmpty.errors).toContain("Subject must be at least 3 characters");
            }

            const resultMissing = validateContact({ ...validPayload, subject: undefined });
            expect(resultMissing.ok).toBe(false);
            if (!resultMissing.ok) {
                expect(resultMissing.errors).toContain("Subject must be at least 3 characters");
            }

            const resultSpaces = validateContact({ ...validPayload, subject: "  " });
            expect(resultSpaces.ok).toBe(false);
            if (!resultSpaces.ok) {
                expect(resultSpaces.errors).toContain("Subject must be at least 3 characters");
            }
        });

        it("fails when subject trimmed is less than 3 characters", () => {
            const result = validateContact({ ...validPayload, subject: "Hi" });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Subject must be at least 3 characters");
            }
        });

        it("passes when subject trimmed is at least 3 characters", () => {
            const result = validateContact({ ...validPayload, subject: "Hey" });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.subject).toBe("Hey");
            }
        });

        it("fails when subject exceeds 160 characters", () => {
            const longSubject = "s".repeat(161);
            const result = validateContact({ ...validPayload, subject: longSubject });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Subject must be at most 160 characters");
            }
        });

        it("passes when subject is exactly 160 characters", () => {
            const subject160 = "s".repeat(160);
            const result = validateContact({ ...validPayload, subject: subject160 });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.subject).toBe(subject160);
            }
        });
    });

    describe("message validation", () => {
        it("fails when message is missing or empty", () => {
            const resultEmpty = validateContact({ ...validPayload, message: "" });
            expect(resultEmpty.ok).toBe(false);
            if (!resultEmpty.ok) {
                expect(resultEmpty.errors).toContain("Message must be at least 10 characters");
            }

            const resultMissing = validateContact({ ...validPayload, message: undefined });
            expect(resultMissing.ok).toBe(false);
            if (!resultMissing.ok) {
                expect(resultMissing.errors).toContain("Message must be at least 10 characters");
            }

            const resultSpaces = validateContact({ ...validPayload, message: "         " });
            expect(resultSpaces.ok).toBe(false);
            if (!resultSpaces.ok) {
                expect(resultSpaces.errors).toContain("Message must be at least 10 characters");
            }
        });

        it("fails when message trimmed is less than 10 characters", () => {
            const result = validateContact({ ...validPayload, message: "123456789" });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Message must be at least 10 characters");
            }
        });

        it("passes when message trimmed is at least 10 characters", () => {
            const result = validateContact({ ...validPayload, message: "1234567890" });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.message).toBe("1234567890");
            }
        });

        it("fails when message exceeds 5000 characters", () => {
            const longMessage = "m".repeat(5001);
            const result = validateContact({ ...validPayload, message: longMessage });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.errors).toContain("Message must be at most 5000 characters");
            }
        });

        it("passes when message is exactly 5000 characters", () => {
            const message5000 = "m".repeat(5000);
            const result = validateContact({ ...validPayload, message: message5000 });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.message).toBe(message5000);
            }
        });
    });

    it("aggregates errors across multiple invalid fields", () => {
        const result = validateContact({});
        expect(result).toEqual({
            ok: false,
            errors: [
                "Name must be at least 2 characters",
                "Email is required",
                "Subject must be at least 3 characters",
                "Message must be at least 10 characters",
            ],
        });
    });
});

describe("sanitizeHtml and normalizePlainTextSubject", () => {
    it("escapes special HTML characters", () => {
        const raw = `<script>alert("XSS" & 'test')</script>`;
        expect(sanitizeHtml(raw)).toBe(
            "&lt;script&gt;alert(&quot;XSS&quot; &amp; &#x27;test&#x27;)&lt;/script&gt;"
        );
    });

    it("normalizes newlines in subject into single spaces and trims", () => {
        expect(normalizePlainTextSubject("  Line 1\r\nLine 2\nLine 3  ")).toBe(
            "Line 1 Line 2 Line 3"
        );
    });
});

describe("buildBrevoPayload", () => {
    const params = {
        name: "Alice Walker",
        email: "alice@example.com",
        subject: "Test Subject",
        message: "Hello from line 1\nand line 2",
        submissionId: "uuid-1234-test",
        to: "portfolio@example.com",
        from: "noreply@auth.mikezamayias.com",
        bcc: "backup@example.com",
    };

    it("includes the submission id and configured to/from addresses", () => {
        const payload = buildBrevoPayload(params);

        expect(payload.sender).toEqual({
            name: "Portfolio",
            email: "noreply@auth.mikezamayias.com",
        });
        expect(payload.to).toEqual([{ email: "portfolio@example.com" }]);
        expect(payload.replyTo).toEqual({
            name: "Alice Walker",
            email: "alice@example.com",
        });
        expect(payload.bcc).toEqual([{ email: "backup@example.com" }]);
        expect(payload.subject).toBe("Portfolio Contact: Test Subject");

        expect(payload.htmlContent).toContain("Alice Walker");
        expect(payload.htmlContent).toContain("alice@example.com");
        expect(payload.htmlContent).toContain("Test Subject");
        expect(payload.htmlContent).toContain("Hello from line 1<br>and line 2");
        expect(payload.htmlContent).toContain("<small>Submission ID: uuid-1234-test</small>");
    });

    it("omits bcc when not provided", () => {
        const noBccParams = { ...params, bcc: undefined };
        const payload = buildBrevoPayload(noBccParams);
        expect(payload.bcc).toBeUndefined();
    });

    it("escapes HTML in name, email, subject, and message", () => {
        const payload = buildBrevoPayload({
            ...params,
            name: "<Jane>",
            email: "jane&doe@example.com",
            subject: 'Project "Alpha"',
            message: "Check <this> out & see",
        });

        expect(payload.htmlContent).toContain("&lt;Jane&gt;");
        expect(payload.htmlContent).toContain("jane&amp;doe@example.com");
        expect(payload.htmlContent).toContain("Project &quot;Alpha&quot;");
        expect(payload.htmlContent).toContain("Check &lt;this&gt; out &amp; see");
        expect(payload.htmlContent).not.toContain("<Jane>");
    });
});

describe("formatErrorResponse", () => {
    it("formats a single error with matching message", () => {
        const errors = ["Subject must be at least 3 characters"];
        const res = formatErrorResponse(errors);
        expect(res).toEqual({
            errors: ["Subject must be at least 3 characters"],
            message: "Subject must be at least 3 characters",
        });
        expect(res.message).toBe(res.errors.join("; "));
    });

    it("formats multiple errors and asserts message equals errors joined with '; '", () => {
        const errors = [
            "Name must be at least 2 characters",
            "Email is required",
            "Subject must be at least 3 characters",
            "Message must be at least 10 characters",
        ];
        const res = formatErrorResponse(errors);
        expect(res.errors).toEqual(errors);
        expect(res.message).toBe(
            "Name must be at least 2 characters; Email is required; Subject must be at least 3 characters; Message must be at least 10 characters"
        );
        expect(res.message).toBe(errors.join("; "));
    });
});
