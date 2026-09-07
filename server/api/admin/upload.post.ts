import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nuxt";
import { verifyAdmin } from "../../utils/auth";
import { sniffImageMime } from "../../utils/magic-bytes";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DOC_ID_REGEX = /^[a-z0-9-]+$/;
const TARGETS = new Set(["work", "writing"]);
type MultipartPart = NonNullable<Awaited<ReturnType<typeof readMultipartFormData>>>[number];

function fieldValue(parts: MultipartPart[], name: string) {
    const part = parts.find((item) => item.name === name && !item.filename);
    if (!part?.data) return undefined;
    return part.data.toString("utf-8").trim();
}

function imageFile(parts: MultipartPart[]) {
    return parts.find((part) => part.name === "file" && part.filename);
}

function assertUploadTarget(target: string) {
    if (!TARGETS.has(target)) {
        throw createError({ statusCode: 400, message: "Invalid upload target" });
    }
}

function assertDocumentId(docId: string | undefined): asserts docId is string {
    if (!docId) {
        throw createError({ statusCode: 400, message: "Missing document id" });
    }
    if (!DOC_ID_REGEX.test(docId)) {
        throw createError({ statusCode: 400, message: "Invalid document id" });
    }
}

function slugifyFileName(input: string) {
    const fallback = "image";
    const clean = input
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return clean || fallback;
}

function extensionForMime(mime: string) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "jpg";
}

function storageUrl(bucket: string, path: string, token: string) {
    const encodedPath = encodeURIComponent(path);
    const encodedToken = encodeURIComponent(token);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${encodedToken}`;
}

export default defineEventHandler(async (event) => {
    const caller = await verifyAdmin(event);
    const config = useRuntimeConfig();
    const parts = await readMultipartFormData(event);

    if (!parts?.length) {
        throw createError({ statusCode: 400, message: "Missing multipart body" });
    }

    const target = fieldValue(parts, "target") ?? "";
    const docId = fieldValue(parts, "docId");
    const file = imageFile(parts);

    assertUploadTarget(target);
    assertDocumentId(docId);
    if (!file?.data?.length || !file.filename) {
        throw createError({ statusCode: 400, message: "Missing image file" });
    }
    if (file.data.byteLength > MAX_IMAGE_BYTES) {
        throw createError({ statusCode: 413, message: "Image must be 5 MB or smaller" });
    }

    const mime = sniffImageMime(file.data);
    if (!mime) {
        throw createError({
            statusCode: 415,
            message: "Only PNG, JPEG, and WebP images are allowed",
        });
    }

    const bucketName = config.public.firebaseStorageBucket as string | undefined;
    const bucket = bucketName ? getStorage().bucket(bucketName) : getStorage().bucket();
    const safeName = slugifyFileName(file.filename);
    const path = `${target}/${docId}/${Date.now()}-${safeName}.${extensionForMime(mime)}`;
    const downloadToken = randomUUID();

    try {
        await bucket.file(path).save(file.data, {
            resumable: false,
            metadata: {
                contentType: mime,
                cacheControl: "public, max-age=31536000, immutable",
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken,
                    uploadedBy: caller.uid,
                },
            },
        });
    } catch (error) {
        Sentry.captureException(error, {
            tags: { route: "admin-upload" },
            extra: { target, docId, uid: caller.uid },
        });
        throw createError({ statusCode: 502, message: "Failed to upload image" });
    }

    return {
        path,
        url: storageUrl(bucket.name, path, downloadToken),
        mime,
        size: file.data.byteLength,
    };
});
