// firebase/db.ts
import { collection, doc, type Firestore, type FirestoreDataConverter } from "firebase/firestore";
import type { Work, Writing, RoadmapEntry, HeroDoc, AboutDoc, RoadmapDoc } from "./types";

export const PATHS = {
    work: "work",
    writing: "writing",
    // Roadmap-entries collection. Distinct from `singletons/roadmap`
    // (the page-meta singleton) which lives under the `singletons/`
    // parent so the names don't actually collide in Firestore.
    roadmap: "roadmap",
    singletons: {
        hero: ["singletons", "hero"] as const,
        about: ["singletons", "about"] as const,
        roadmap: ["singletons", "roadmap"] as const,
    },
} as const;

function makeConverter<T>(): FirestoreDataConverter<T> {
    return {
        toFirestore: (data: T) => data as Record<string, unknown>,
        fromFirestore: (snapshot, options) => snapshot.data(options) as T,
    };
}

export const workConverter = makeConverter<Work>();
export const writingConverter = makeConverter<Writing>();
export const roadmapEntryConverter = makeConverter<RoadmapEntry>();
export const heroConverter = makeConverter<HeroDoc>();
export const aboutConverter = makeConverter<AboutDoc>();
export const roadmapConverter = makeConverter<RoadmapDoc>();

export const collections = (db: Firestore) => ({
    work: collection(db, PATHS.work).withConverter(workConverter),
    writing: collection(db, PATHS.writing).withConverter(writingConverter),
    roadmap: collection(db, PATHS.roadmap).withConverter(roadmapEntryConverter),
});

export const docs = (db: Firestore) => ({
    hero: doc(db, ...PATHS.singletons.hero).withConverter(heroConverter),
    about: doc(db, ...PATHS.singletons.about).withConverter(aboutConverter),
    roadmap: doc(db, ...PATHS.singletons.roadmap).withConverter(roadmapConverter),
});
