// shared/schemas.ts
import * as z from "zod";

const SlugRegex = /^[a-z0-9-]+$/;
const Url = z.string().url();
const PerLocale = <T extends z.ZodTypeAny>(shape: T) =>
    z
        .object({ en: shape.optional(), el: shape.optional() })
        .refine((v) => v.en || v.el, "at least one locale required");

export const WorkSchema = z.object({
    slug: z.string().regex(SlugRegex),
    yr: z.string().max(16),
    stack: z.string().max(64),
    glyph: z.string().max(4),
    order: z.number().int(),
    published: z.boolean(),
    locales_available: z.array(z.enum(["en", "el"])).min(1),
    locale: PerLocale(
        z.object({
            name: z.string().min(1).max(120),
            desc: z.string().min(1).max(280),
            long: z.string().max(4000),
        })
    ),
    links: z
        .array(
            z.object({
                kind: z.enum(["live", "repo", "appstore", "other"]),
                url: Url,
                label: z.string().max(64).optional(),
            })
        )
        .max(10)
        .optional(),
    images: z
        .array(
            z.object({
                src: z.string().max(500),
                alt: z.string().max(280),
                caption: z.string().max(280).optional(),
                order: z.number().int(),
            })
        )
        .max(50)
        .optional(),
});

export const WritingSchema = z.object({
    slug: z.string().regex(SlugRegex),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tags: z.array(z.string().max(32)).max(8),
    read: z.number().int().min(0).max(120),
    order: z.number().int(),
    published: z.boolean(),
    locales_available: z.array(z.enum(["en", "el"])).min(1),
    locale: PerLocale(
        z.object({
            title: z.string().min(1).max(200),
            sub: z.string().max(400),
            body: z.string().min(1).max(100_000),
        })
    ),
});

export const RoadmapEntrySchema = z.object({
    id: z.string().regex(SlugRegex),
    status: z.enum(["shipping", "todo", "done", "blocked"]),
    priority: z.enum(["high", "medium", "low"]),
    href: Url,
    sprint_id: z.string().regex(SlugRegex).optional(),
    hidden: z.boolean(),
    order: z.number().int(),
    locale: PerLocale(
        z.object({
            title: z.string().min(1).max(140),
            note: z.string().max(400),
        })
    ),
});

export const ProfileSchema = z.object({
    headline: PerLocale(z.string().min(1).max(140)),
    summary: PerLocale(z.string().max(2000)),
    email: z.string().email(),
    phone: z.string().max(32).optional(),
    avatar: z.string().max(500).optional(),
    location: PerLocale(z.string().max(140)),
});

export const SocialSchema = z.object({
    id: z.string().regex(SlugRegex),
    label: z.string().min(1).max(40),
    url: Url,
    icon: z.string().max(64).optional(),
    order: z.number().int(),
    visible: z.boolean(),
});

export const ExperienceSchema = z.object({
    id: z.string().regex(SlugRegex),
    role: PerLocale(z.string().min(1).max(140)),
    company: z.string().min(1).max(140),
    companyUrl: Url.optional(),
    start: z.string().regex(/^\d{4}-\d{2}$/),
    end: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    summary: PerLocale(z.string().max(1000)),
    achievements: z
        .array(PerLocale(z.string().max(400)))
        .max(20)
        .optional(),
    order: z.number().int(),
});

export const SkillSchema = z.object({
    id: z.string().regex(SlugRegex),
    name: z.string().min(1).max(64),
    category: z.enum(["language", "framework", "platform", "tool", "other"]),
    proficiency: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
        .optional(),
    order: z.number().int(),
});

export const EducationSchema = z.object({
    id: z.string().regex(SlugRegex),
    institution: z.string().min(1).max(200),
    degree: PerLocale(z.string().max(140)),
    field: PerLocale(z.string().max(140)).optional(),
    start: z.string().regex(/^\d{4}-\d{2}$/),
    end: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    order: z.number().int(),
});

export const CertificationSchema = z.object({
    id: z.string().regex(SlugRegex),
    name: z.string().min(1).max(140),
    issuer: z.string().min(1).max(140),
    issued: z.string().regex(/^\d{4}-\d{2}$/),
    expires: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    credentialId: z.string().max(140).optional(),
    credentialUrl: Url.optional(),
    order: z.number().int(),
});

export const ContactSchema = z.object({
    email: z.string().email(),
    timezone: z.string().max(64).optional(),
    availability: PerLocale(z.string().max(400)).optional(),
    preferredChannel: z.enum(["email", "calendar"]).optional(),
    calendarUrl: Url.optional(),
});

export const HeroSchema = z.object({
    cycle: z.object({
        en: z.array(z.string()).max(20),
        el: z.array(z.string()).max(20),
    }),
    lede: z.object({
        en: z.object({
            before: z.string().max(400),
            highlight: z.string().max(120),
            after: z.string().max(400),
        }),
        el: z.object({
            before: z.string().max(400),
            highlight: z.string().max(120),
            after: z.string().max(400),
        }),
    }),
    meta: z.object({
        en: z.object({
            stack: z.string().max(120),
            location: z.string().max(80),
            audience: z.string().max(120),
        }),
        el: z.object({
            stack: z.string().max(120),
            location: z.string().max(80),
            audience: z.string().max(120),
        }),
    }),
    cta: z.object({
        en: z.object({
            primary: z.string().max(60),
            secondary: z.string().max(60),
        }),
        el: z.object({
            primary: z.string().max(60),
            secondary: z.string().max(60),
        }),
    }),
});

export const AboutSchema = z.object({
    name: PerLocale(z.string().max(140)),
    role: PerLocale(z.string().max(140)),
    location: PerLocale(z.string().max(140)),
    stacks: PerLocale(z.string().max(140)),
    current: PerLocale(z.string().max(140)),
    years: PerLocale(z.string().max(140)),
    bio: PerLocale(z.string().max(2000)),
    intro: PerLocale(z.string().max(400)),
});

export const RoadmapMetaSchema = z.object({
    goal: PerLocale(z.string().max(200)),
    target: PerLocale(z.string().max(80)),
    intro: PerLocale(z.string().max(400)),
});

export const COLLECTION_SCHEMAS = {
    work: WorkSchema,
    writing: WritingSchema,
    roadmap: RoadmapEntrySchema,
    profile: ProfileSchema,
    social: SocialSchema,
    experience: ExperienceSchema,
    skills: SkillSchema,
    education: EducationSchema,
    certifications: CertificationSchema,
    contact: ContactSchema,
} as const;

export const SINGLETON_SCHEMAS = {
    hero: HeroSchema,
    about: AboutSchema,
    roadmap: RoadmapMetaSchema,
} as const;
