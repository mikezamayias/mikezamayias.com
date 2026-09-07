export type AdminFieldType =
    | "text"
    | "textarea"
    | "markdown"
    | "number"
    | "boolean"
    | "select"
    | "csv"
    | "json"
    | "date"
    | "month"
    | "url";

export interface AdminField {
    path: string;
    label: string;
    type: AdminFieldType;
    required?: boolean;
    emptyAsUndefined?: boolean;
    options?: Array<{ label: string; value: string | number | boolean }>;
    rows?: number;
    hint?: string;
}

export interface AdminCollectionDefinition {
    route: string;
    collection: string;
    label: string;
    plural: string;
    idField: string;
    description: string;
    fields: AdminField[];
    create(id: string): Record<string, unknown>;
    prepare(doc: Record<string, unknown>, id: string): Record<string, unknown>;
    title(doc: Record<string, unknown>): string;
    subtitle(doc: Record<string, unknown>): string;
    badge?(doc: Record<string, unknown>): string;
}

export interface AdminSingletonDefinition {
    route: string;
    kind: "singleton" | "collectionDoc";
    collection?: string;
    docId?: string;
    singleton?: string;
    label: string;
    description: string;
    fields: AdminField[];
    create(): Record<string, unknown>;
    prepare(doc: Record<string, unknown>): Record<string, unknown>;
}

const unsafePathSegments = new Set(["__proto__", "constructor", "prototype"]);

function isUnsafePathSegment(segment: string) {
    return unsafePathSegments.has(segment);
}

function safePathParts(path: string) {
    const parts = path.split(".");
    if (!parts.length || parts.some((part) => !part || isUnsafePathSegment(part))) {
        throw new Error(`Unsafe admin field path: ${path}`);
    }
    return parts;
}

export function getByPath(source: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    if (!parts.length || parts.some((part) => !part || isUnsafePathSegment(part))) {
        return undefined;
    }
    return parts.reduce<unknown>((value, key) => {
        if (!value || typeof value !== "object") return undefined;
        return (value as Record<string, unknown>)[key];
    }, source);
}

export function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = safePathParts(path);
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
        const next = cursor[part];
        if (!next || typeof next !== "object" || Array.isArray(next)) {
            cursor[part] = {};
        }
        cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]!] = value;
}

function localeHasText(doc: Record<string, unknown>, locale: "en" | "el") {
    const value = getByPath(doc, `locale.${locale}`);
    if (!value || typeof value !== "object") return false;
    return Object.values(value).some((field) => typeof field === "string" && field.trim().length);
}

function withLocalesAvailable(doc: Record<string, unknown>) {
    const locales: Array<"en" | "el"> = [];
    if (localeHasText(doc, "en")) locales.push("en");
    if (localeHasText(doc, "el")) locales.push("el");
    return {
        ...doc,
        locales_available: locales.length ? locales : ["en"],
    };
}

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function slugifyDocumentId(input: string) {
    const asciiSlug = slugify(input);
    if (asciiSlug) return asciiSlug;

    const codePointSlug = Array.from(input.normalize("NFKC").trim())
        .slice(0, 16)
        .map((char) => char.codePointAt(0)?.toString(36))
        .filter(Boolean)
        .join("-");

    return codePointSlug ? `doc-${codePointSlug}` : "";
}

const localeTextFields = (
    prefix: string,
    labels: { en: string; el: string },
    rows = 3,
    options: { optional?: boolean } = {}
) => [
    {
        path: `${prefix}.en`,
        label: labels.en,
        type: "textarea" as const,
        rows,
        emptyAsUndefined: options.optional,
    },
    {
        path: `${prefix}.el`,
        label: labels.el,
        type: "textarea" as const,
        rows,
        emptyAsUndefined: true,
    },
];

