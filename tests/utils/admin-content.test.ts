import { describe, expect, it } from "vitest";
import {
    defaultDocumentId,
    getByPath,
    setByPath,
    type AdminCollectionDefinition,
} from "~/utils/adminContent";

const writingDefinition = {
    route: "writing",
    collection: "writing",
    label: "Writing",
    plural: "Writing",
    idField: "slug",
    description: "",
    fields: [],
    create: () => ({}),
    prepare: (doc: Record<string, unknown>) => doc,
    title: () => "",
    subtitle: () => "",
} satisfies AdminCollectionDefinition;

describe("admin content path helpers", () => {
    it("blocks prototype pollution path segments", () => {
        const target: Record<string, unknown> = {};

        expect(() => setByPath(target, "__proto__.polluted", true)).toThrow(
            "Unsafe admin field path"
        );
        expect(getByPath(target, "__proto__.polluted")).toBeUndefined();
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it("creates deterministic ids for non-Latin titles", () => {
        const id = defaultDocumentId(writingDefinition, {
            locale: { en: { title: "Καλημέρα" } },
        });

        expect(id).toMatch(/^doc-[a-z0-9-]+$/);
        expect(id.length).toBeGreaterThan(4);
    });
});
