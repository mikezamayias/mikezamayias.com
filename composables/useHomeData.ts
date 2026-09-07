// composables/useHomeData.ts
//
// Plan B Task 13 (rev 1.6) — single-roundtrip home-page payload. Hits the
// batched /api/content/home endpoint that fans out 6 reads to firebase-admin
// in parallel (Promise.allSettled — partial payload beats nothing on a
// transient Firestore blip). Section components consume the shared handle
// via `inject(HOME_DATA_KEY)` instead of refetching.
import type { Ref, InjectionKey } from "vue";
import type {
    Locale,
    Work,
    Writing,
    RoadmapEntry,
    HeroDoc,
    AboutDoc,
    RoadmapDoc,
} from "~/firebase/types";
import { fetchWithTimeout } from "./useCodexContent";

export interface HomePayload {
    hero: HeroDoc | null;
    about: AboutDoc | null;
    // `singletons/roadmap` — page-meta (goal/target/intro) for the roadmap
    // section. Renamed from `roadmap` to `roadmap_meta` in Plan H.3 so
    // the canonical collection-array field below can claim the simple
    // `roadmap` name. Same Firestore path; payload-only rename.
    roadmap_meta: RoadmapDoc | null;
    work: Work[];
    writing: Writing[];
    roadmap: RoadmapEntry[];
}

export type HomeHandle = ReturnType<typeof useHomeData>;

// rev 1.6: typed Symbol inject key prevents collision with any other
// provide("home-data") in the app. Section components import HOME_DATA_KEY
// rather than reaching for a magic string.
export const HOME_DATA_KEY: InjectionKey<HomeHandle> = Symbol("codex:home-data");

export function useHomeData(locale: Ref<Locale>) {
    return useAsyncData<HomePayload | null>(
        () => `home:${locale.value}`,
        () =>
            fetchWithTimeout<HomePayload>("/api/content/home", {
                query: { locale: locale.value },
            }),
        { watch: [locale] }
    );
}