export const adminCollections: Record<string, AdminCollectionDefinition> = {
    work: {
        route: "work",
        collection: "work",
        label: "Work",
        plural: "Work",
        idField: "slug",
        description: "Selected work cards and work detail pages.",
        fields: [
            { path: "slug", label: "Slug", type: "text", required: true },
            { path: "locale.en.name", label: "Name EN", type: "text", required: true },
            { path: "locale.el.name", label: "Name EL", type: "text", emptyAsUndefined: true },
            {
                path: "start",
                label: "Start",
                type: "month",
                hint: "When work began. Stored as YYYY-MM.",
            },
            {
                path: "end",
                label: "End",
                type: "month",
                emptyAsUndefined: true,
                hint: "Leave empty for ongoing work — public render shows '→ Present'.",
            },
            {
                path: "stack",
                label: "Stack",
                type: "csv",
                hint: "Comma-separated. Public render joins with '·'.",
            },
            { path: "glyph", label: "Glyph", type: "text" },
            { path: "locale.en.desc", label: "Description EN", type: "textarea", rows: 3 },
            {
                path: "locale.el.desc",
                label: "Description EL",
                type: "textarea",
                rows: 3,
                emptyAsUndefined: true,
            },
            { path: "locale.en.long", label: "Long copy EN", type: "textarea", rows: 8 },
            {
                path: "locale.el.long",
                label: "Long copy EL",
                type: "textarea",
                rows: 8,
                emptyAsUndefined: true,
            },
            { path: "links", label: "Links JSON", type: "json", rows: 5 },
            { path: "images", label: "Images JSON", type: "json", rows: 5 },
            { path: "order", label: "Order", type: "number" },
            { path: "published", label: "Published", type: "boolean" },
        ],
        create: (id) => ({
            slug: id === "new" ? "" : id,
            start: new Date().toISOString().slice(0, 7),
            stack: [],
            glyph: "",
            order: 0,
            published: false,
            locales_available: ["en"],
            locale: { en: { name: "", desc: "", long: "" } },
            links: [],
            images: [],
        }),
        prepare: (doc, id) => withLocalesAvailable({ ...doc, slug: String(doc.slug || id) }),
        title: (doc) => String(getByPath(doc, "locale.en.name") || doc.slug || "Untitled"),
        subtitle: (doc) => {
            const desc = getByPath(doc, "locale.en.desc");
            if (typeof desc === "string" && desc.trim()) return desc;
            const stack = doc.stack;
            if (Array.isArray(stack) && stack.length) return stack.join(" · ");
            return "";
        },
        badge: (doc) => (doc.published ? "published" : "draft"),
    },
    writing: {
        route: "writing",
        collection: "writing",
        label: "Writing",
        plural: "Writing",
        idField: "slug",
        description: "Writing index and Markdown detail pages.",
        fields: [
            { path: "slug", label: "Slug", type: "text", required: true },
            { path: "locale.en.title", label: "Title EN", type: "text", required: true },
            { path: "locale.el.title", label: "Title EL", type: "text", emptyAsUndefined: true },
            { path: "locale.en.sub", label: "Subtitle EN", type: "textarea", rows: 3 },
            {
                path: "locale.el.sub",
                label: "Subtitle EL",
                type: "textarea",
                rows: 3,
                emptyAsUndefined: true,
            },
            { path: "locale.en.body", label: "Body EN", type: "markdown", rows: 16 },
            {
                path: "locale.el.body",
                label: "Body EL",
                type: "markdown",
                rows: 16,
                emptyAsUndefined: true,
            },
            { path: "date", label: "Date", type: "date" },
            { path: "tags", label: "Tags", type: "csv" },
            { path: "read", label: "Read minutes", type: "number" },
            { path: "order", label: "Order", type: "number" },
            { path: "published", label: "Published", type: "boolean" },
        ],
        create: (id) => ({
            slug: id === "new" ? "" : id,
            date: new Date().toISOString().slice(0, 10),
            tags: [],
            read: 3,
            order: 0,
            published: false,
            locales_available: ["en"],
            locale: { en: { title: "", sub: "", body: "" } },
        }),
        prepare: (doc, id) => withLocalesAvailable({ ...doc, slug: String(doc.slug || id) }),
        title: (doc) => String(getByPath(doc, "locale.en.title") || doc.slug || "Untitled"),
        subtitle: (doc) => String(getByPath(doc, "locale.en.sub") || doc.date || ""),
        badge: (doc) => (doc.published ? "published" : "draft"),
    },
    roadmap: {
        route: "roadmap",
        collection: "roadmap",
        label: "Roadmap Entry",
        plural: "Roadmap",
        idField: "id",
        description: "The roadmap section on the public home page.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "locale.en.title", label: "Title EN", type: "text", required: true },
            { path: "locale.el.title", label: "Title EL", type: "text", emptyAsUndefined: true },
            { path: "locale.en.note", label: "Note EN", type: "textarea", rows: 3 },
            {
                path: "locale.el.note",
                label: "Note EL",
                type: "textarea",
                rows: 3,
                emptyAsUndefined: true,
            },
            {
                path: "status",
                label: "Status",
                type: "select",
                options: ["shipping", "todo", "done", "blocked"].map((value) => ({
                    label: value,
                    value,
                })),
            },
            {
                path: "priority",
                label: "Priority",
                type: "select",
                options: ["high", "medium", "low"].map((value) => ({ label: value, value })),
            },
            { path: "href", label: "Link", type: "url" },
            { path: "sprint_id", label: "Sprint ID", type: "text", emptyAsUndefined: true },
            { path: "hidden", label: "Hidden", type: "boolean" },
            { path: "order", label: "Order", type: "number" },
        ],
        create: (id) => ({
            id: id === "new" ? "" : id,
            status: "todo",
            priority: "medium",
            href: "https://github.com/mikezamayias/personal-website-v1",
            hidden: false,
            order: 0,
            locale: { en: { title: "", note: "" } },
        }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(getByPath(doc, "locale.en.title") || doc.id || "Untitled"),
        subtitle: (doc) => String(getByPath(doc, "locale.en.note") || ""),
        badge: (doc) => String(doc.status || "todo"),
    },
    social: {
        route: "social",
        collection: "social",
        label: "Social Link",
        plural: "Social",
        idField: "id",
        description: "Visible profile links.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "label", label: "Label", type: "text", required: true },
            { path: "url", label: "URL", type: "url", required: true },
            { path: "icon", label: "Icon", type: "text", emptyAsUndefined: true },
            { path: "order", label: "Order", type: "number" },
            { path: "visible", label: "Visible", type: "boolean" },
        ],
        create: (id) => ({
            id: id === "new" ? "" : id,
            label: "",
            url: "",
            order: 0,
            visible: true,
        }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(doc.label || doc.id || "Untitled"),
        subtitle: (doc) => String(doc.url || ""),
        badge: (doc) => (doc.visible ? "visible" : "hidden"),
    },
    experience: {
        route: "experience",
        collection: "experience",
        label: "Experience",
        plural: "Experience",
        idField: "id",
        description: "Career timeline entries for the about route.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "role.en", label: "Role EN", type: "text", required: true },
            { path: "role.el", label: "Role EL", type: "text", emptyAsUndefined: true },
            { path: "company", label: "Company", type: "text", required: true },
            { path: "companyUrl", label: "Company URL", type: "url", emptyAsUndefined: true },
            { path: "start", label: "Start", type: "month" },
            { path: "end", label: "End", type: "month", emptyAsUndefined: true },
            ...localeTextFields("summary", { en: "Summary EN", el: "Summary EL" }, 4),
            { path: "achievements", label: "Achievements JSON", type: "json", rows: 6 },
            { path: "order", label: "Order", type: "number" },
        ],
        create: (id) => ({
            id: id === "new" ? "" : id,
            role: { en: "" },
            company: "",
            start: new Date().toISOString().slice(0, 7),
            summary: { en: "" },
            achievements: [],
            order: 0,
        }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(getByPath(doc, "role.en") || doc.id || "Untitled"),
        subtitle: (doc) => String(doc.company || ""),
    },
    skills: {
        route: "skills",
        collection: "skills",
        label: "Skill",
        plural: "Skills",
        idField: "id",
        description: "Technology tags grouped by category.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "name", label: "Name", type: "text", required: true },
            {
                path: "category",
                label: "Category",
                type: "select",
                options: ["language", "framework", "platform", "tool", "other"].map((value) => ({
                    label: value,
                    value,
                })),
            },
            { path: "proficiency", label: "Proficiency", type: "number", emptyAsUndefined: true },
            { path: "order", label: "Order", type: "number" },
        ],
        create: (id) => ({ id: id === "new" ? "" : id, name: "", category: "tool", order: 0 }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(doc.name || doc.id || "Untitled"),
        subtitle: (doc) => String(doc.category || ""),
    },
    education: {
        route: "education",
        collection: "education",
        label: "Education",
        plural: "Education",
        idField: "id",
        description: "Education entries.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "institution", label: "Institution", type: "text", required: true },
            ...localeTextFields("degree", { en: "Degree EN", el: "Degree EL" }, 2),
            ...localeTextFields("field", { en: "Field EN", el: "Field EL" }, 2, {
                optional: true,
            }),
            { path: "start", label: "Start", type: "month" },
            { path: "end", label: "End", type: "month", emptyAsUndefined: true },
            { path: "order", label: "Order", type: "number" },
        ],
        create: (id) => ({
            id: id === "new" ? "" : id,
            institution: "",
            degree: { en: "" },
            start: new Date().toISOString().slice(0, 7),
            order: 0,
        }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(doc.institution || doc.id || "Untitled"),
        subtitle: (doc) => String(getByPath(doc, "degree.en") || ""),
    },
    certifications: {
        route: "certifications",
        collection: "certifications",
        label: "Certification",
        plural: "Certifications",
        idField: "id",
        description: "Professional certificates and credentials.",
        fields: [
            { path: "id", label: "ID", type: "text", required: true },
            { path: "name", label: "Name", type: "text", required: true },
            { path: "issuer", label: "Issuer", type: "text", required: true },
            { path: "issued", label: "Issued", type: "month" },
            { path: "expires", label: "Expires", type: "month", emptyAsUndefined: true },
            { path: "credentialId", label: "Credential ID", type: "text", emptyAsUndefined: true },
            {
                path: "credentialUrl",
                label: "Credential URL",
                type: "url",
                emptyAsUndefined: true,
            },
            { path: "order", label: "Order", type: "number" },
        ],
        create: (id) => ({
            id: id === "new" ? "" : id,
            name: "",
            issuer: "",
            issued: new Date().toISOString().slice(0, 7),
            order: 0,
        }),
        prepare: (doc, id) => ({ ...doc, id: String(doc.id || id) }),
        title: (doc) => String(doc.name || doc.id || "Untitled"),
        subtitle: (doc) => String(doc.issuer || ""),
    },
};

