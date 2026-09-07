import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { FieldValue } from "firebase-admin/firestore";
import { useFirebaseAdmin } from "../../../utils/firebase";
import { verifyAdmin } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
    await verifyAdmin(event);

    const id = getRouterParam(event, "id") ?? "";
    if (!id) {
        throw createError({ statusCode: 400, message: "Missing message id" });
    }

    const body = (await readBody(event)) as { read?: unknown } | null;
    if (!body || typeof body.read !== "boolean") {
        throw createError({ statusCode: 400, message: "Expected boolean read field" });
    }

    const { firestore } = useFirebaseAdmin();
    await firestore.collection("messages").doc(id).set(
        {
            read: body.read,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    return { success: true, id };
});
