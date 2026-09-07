import { createError } from "h3";
import {
    ALLOWED_CONTENT_COLLECTIONS,
    type AllowedCollection,
    PUBLIC_READABLE,
    type PublicReadableCollection,
    isPublicReadable,
    PUBLISHED_FILTERED,
    TASK_HIDDEN_FILTERED,
    isPubliclyVisible,
    filterPublic,
} from "../../shared/content-collections";

export {
    ALLOWED_CONTENT_COLLECTIONS,
    type AllowedCollection,
    PUBLIC_READABLE,
    type PublicReadableCollection,
    isPublicReadable,
    PUBLISHED_FILTERED,
    TASK_HIDDEN_FILTERED,
    isPubliclyVisible,
    filterPublic,
};

export function assertAllowedCollection(name: string): AllowedCollection {
    if (!(ALLOWED_CONTENT_COLLECTIONS as readonly string[]).includes(name)) {
        throw createError({
            statusCode: 404,
            message: `Unknown content collection: ${name}`,
        });
    }
    return name as AllowedCollection;
}

export function assertPublicReadable(name: string): PublicReadableCollection {
    const collection = assertAllowedCollection(name);
    if (!isPublicReadable(collection)) {
        // Same 404 shape as `assertAllowedCollection` so anonymous callers
        // cannot distinguish "collection unknown" from "collection admin-only".
        throw createError({
            statusCode: 404,
            message: `Unknown content collection: ${name}`,
        });
    }
    return collection;
}
