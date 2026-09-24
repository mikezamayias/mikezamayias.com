<script setup lang="ts">
    import { faArrowLeft, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
    import CodexError from "~/components/codex/CodexError.vue";
    import LetterIcon from "~/components/letter/LetterIcon.vue";
    import { formatWorkFacts, formatWorkRange } from "~/utils/workFormat";

    // /work/<slug>: one entry. The long copy is plain text from admin;
    // a paragraph whose lines all start with "- " becomes a bullet list.
    const route = useRoute();
    const { locale, t } = useI18n();
    const localePath = useLocalePath();
    const slug = computed(() => String(route.params.slug));
    const { data: work, error, refresh } = await useWorkEntry(slug);

    const copy = computed(() => work.value?.locale?.[locale.value] ?? null);
    const name = computed(() => copy.value?.name ?? work.value?.slug ?? "");
    const facts = computed(() => (work.value ? formatWorkFacts(work.value, t) : ""));
    const range = computed(() => (work.value ? formatWorkRange(work.value) : ""));

    type Block = { kind: "list"; items: string[] } | { kind: "para"; text: string };
    const blocks = computed<Block[]>(() =>
        (copy.value?.long ?? "")
            .split(/\n\s*\n/)
            .map((chunk) => chunk.trim())
            .filter(Boolean)
            .map((chunk) => {
                const lines = chunk.split("\n").map((line) => line.trim());
                return lines.every((line) => line.startsWith("- "))
                    ? { kind: "list", items: lines.map((line) => line.slice(2)) }
                    : { kind: "para", text: lines.join(" ") };
            })
    );

    const hostOf = (url: string) => {
        try {
            return new URL(url).host.replace(/^www\./, "");
        } catch {
            return url;
        }
    };

    const head = useLocaleHead();
    useHead(head);

    useSeoMeta({
        title: () => (work.value ? `${name.value} · Mike Zamayias` : "Work · Mike Zamayias"),
        description: () => copy.value?.desc ?? t("page.work.description"),
    });
</script>

<template>
    <main id="main" class="page">
        <NuxtLink :to="localePath('/work')" class="page-back">
            <LetterIcon :icon="faArrowLeft" />{{ t("page.work.back") }}
        </NuxtLink>

        <CodexError v-if="error" :error="error" :retry="refresh" />
        <article v-else-if="work">
            <h1 class="page-title">{{ name }}</h1>
            <p v-if="facts || range" class="page-facts">
                {{ facts }}<br v-if="facts && range" />{{ range }}
            </p>
            <p v-if="copy?.desc" class="page-lede">{{ copy.desc }}</p>
            <template v-for="(block, i) in blocks" :key="i">
                <ul v-if="block.kind === 'list'" class="page-bullets">
                    <li v-for="item in block.items" :key="item">{{ item }}</li>
                </ul>
                <p v-else>{{ block.text }}</p>
            </template>
            <ul v-if="work.links?.length" class="page-pills">
                <li v-for="(link, i) in work.links" :key="link.url">
                    <a
                        class="page-pill"
                        :class="{ 'page-pill--quiet': i > 0 }"
                        :href="link.url"
                        target="_blank"
                        rel="noopener"
                        >{{ link.label || hostOf(link.url)
                        }}<LetterIcon :icon="faArrowUpRightFromSquare"
                    /></a>
                </li>
            </ul>
        </article>
        <p v-else class="page-empty">{{ t("page.work.notFound") }}</p>
    </main>
</template>
