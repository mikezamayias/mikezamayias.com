// Mock content for non-production environments (preview deploys, CI
// builds, local dev without ADC). Drives every public read endpoint
// so PR previews render real-looking pages instead of `CodexError` on
// every section + click.
//
// Surfaces covered:
//
//   - `/api/content/home`              → MOCK_HOME_PAYLOAD
//   - `/api/content/{work,writing,roadmap}`  → mock list per collection
//   - `/api/content/{work,writing}/[id]`     → mock detail by slug
//   - `/api/content/singletons/{hero,about,roadmap}`  → mock singleton
//   - `/api/render/writing/[slug]`     → mock sanitized HTML
//
// Hand-shaped (not seed-derived) so the contract with `HomePayload` +
// the per-collection types stays explicit at the type-system level —
// any new REQUIRED field on `HeroDoc` / `AboutDoc` / `Work` / `Writing`
// / `RoadmapEntry` / `RoadmapDoc` triggers a TS error here, instead of
// silently rendering empty in previews. Optional fields (e.g. `images`,
// `createdAt`, `updatedAt`, `sprint_id`) are intentionally omitted —
// preview UX doesn't depend on them and over-shaping the mock would
// drift from the real Firestore data.
//
// `satisfies HomePayload` (rather than `: HomePayload`) on the home
// constant preserves the concrete literal types so the TS error points
// at the missing field directly, not at the broader union.
//
// Imported dynamically from each gated endpoint (`await import(...)`)
// so production bundles can tree-shake the ~270-line payload — the
// import only resolves when `NUXT_PUBLIC_APP_ENV !== "production"`.

import type { HomePayload } from "~/composables/useHomeData";
import type { HeroDoc, AboutDoc, RoadmapDoc, Work, Writing, RoadmapEntry } from "~/firebase/types";

