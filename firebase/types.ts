// firebase/types.ts
//
// Single source of truth for Firestore document shapes. All client code reads
// these via the typed converters in firebase/db.ts; admin write code on the
// server validates against the same types. Adding a field? Update here first.

import type { WorkStatus } from "#shared/workStatus";

// Plan I follow-up: Greek dropped from the public UI surface. The
// type stays bi-lingual (`'en' | 'el'`) because the i18n module +
// existing Firestore documents still carry both shapes; at runtime
// only `'en'` is ever surfaced (see `nuxt.config.ts` i18n.locales).
// Re-introducing EL is a one-locale entry in the config + the EL
// fields here are unchanged.
export type Locale = "en" | "el";

export interface PerLocaleString {
    en?: string;
    el?: string;
}

/** work/{slug} — portfolio entries. Renamed from `projects` in Plan H.3. */
export interface Work {
    slug: string;
    /**
     * Start month-year in `YYYY-MM` (HTML month-picker output) or
     * `YYYY` shorthand for year-only entries. Renderers normalize to
     * display via `utils/workFormat.ts:formatWorkRange`.
     */
    start: string;
    /**
     * End month-year. Same shape as `start`. Empty / undefined means
     * "current" — renderers append `→ Present` in that case.
     */
    end?: string;
    /** Tech stack — array. Render joins with `·` on the public side. */
    stack: string[];
    glyph: string; // single-character marker
    order: number; // public-list ordering
    published: boolean;
    /** Where it stands: under construction, open for testing, or live. */
    status?: WorkStatus;
    /** Where it runs, as shown to readers: "iOS", "macOS", "Web", "CLI". */
    platform?: string;
    locales_available: Locale[]; // for composite-index query
    locale: {
        en?: { name: string; desc: string; long: string };
        el?: { name: string; desc: string; long: string };
    };
    images?: Array<{ src: string; alt: string; caption?: string; order: number }>;
    links?: Array<{ kind: "live" | "repo" | "appstore" | "other"; url: string; label?: string }>;
    createdAt?: number; // serverTimestamp().toMillis()
    updatedAt?: number;
}

/** writing/{slug} — long-form pieces. Renamed from `posts` in Plan H.3. */
export interface Writing {
    slug: string;
    date: string; // YYYY-MM-DD
    tags: string[];
    read: number; // minutes, auto-derived but overridable
    order: number;
    published: boolean;
    locales_available: Locale[];
    locale: {
        en?: { title: string; sub: string; body: string };
        el?: { title: string; sub: string; body: string };
    };
    createdAt?: number;
    updatedAt?: number;
}

/**
 * roadmap/{id} — roadmap entries. Renamed from `tasks` in Plan H.3.
 *
 * Named `RoadmapEntry` (not `Roadmap`) so `const roadmap: RoadmapEntry[]`
 * reads unambiguously next to the existing `RoadmapDoc` singleton type
 * (`singletons/roadmap`, page-meta for the section). The Firestore
 * collection itself is still just `roadmap/` — the type name is the
 * only place the compound shows up.
 */
export interface RoadmapEntry {
    id: string;
    status: "shipping" | "todo" | "done" | "blocked";
    priority: "high" | "medium" | "low";
    href: string; // GitHub PR / issue URL
    sprint_id?: string; // optional grouping
    hidden: boolean; // admin-only when true
    order: number;
    locale: {
        en?: { title: string; note: string };
        el?: { title: string; note: string };
    };
    createdAt?: number;
    updatedAt?: number;
}

/** singletons/hero */
export interface HeroDoc {
    cycle: { en: string[]; el: string[] };
    lede: {
        en: { before: string; highlight: string; after: string };
        el: { before: string; highlight: string; after: string };
    };
    meta: {
        en: { stack: string; location: string; audience: string };
        el: { stack: string; location: string; audience: string };
    };
    cta: {
        en: { primary: string; secondary: string };
        el: { primary: string; secondary: string };
    };
    updatedAt?: number;
}

/** singletons/about */
export interface AboutDoc {
    name: PerLocaleString;
    role: PerLocaleString;
    location: PerLocaleString;
    stacks: PerLocaleString;
    current: PerLocaleString;
    years: PerLocaleString;
    bio: PerLocaleString;
    intro: PerLocaleString;
    updatedAt?: number;
}

/** singletons/roadmap */
export interface RoadmapDoc {
    goal: PerLocaleString;
    target: PerLocaleString;
    intro: PerLocaleString;
    updatedAt?: number;
}

// ----------------------------------------------------------------------
// PR #66 admin-write collections — Plan C/D will surface these in the
// admin shell. Plan B declares the shapes so the admin API stops being
// schemaless and so Plan B's seed script can plant default documents.
// ----------------------------------------------------------------------

/** profile (singleton: profile/main) — Mike's portable resume fields */
export interface ProfileDoc {
    headline: PerLocaleString;
    summary: PerLocaleString;
    email: string;
    phone?: string;
    avatar?: string; // Storage path
    location: PerLocaleString;
    updatedAt?: number;
}

/** social/{id} */
export interface SocialLink {
    id: string;
    label: string; // "GitHub", "LinkedIn", "X", "Bluesky", ...
    url: string;
    icon?: string; // FontAwesome key or Lucide name
    order: number;
    visible: boolean;
}

/** experience/{id} */
export interface ExperienceEntry {
    id: string;
    role: PerLocaleString;
    company: string;
    companyUrl?: string;
    start: string; // YYYY-MM
    end?: string; // YYYY-MM | undefined when current
    summary: PerLocaleString;
    achievements?: PerLocaleString[]; // bullet list
    order: number;
}

/** skills/{id} */
export interface Skill {
    id: string;
    name: string;
    category: "language" | "framework" | "platform" | "tool" | "other";
    proficiency?: 1 | 2 | 3 | 4 | 5;
    order: number;
}

/** education/{id} */
export interface EducationEntry {
    id: string;
    institution: string;
    degree: PerLocaleString;
    field?: PerLocaleString;
    start: string;
    end?: string;
    order: number;
}

/** certifications/{id} */
export interface CertificationEntry {
    id: string;
    name: string;
    issuer: string;
    issued: string; // YYYY-MM
    expires?: string;
    credentialId?: string;
    credentialUrl?: string;
    order: number;
}

/** contact (singleton: contact/main) */
export interface ContactDoc {
    email: string;
    timezone?: string;
    availability?: PerLocaleString; // free-text status copy
    preferredChannel?: "email" | "calendar";
    calendarUrl?: string; // Calendly / Cal.com
    updatedAt?: number;
}

// ----------------------------------------------------------------------
// Plan H.3 completed the rename. `Project` / `Post` / `Task` are gone
// (interfaces above renamed in place to `Work` / `Writing` /
// `RoadmapEntry`). Server + admin + public consumers all import the
// canonical names directly. Migration scripts remain in tree under
// `scripts/migrate-collections.ts` for H.5 cleanup.
// ----------------------------------------------------------------------