export const adminSingletons: Record<string, AdminSingletonDefinition> = {
    hero: {
        route: "hero",
        kind: "singleton",
        singleton: "hero",
        label: "Hero",
        description: "Home hero copy, typewriter phrases, and CTA text.",
        fields: [
            { path: "cycle.en", label: "Cycle phrases EN", type: "csv" },
            { path: "cycle.el", label: "Cycle phrases EL", type: "csv" },
            { path: "lede.en.before", label: "Lede before EN", type: "textarea", rows: 3 },
            { path: "lede.en.highlight", label: "Highlight EN", type: "text" },
            { path: "lede.en.after", label: "Lede after EN", type: "textarea", rows: 3 },
            { path: "lede.el.before", label: "Lede before EL", type: "textarea", rows: 3 },
            { path: "lede.el.highlight", label: "Highlight EL", type: "text" },
            { path: "lede.el.after", label: "Lede after EL", type: "textarea", rows: 3 },
            { path: "meta.en.stack", label: "Stack EN", type: "text" },
            { path: "meta.en.location", label: "Location EN", type: "text" },
            { path: "meta.en.audience", label: "Audience EN", type: "text" },
            { path: "meta.el.stack", label: "Stack EL", type: "text" },
            { path: "meta.el.location", label: "Location EL", type: "text" },
            { path: "meta.el.audience", label: "Audience EL", type: "text" },
            { path: "cta.en.primary", label: "Primary CTA EN", type: "text" },
            { path: "cta.en.secondary", label: "Secondary CTA EN", type: "text" },
            { path: "cta.el.primary", label: "Primary CTA EL", type: "text" },
            { path: "cta.el.secondary", label: "Secondary CTA EL", type: "text" },
        ],
        create: () => ({
            cycle: { en: [], el: [] },
            lede: {
                en: { before: "", highlight: "", after: "" },
                el: { before: "", highlight: "", after: "" },
            },
            meta: {
                en: { stack: "", location: "", audience: "" },
                el: { stack: "", location: "", audience: "" },
            },
            cta: {
                en: { primary: "", secondary: "" },
                el: { primary: "", secondary: "" },
            },
        }),
        prepare: (doc) => doc,
    },
    about: {
        route: "about",
        kind: "singleton",
        singleton: "about",
        label: "About",
        description: "Biography copy and home/about route facts.",
        fields: [
            ...localeTextFields("name", { en: "Name EN", el: "Name EL" }, 1),
            ...localeTextFields("role", { en: "Role EN", el: "Role EL" }, 1),
            ...localeTextFields("location", { en: "Location EN", el: "Location EL" }, 1),
            ...localeTextFields("stacks", { en: "Stacks EN", el: "Stacks EL" }, 1),
            ...localeTextFields("current", { en: "Current EN", el: "Current EL" }, 1),
            ...localeTextFields("years", { en: "Years EN", el: "Years EL" }, 1),
            ...localeTextFields("intro", { en: "Intro EN", el: "Intro EL" }, 3),
            ...localeTextFields("bio", { en: "Bio EN", el: "Bio EL" }, 8),
        ],
        create: () => ({
            name: { en: "" },
            role: { en: "" },
            location: { en: "" },
            stacks: { en: "" },
            current: { en: "" },
            years: { en: "" },
            intro: { en: "" },
            bio: { en: "" },
        }),
        prepare: (doc) => doc,
    },
    roadmapSettings: {
        route: "roadmap-settings",
        kind: "singleton",
        singleton: "roadmap",
        label: "Roadmap Settings",
        description: "Roadmap goal, target, and intro text.",
        fields: [
            ...localeTextFields("intro", { en: "Intro EN", el: "Intro EL" }, 4),
            ...localeTextFields("goal", { en: "Goal EN", el: "Goal EL" }, 2),
            ...localeTextFields("target", { en: "Target EN", el: "Target EL" }, 1),
        ],
        create: () => ({ intro: { en: "" }, goal: { en: "" }, target: { en: "" } }),
        prepare: (doc) => doc,
    },
    contact: {
        route: "contact",
        kind: "collectionDoc",
        collection: "contact",
        docId: "main",
        label: "Contact",
        description: "Public contact metadata and preferred booking channel.",
        fields: [
            { path: "email", label: "Email", type: "text" },
            { path: "timezone", label: "Timezone", type: "text" },
            ...localeTextFields(
                "availability",
                { en: "Availability EN", el: "Availability EL" },
                3,
                { optional: true }
            ),
            {
                path: "preferredChannel",
                label: "Preferred Channel",
                type: "select",
                options: [
                    { label: "email", value: "email" },
                    { label: "calendar", value: "calendar" },
                ],
            },
            { path: "calendarUrl", label: "Calendar URL", type: "url", emptyAsUndefined: true },
        ],
        create: () => ({
            email: "",
            timezone: "Europe/Athens",
            preferredChannel: "email",
        }),
        prepare: (doc) => doc,
    },
    profile: {
        route: "profile",
        kind: "collectionDoc",
        collection: "profile",
        docId: "main",
        label: "Profile",
        description: "Private canonical resume profile fields.",
        fields: [
            ...localeTextFields("headline", { en: "Headline EN", el: "Headline EL" }, 2),
            ...localeTextFields("summary", { en: "Summary EN", el: "Summary EL" }, 8),
            { path: "email", label: "Email", type: "text" },
            { path: "phone", label: "Phone", type: "text" },
            { path: "avatar", label: "Avatar path", type: "text" },
            ...localeTextFields("location", { en: "Location EN", el: "Location EL" }, 2),
        ],
        create: () => ({
            headline: { en: "" },
            summary: { en: "" },
            email: "",
            location: { en: "" },
        }),
        prepare: (doc) => doc,
    },
};

