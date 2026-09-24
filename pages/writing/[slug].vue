<script setup lang="ts">
    import { computed } from "vue";
    import { useRoute } from "vue-router";
    import SkeletonRow from "~/components/codex/SkeletonRow.vue";
    import CodexError from "~/components/codex/CodexError.vue";

    // Plan B Task 17 (rev 1.6): /writing/[slug] — writing detail with
    // server-rendered markdown HTML.
    const route = useRoute();
    const { locale, t } = useI18n();
    const slug = computed(() => String(route.params.slug));
    const { data: writing, pending, error, refresh } = useWritingEntry(slug);

    // Build the meta line once so we can hide it entirely when admin
    // clears every field that would have contributed (date, read time,
    // every tag). Same pattern as `pages/work/[slug].vue` — keeps the
    // public page from rendering bare " · " separators.
    const metaLine = computed(() => {
        if (!writing.value) return "";
        const parts: string[] = [];
        if (writing.value.date) parts.push(writing.value.date);
        if (typeof writing.value.read === "number") parts.push(`${writing.value.read} min`);
        if (writing.value.tags?.[0]) parts.push(writing.value.tags[0]);
        return parts.join(" · ");
    });

    // rev 1.3 perf MEDIUM: server-rendered markdown means we fetch the
    // sanitized HTML, NOT the raw markdown body. The writing.locale[*].body
    // is still in the payload (admin shell needs it for editing). The
    // public detail page hits /api/render/writing/<slug>?locale= for the
    // sanitized HTML.
    const { data: renderedHtml } = await useAsyncData(
        () => `render:writing:${slug.value}:${locale.value}`,
        () =>
            $fetch<string>(`/api/render/writing/${slug.value}`, {
                query: { locale: locale.value },
            }).catch(() => ""),
        { watch: [slug, locale] }
    );

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: () =>
            writing.value
                ? `${writing.value.locale?.[locale.value]?.title ?? writing.value.slug} · Mike Zamayias`
                : "Writing · Mike Zamayias",
        description: () =>
            writing.value?.locale?.[locale.value]?.sub ??
            "A blog post by Mike Zamayias on building and shipping mobile apps.",
    });
</script>

<template>
    <main id="main" role="main" class="codex-container">
        <SkeletonRow v-if="pending && !writing" :rows="6" variant="writing" />
        <CodexError v-else-if="error" :error="error" :retry="refresh" />
        <article v-else-if="writing">
            <p v-if="metaLine" class="codex-meta-line">{{ metaLine }}</p>
            <h1 class="codex-h1-page">
                {{ writing.locale?.[locale]?.title ?? writing.slug }}
            </h1>
            <p v-if="writing.locale?.[locale]?.sub" class="codex-sub">
                {{ writing.locale?.[locale]?.sub }}
            </p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="renderedHtml" class="codex-prose" v-html="renderedHtml" />
            <p v-else class="codex-body-unavailable" role="status">
                {{ t("page.writing.bodyUnavailable") }}
            </p>
        </article>
        <p v-else>{{ t("page.writing.notFound") }}</p>
    </main>
</template>

<style scoped>
    .codex-meta-line {
        font-family: var(--font-mono);
        color: var(--soft);
        margin-top: 4rem;
    }
    .codex-h1-page {
        font-family: var(--font-display);
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 0.5rem 0 1rem;
    }
    .codex-sub {
        font-size: 1.125rem;
        color: var(--soft);
        margin-bottom: 2rem;
    }
    .codex-prose {
        max-width: 38rem;
        line-height: 1.7;
    }
    .codex-body-unavailable {
        max-width: 38rem;
        color: var(--soft);
        font-style: italic;
        margin-top: 2rem;
    }
    .codex-prose :deep(h2) {
        font-family: var(--font-display);
        margin: 2.5rem 0 1rem;
    }
    /* Drop-cap on the first paragraph of the post body — design spec
     * §4.3 ("First paragraph has the drop-cap"). The `>` direct-child
     * combinator scopes the rule to top-level <p> inside .codex-prose
     * so a sanitized post that opens with <blockquote><p>…</p></blockquote>
     * does NOT get a drop-cap inside the quote. `:first-of-type` then
     * picks the first <p> sibling regardless of preceding non-<p>
     * elements (figcaption, hr) the sanitizer may emit.
     *
     * `line-height: 0.9` + `margin-top: 0.05em` keeps the cap from
     * clipping the tonos on accented Greek capitals (Ά, Ή, Ώ) which
     * lead bodies in the EL locale and from crowding the sub above
     * when the H1 `clamp(2rem, 6vw, 3.5rem)` shrinks on narrow
     * viewports. No font-weight override — GFS Didot only ships 400
     * (see nuxt.config.ts googleFonts.families) so any higher value
     * would force synthetic bold. */
    .codex-prose > :deep(p:first-of-type)::first-letter {
        font-family: var(--font-display);
        font-size: 3.25em;
        line-height: 0.9;
        float: left;
        margin: 0.05em 0.15em 0 0;
        color: var(--accent);
    }
    .codex-prose :deep(pre) {
        background: var(--paper-deep);
        padding: 1rem;
        overflow-x: auto;
    }
    .codex-prose :deep(code) {
        font-family: var(--font-mono);
        background: var(--paper-deep);
        padding: 0.125rem 0.375rem;
    }
    .codex-prose :deep(blockquote) {
        border-left: 2px solid var(--accent);
        padding-left: 1rem;
        color: var(--soft);
    }
</style>
