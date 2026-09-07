// utils/adminFirestore.ts
//
// Reuse whatever Firestore instance the admin plugin already wired
// (persistent local cache, single-tab manager). The public-side
// `getRealtimeFirestore` calls `initializeFirestore` itself; admin must
// not — it would conflict with the plugin's settings.

export async function getAdminFirestore() {
    const { getFirestore } = await import("firebase/firestore");
    const app = await useFirebaseApp();
    return getFirestore(app);
}
