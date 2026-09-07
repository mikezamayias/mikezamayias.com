// composables/useCodexContent.ts
//
// Plan B Task 13 (rev 1.6) — public reads via the server endpoint that uses
// firebase-admin. This keeps `firebase/*` out of the public bundle. Each
// composable wraps `useAsyncData` so the request is hoisted into SSR by
// default and hydrated on the client without a refetch.
//
// SSR fetch budget: 4 seconds (see SSR_FETCH_TIMEOUT_MS below). Cold gen2
// Cloud Function (~1.2s) + cold firebase-admin init (~300ms) + Firestore
// query (~500ms) routinely exceeds 2.5s on scale-to-zero hits.
//
// Soft / hard error split: on the server, fetch failures (network blip,
// timeout, 5xx) are mapped to `null` so the page can render with whatever
// data did make it back. On the client, failures bubble up so error
// boundaries (and devtools) can react. This is intentional — partial home
// page beats no home page during cold start, but we don't want to silently
// swallow client-side bugs.
import type { Ref } from "vue";
import type {
    Locale,
    Work,
    Writing,
    RoadmapEntry,
    HeroDoc,
    AboutDoc,
    RoadmapDoc,
    ContactDoc,
    SocialLink,
    ExperienceEntry,
    Skill,
    EducationEntry,
    CertificationEntry,
} from "~/firebase/types";

// 4-second SSR fetch budget. Cold gen2 Cloud Function (~1.2s) + cold
// firebase-admin init (~300ms) + Firestore query (~500ms) routinely
// exceeds 2.5s on scale-to-zero hits.
const SSR_FETCH_TIMEOUT_MS = 4000;

function isAbortError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { name?: string; cause?: { name?: string } };
    return e.name === "AbortError" || e.cause?.name === "AbortError";
}

export async function fetchWithTimeout<T>(
    path: string,
    opts: Record<string, unknown> = {}
): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SSR_FETCH_TIMEOUT_MS);
    try {
        // Cast: $fetch<T> infers a union widened by Nitro's route type
        // registry (TypedInternalResponse) that isn't assignable back to
        // `T` despite the explicit generic. The cast narrows it back.
        return (await $fetch<T>(path, { ...opts, signal: controller.signal })) as T;
    } catch (err) {
        if (isAbortError(err)) return null;
        if (import.meta.server) {
            console.warn(`[codex] SSR fetch failed for ${path}`, err);
            return null;
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export function useHero() {
    return useAsyncData("singleton:hero", () =>
        fetchWithTimeout<HeroDoc>("/api/content/singletons/hero")
    );
}

export function useAbout() {
    return useAsyncData("singleton:about", () =>
        fetchWithTimeout<AboutDoc>("/api/content/singletons/about")
    );
}

export function useRoadmapMeta() {
    return useAsyncData("singleton:roadmap", () =>
        fetchWithTimeout<RoadmapDoc>("/api/content/singletons/roadmap")
    );
}

export function useWork(opts: { locale: Ref<Locale>; limit?: number }) {
    return useAsyncData<Work[] | null>(
        () => `work:${opts.locale.value}:${opts.limit ?? "all"}`,
        () =>
            fetchWithTimeout<Work[]>("/api/content/work", {
                query: { locale: opts.locale.value, limit: opts.limit },
            }),
        { watch: [opts.locale] }
    );
}

export function useWriting(opts: { locale: Ref<Locale>; limit?: number }) {
    return useAsyncData<Writing[] | null>(
        () => `writing:${opts.locale.value}:${opts.limit ?? "all"}`,
        () =>
            fetchWithTimeout<Writing[]>("/api/content/writing", {
                query: { locale: opts.locale.value, limit: opts.limit },
            }),
        { watch: [opts.locale] }
    );
}

export function useRoadmap(opts: { limit?: number } = {}) {
    return useAsyncData<RoadmapEntry[] | null>(`roadmap:${opts.limit ?? "all"}`, () =>
        fetchWithTimeout<RoadmapEntry[]>("/api/content/roadmap", { query: { limit: opts.limit } })
    );
}

export function useContactInfo() {
    return useAsyncData("collection:contact:main", () =>
        fetchWithTimeout<ContactDoc>("/api/content/contact/main")
    );
}

export function useSocialLinks() {
    return useAsyncData("collection:social", () =>
        fetchWithTimeout<SocialLink[]>("/api/content/social")
    );
}

export function useExperience() {
    return useAsyncData("collection:experience", () =>
        fetchWithTimeout<ExperienceEntry[]>("/api/content/experience")
    );
}

export function useSkills() {
    return useAsyncData("collection:skills", () =>
        fetchWithTimeout<Skill[]>("/api/content/skills")
    );
}

export function useEducation() {
    return useAsyncData("collection:education", () =>
        fetchWithTimeout<EducationEntry[]>("/api/content/education")
    );
}

export function useCertifications() {
    return useAsyncData("collection:certifications", () =>
        fetchWithTimeout<CertificationEntry[]>("/api/content/certifications")
    );
}

export function useWorkEntry(slug: Ref<string>) {
    return useAsyncData<Work | null>(
        () => `work:${slug.value}`,
        () => fetchWithTimeout<Work>(`/api/content/work/${slug.value}`),
        { watch: [slug] }
    );
}

export function useWritingEntry(slug: Ref<string>) {
    return useAsyncData<Writing | null>(
        () => `writing:${slug.value}`,
        () => fetchWithTimeout<Writing>(`/api/content/writing/${slug.value}`),
        { watch: [slug] }
    );
}