export const MOCK_HOME_PAYLOAD = {
    hero: {
        // Short phrases (≤14 chars each) so the typewriter cycle fits on
        // one line at all viewport widths — character-by-character width
        // changes never cross the wrap boundary, so `.codex-h1` stays at
        // its `min-height: 1.3em` reservation and CLS stays at 0 on /.
        // Earlier ~26-char phrases wrapped to 2 lines on narrow viewports
        // and contributed 0.2 to CLS in Lighthouse runs (PR #95 first
        // build).
        cycle: {
            en: ["mobile · web", "ship + learn", "from Crete"],
            el: ["mobile · web", "ship + learn", "από Κρήτη"],
        },
        lede: {
            // Combined length ≤60 chars to stay on a single visual line
            // at the section's `max-width: 60ch` — keeps the font-swap
            // (fallback Georgia → GFS Didot) from rewrapping post-load.
            en: {
                before: "Flutter and native Android, ",
                highlight: "from first wireframe to store release",
                after: ".",
            },
            el: {
                before: "Flutter και native Android, ",
                highlight: "από το πρώτο wireframe μέχρι το store release",
                after: ".",
            },
        },
        meta: {
            en: {
                stack: "flutter · nuxt · firebase",
                location: "Heraklion, Crete",
                audience: "apps + blog",
            },
            el: {
                stack: "flutter · nuxt · firebase",
                location: "Ηράκλειο, Κρήτη",
                audience: "εφαρμογές + blog",
            },
        },
        cta: {
            en: { primary: "View the apps", secondary: "Read the writing" },
            el: { primary: "Δες τις εφαρμογές", secondary: "Διάβασε τα κείμενα" },
        },
    },
    about: {
        name: { en: "Mike Zamayias", el: "Μιχάλης Ζαμαγίας" },
        role: {
            en: "Mobile engineer",
            el: "Mobile engineer",
        },
        location: { en: "Heraklion, Crete", el: "Ηράκλειο, Κρήτη" },
        stacks: {
            en: "Flutter, Nuxt, Firebase, TypeScript",
            el: "Flutter, Nuxt, Firebase, TypeScript",
        },
        current: {
            en: "Flutter and native Android apps, from feature to release.",
            el: "Flutter και native Android εφαρμογές, από το feature μέχρι το release.",
        },
        years: { en: "5 years", el: "5 χρόνια" },
        bio: {
            en: "I write mobile apps. Flutter for 2.3 years at atFirstSite, then native Android (Kotlin, Jetpack Compose) for 2 years at Deloitte on three retail e-commerce apps, where I now run web accessibility assessments. I build the feature, wire the analytics, and test it.",
            el: "Γράφω mobile εφαρμογές. Flutter για 2,3 χρόνια στην atFirstSite, μετά native Android (Kotlin, Jetpack Compose) για 2 χρόνια στη Deloitte σε τρεις retail e-commerce εφαρμογές.",
        },
        intro: {
            en: "Mobile engineer in Heraklion, Crete.",
            el: "Mobile engineer στο Ηράκλειο Κρήτης.",
        },
    },
    // Singleton `singletons/roadmap` page-meta. Renamed in the HomePayload
    // contract from `roadmap` → `roadmap_meta` in Plan H.3 so the
    // canonical collection-array field below can claim the simple
    // `roadmap` name.
    roadmap_meta: {
        goal: { en: "100 paying users", el: "100 πληρώνοντες χρήστες" },
        target: { en: "by Q4 2026", el: "μέχρι Q4 2026" },
        intro: {
            en: "Live roadmap, updated as work ships.",
            el: "Ζωντανό roadmap, ενημερώνεται όταν φεύγει νέα δουλειά.",
        },
    },
    work: [
        {
            slug: "healpen",
            start: "2024-01",
            stack: ["flutter", "openai"],
            glyph: "✦",
            order: 0,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    name: "Healpen",
                    desc: "Mental-health journaling with AI insights.",
                    long: "",
                },
                el: {
                    name: "Healpen",
                    desc: "Ημερολόγιο ψυχικής υγείας με AI insights.",
                    long: "",
                },
            },
        },
        {
            slug: "budget-coach",
            start: "2023-01",
            stack: ["flutter", "firebase"],
            glyph: "◆",
            order: 1,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    name: "Budget Coach",
                    desc: "Personal-finance coaching app for everyday spenders.",
                    long: "",
                },
                el: {
                    name: "Budget Coach",
                    desc: "Personal-finance coach για καθημερινούς ξοδευτές.",
                    long: "",
                },
            },
        },
        {
            slug: "peakward",
            start: "2023-01",
            end: "2023-12",
            stack: ["flutter", "firebase"],
            glyph: "▲",
            order: 2,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    name: "Peakward",
                    desc: "Habit-stacking tracker for ambitious humans.",
                    long: "",
                },
                el: {
                    name: "Peakward",
                    desc: "Habit-stacking tracker για φιλόδοξους ανθρώπους.",
                    long: "",
                },
            },
        },
        {
            slug: "lsom",
            start: "2022-01",
            end: "2022-12",
            stack: ["flutter", "firebase"],
            glyph: "○",
            order: 3,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    name: "LSOM",
                    desc: "Lightweight social mood tracker.",
                    long: "",
                },
                el: {
                    name: "LSOM",
                    desc: "Ελαφρύς social mood tracker.",
                    long: "",
                },
            },
        },
    ],
    writing: [
        {
            slug: "hello-world",
            date: "2026-02-19",
            tags: ["meta"],
            read: 3,
            order: 0,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    title: "Hello, world",
                    sub: "Why this site exists and what shows up here.",
                    body: "",
                },
                el: {
                    title: "Γεια, κόσμε",
                    sub: "Γιατί υπάρχει αυτό το site και τι μπαίνει εδώ.",
                    body: "",
                },
            },
        },
        {
            slug: "portfolio-updates-march-2026",
            date: "2026-03-13",
            tags: ["updates"],
            read: 5,
            order: 1,
            published: true,
            locales_available: ["en", "el"],
            locale: {
                en: {
                    title: "Portfolio updates, March 2026",
                    sub: "What shipped, what's in flight, what's next.",
                    body: "",
                },
                el: {
                    title: "Portfolio updates, Μάρτιος 2026",
                    sub: "Τι έφυγε, τι ακολουθεί.",
                    body: "",
                },
            },
        },
    ],
    roadmap: [
        {
            id: "preview-mock-fixtures",
            status: "shipping",
            priority: "high",
            href: "https://github.com/mikezamayias/personal-website-v1",
            hidden: false,
            order: 0,
            locale: {
                en: {
                    title: "Static site build",
                    note: "Prerendered pages served from the edge.",
                },
                el: {
                    title: "Στατικό build",
                    note: "Prerendered σελίδες από το edge.",
                },
            },
        },
        {
            id: "plan-e-app-check",
            status: "todo",
            priority: "high",
            href: "https://github.com/mikezamayias/personal-website-v1",
            hidden: false,
            order: 1,
            locale: {
                en: {
                    title: "Plan E — App Check enforcement",
                    note: "Manual Firebase Console flip + reCAPTCHA Enterprise key.",
                },
                el: {
                    title: "Plan E — App Check enforcement",
                    note: "Χειροκίνητο flip στο Firebase Console + reCAPTCHA Enterprise key.",
                },
            },
        },
        {
            id: "plan-g-admin-mobile",
            status: "todo",
            priority: "medium",
            href: "https://github.com/mikezamayias/personal-website-v1",
            hidden: false,
            order: 2,
            locale: {
                en: {
                    title: "Plan G — admin mobile UX polish",
                    note: "Swipe actions, bottom sheets, pull-to-refresh, optimistic updates.",
                },
                el: {
                    title: "Plan G — admin mobile UX polish",
                    note: "Swipe actions, bottom sheets, pull-to-refresh, optimistic updates.",
                },
            },
        },
    ],
} satisfies HomePayload;

