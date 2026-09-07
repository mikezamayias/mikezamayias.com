import { createError, getHeader, type H3Event } from "h3";
import { useFirebaseAdmin } from "./firebase";

/**
 * Verifies the Firebase ID token in the `Authorization: Bearer <token>` header
 * and confirms the caller is an admin (uid present in
 * `/settings/main.allowedAdminIds`). Throws 401 if missing/invalid token,
 * 403 if not admin.
 */
export async function verifyAdmin(event: H3Event): Promise<{ uid: string; email?: string }> {
    const header = getHeader(event, "authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        throw createError({ statusCode: 401, message: "Missing bearer token" });
    }

    const { auth, firestore } = useFirebaseAdmin();
    let decoded: Awaited<ReturnType<typeof auth.verifyIdToken>>;
    try {
        decoded = await auth.verifyIdToken(match[1] ?? "", true); // checkRevoked
    } catch {
        throw createError({ statusCode: 401, message: "Invalid token" });
    }

    const settings = await firestore.collection("settings").doc("main").get();
    const allowed =
        (settings.exists
            ? (settings.data()?.allowedAdminIds as string[] | undefined)
            : undefined) ?? [];
    if (!allowed.includes(decoded.uid)) {
        throw createError({ statusCode: 403, message: "Not an admin" });
    }
    return { uid: decoded.uid, email: decoded.email };
}
