import { defineEventHandler, getQuery } from "h3";
import { useFirebaseAdmin } from "../../../utils/firebase";
import { verifyAdmin } from "../../../utils/auth";
import { serializeFirestoreData } from "../../../utils/firestore-serialize";

function parseLimit(raw: unknown): number {
    if (typeof raw !== "string") return 50;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 50;
    return Math.min(100, Math.floor(n));
}

export default defineEventHandler(async (event) => {
    await verifyAdmin(event);

    const { limit } = getQuery(event);
    const { firestore } = useFirebaseAdmin();
    const snap = await firestore
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(parseLimit(limit))
        .get();

    return snap.docs.map((doc) => serializeFirestoreData({ id: doc.id, ...doc.data() }));
});