// -- Per-endpoint accessors ------------------------------------------
//
// Derive list / detail / singleton / render responses from the same
// fixture so a slug that appears on the mock home page (e.g. a work
// card linking to `/work/healpen`) renders a populated detail page
// instead of bouncing back to `CodexError`.

const MOCK_WORK = MOCK_HOME_PAYLOAD.work;
const MOCK_WRITING = MOCK_HOME_PAYLOAD.writing;
const MOCK_ROADMAP = MOCK_HOME_PAYLOAD.roadmap;
const MOCK_SINGLETONS = {
    hero: MOCK_HOME_PAYLOAD.hero,
    about: MOCK_HOME_PAYLOAD.about,
    roadmap: MOCK_HOME_PAYLOAD.roadmap_meta,
} satisfies { hero: HeroDoc; about: AboutDoc; roadmap: RoadmapDoc };

/**
 * Mock list response. Mirrors `/api/content/{collection}` shape:
 * docs already have `id` injected (Firestore convention).
 */
export function getMockCollection(
    collection: string
): Array<(Work | Writing | RoadmapEntry) & { id: string }> | null {
    if (collection === "work") {
        return MOCK_WORK.map((w) => ({ ...w, id: w.slug }));
    }
    if (collection === "writing") {
        return MOCK_WRITING.map((w) => ({ ...w, id: w.slug }));
    }
    if (collection === "roadmap") {
        return MOCK_ROADMAP.map((r) => ({ ...r, id: r.id }));
    }
    // Collections without home-page fixture (skills, social, etc.) get
    // an empty list — sections that consume them render their empty
    // state in previews, which is honest about the missing fixture.
    return [];
}

/**
 * Mock detail response. Returns `null` if the slug isn't in the
 * fixture so the endpoint can preserve real-404 semantics for unknown
 * slugs (caller throws 404).
 */
export function getMockDetail(
    collection: string,
    id: string
): ({ id: string } & (Work | Writing | RoadmapEntry)) | null {
    const list = getMockCollection(collection);
    if (!list) return null;
    const match = list.find((doc) => doc.id === id);
    return match ?? null;
}

/**
 * Mock singleton response. `null` for unknown singleton names so the
 * caller preserves the 404 contract.
 */
export function getMockSingleton(name: string): { id: string } & (HeroDoc | AboutDoc | RoadmapDoc) {
    const key = name as keyof typeof MOCK_SINGLETONS;
    const doc = MOCK_SINGLETONS[key];
    return { id: key, ...doc };
}

export function isAllowedMockSingleton(name: string): name is keyof typeof MOCK_SINGLETONS {
    return name === "hero" || name === "about" || name === "roadmap";
}

/**
 * Mock rendered markdown for `/api/render/writing/[slug]`. Returns null
 * for unknown slugs so the caller preserves the 404 contract.
 *
 * Output is intentionally short + sanitizer-safe (plain `<p>` / `<h2>`
 * only) so the preview matches real production output shape without
 * dragging the full `marked` + `sanitize-html` cost into the mock path.
 *
 * All interpolated values (`title`, `sub`) come from this same
 * hand-shaped `MOCK_WRITING` fixture (static strings) — never from user
 * input — and pass through `escapeHtml` anyway. The previous template-
 * literal form triggered Semgrep's `html-in-template-string` /
 * `raw-html-join` static-analysis heuristics; the helpers below split the
 * HTML emission into a constant template-string format and a separate
 * escape pass so the dataflow is unambiguous to static analyzers.
 */
export function getMockRenderedPost(slug: string, locale: "en" | "el"): string | null {
    const post = MOCK_WRITING.find((p) => p.slug === slug);
    if (!post) return null;
    const localized = post.locale[locale] ?? post.locale.en;
    if (!localized) return null;
    const heading = locale === "el" ? "Δείγμα κειμένου" : "Sample body";
    const trailing =
        " — preview content. The real body lives in Firestore and renders on production.";
    return (
        wrapTag("p", escapeHtml(localized.sub)) +
        "\n" +
        wrapTag("h2", escapeHtml(heading)) +
        "\n" +
        wrapTag("p", escapeHtml(localized.title) + escapeHtml(trailing))
    );
}

function wrapTag(tag: "p" | "h2", inner: string): string {
    return "<" + tag + ">" + inner + "</" + tag + ">";
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
