# Contact Form with Netlify Forms + Honeypot

## Overview

Replace the mailto button in ContactSection with a secure contact form. Email never exposed client-side.

## Requirements

- Minimal fields: Name, Email, Message
- Inline success message after submission
- Security: honeypot, rate limiting, validation
- Performance: debounced validation
- UI consistent with existing site design

## Architecture

### Security Layers

1. **Honeypot** - Hidden `bot-field` input, bots fill it → rejected
2. **Client-side validation** - Required fields, email format
3. **Rate limiting** - 30s cooldown via localStorage
4. **Debounced validation** - 300ms delay while typing

### Form State

```typescript
interface FormState {
    name: string;
    email: string;
    message: string;
    honeypot: string; // hidden
    isSubmitting: boolean;
    isSubmitted: boolean;
    errors: Record<string, string>;
}
```

### UI States

| State      | Display                       |
| ---------- | ----------------------------- |
| Default    | Form with fields              |
| Submitting | Disabled button, spinner      |
| Submitted  | Success message replaces form |

## Implementation

### Files to Modify

- `components/sections/ContactSection.vue` - Replace mailto with form

### Files to Create

- `composables/useContactForm.ts` - Form logic, validation, rate limiting

### Form HTML Structure

```html
<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="contact" />
    <p class="hidden"><input name="bot-field" /></p>

    <input type="text" name="name" required />
    <input type="email" name="email" required />
    <textarea name="message" required></textarea>

    <button type="submit">Send Message</button>
</form>
```

### Styling

- Inputs: `w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-accent focus:ring-1 focus:ring-accent`
- Labels: `text-sm font-medium text-gray-700`
- Errors: `text-sm text-red-500 mt-1`
- Button: Existing accent button style
- Success: Green accent with checkmark icon

## Validation Rules

| Field   | Rules                        |
| ------- | ---------------------------- |
| Name    | Required, min 2 chars        |
| Email   | Required, valid email format |
| Message | Required, min 10 chars       |

## Rate Limiting

- Key: `contact-form-last-submit`
- Cooldown: 30 seconds
- Storage: localStorage
- UX: Button disabled with "Please wait Xs" text

## Success State

Form replaced with:

- Checkmark icon (green)
- "Thank you for reaching out!"
- "I'll get back to you soon."

## Testing Checklist

- [ ] Form renders correctly
- [ ] Validation errors display
- [ ] Honeypot hidden from users
- [ ] Rate limiting works
- [ ] Submission succeeds (local dev with netlify dev)
- [ ] Success message displays
- [ ] Mobile responsive
- [ ] Keyboard accessible