export function resolveAdminCollection(route: string): AdminCollectionDefinition | null {
    return adminCollections[route] ?? null;
}

export function resolveAdminSingleton(route: string): AdminSingletonDefinition | null {
    return Object.values(adminSingletons).find((entry) => entry.route === route) ?? null;
}

/**
 * Detect locale-suffixed field paths. After Plan I dropped EL from
 * the public surface, EL fields are still persisted (tolerance for
 * future re-introduction) but should not clutter the primary editor.
 * The `/admin/translations` flow opts back in.
 *
 * Matches:
 *   `locale.el`            → locale-root pattern
 *   `locale.el.title`      → locale-prefixed nested
 *   `role.el`              → flat-suffix pattern (experience role)
 *   `lede.el.before`       → nested-suffix pattern (hero lede)
 */
export function isLocaleField(field: AdminField): boolean {
    return /(^|\.)el(\.|$)/.test(field.path);
}

export function partitionFields(fields: AdminField[]): {
    primary: AdminField[];
    locale: AdminField[];
} {
    return {
        primary: fields.filter((field) => !isLocaleField(field)),
        locale: fields.filter(isLocaleField),
    };
}

/**
 * Coverage snapshot for a single doc against its locale fields.
 * `total` is the count of EL fields defined on the entity; `filled`
 * counts how many of those have non-empty values on the doc. Used by
 * the /admin/translations index to render a progress chip.
 */
