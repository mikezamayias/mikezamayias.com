import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const useFirebaseAdmin = () => {
    // `useRuntimeConfig` is treated as a hook by lint rules (use-prefix). Pull
    // it at the top so it always runs in a stable order.
    const config = useRuntimeConfig();
    const apps = getApps();

    if (apps.length === 0) {
        // In Cloud Functions Gen2 the metadata server supplies credentials and
        // projectId. Outside that (local dev, `nuxt build` prerender, CI smoke)
        // the project ID isn't detectable without ADC, so the first Firestore
        // call throws "Unable to detect a Project Id". Seed projectId from the
        // public runtime config when available so init survives those paths;
        // queries still fail without credentials, but the error surface stays
        // contained inside the call instead of crashing the handler.
        const projectId = config.public.firebaseProjectId;
        initializeApp(projectId ? { projectId } : undefined);
    }

    return {
        auth: getAuth(),
        firestore: getFirestore(),
    };
};