export interface LocaleCoverage {
    filled: number;
    total: number;
}

export function localeCoverage(doc: Record<string, unknown>, fields: AdminField[]): LocaleCoverage {
    const localeFields = fields.filter(isLocaleField);
    let filled = 0;
    for (const field of localeFields) {
        const value = getByPath(doc, field.path);
        if (typeof value === "string" && value.trim().length) filled += 1;
        else if (Array.isArray(value) && value.length) filled += 1;
        else if (
            value &&
            typeof value === "object" &&
            Object.values(value).some((v) => typeof v === "string" && v.trim().length)
        )
            filled += 1;
    }
    return { filled, total: localeFields.length };
}

export function defaultDocumentId(
    definition: AdminCollectionDefinition,
    doc: Record<string, unknown>
) {
    const value = getByPath(doc, definition.idField);
    if (typeof value === "string" && value.trim()) return slugifyDocumentId(value);
    const title =
        definition.route === "writing"
            ? getByPath(doc, "locale.en.title")
            : definition.route === "work" || definition.route === "roadmap"
              ? getByPath(doc, "locale.en.name") || getByPath(doc, "locale.en.title")
              : getByPath(doc, "name") || getByPath(doc, "label");
    return typeof title === "string" ? slugifyDocumentId(title) : "";
}
