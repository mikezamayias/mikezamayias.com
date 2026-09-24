<template>
    <!--
        The public frame, in the letter style of the home page: a short
        bar (the mark and name back home, then the sections), the sheet
        the page is written on, and a footer. It sits outside the
        `<NuxtPage>` transition in app.vue, so only the sheet's content
        fades between routes. Styles live in assets/css/letter-pages.css.

        The home page draws its own letterhead (`layout: false`); admin
        uses layouts/admin.vue; error.vue wraps itself in this layout.
    -->
    <div class="page-frame">
        <header class="page-bar">
            <NuxtLink :to="localePath('/')" class="page-brand">
                <LetterMark />
                <span>Mike Zamayias</span>
            </NuxtLink>
            <nav :aria-label="t('a11y.primaryNav')">
                <NuxtLink
                    v-for="item in navItems"
                    :key="item.key"
                    :to="item.to"
                    :class="{ 'is-current': isCurrent(item.to) }"
                >
                    {{ t(`nav.${item.key}`) }}
                </NuxtLink>
            </nav>
        </header>
        <div class="page-sheet">
            <slot />
        </div>
        <footer class="page-footer">
            <span>© {{ year }} Mike Zamayias</span>
            <a href="/rss.xml">{{ t("letter.note.feed") }}</a>
        </footer>
    </div>
</template>

<script setup lang="ts">
    import LetterMark from "~/components/letter/LetterMark.vue";

    const { t } = useI18n();
    const localePath = useLocalePath();
    const year = useState("page-footer-year", () => new Date().getFullYear());

    useHead({ bodyAttrs: { class: "letter-body" } });

    const route = useRoute();
    // /work/healpen still belongs to Work; the pages are siblings in the
    // router, so NuxtLink's own active class doesn't cover it.
    const isCurrent = (to: string) => route.path === to || route.path.startsWith(`${to}/`);

    const navItems = computed(() =>
        ["work", "writing", "about", "contact"].map((key) => ({
            key,
            to: localePath(`/${key}`),
        }))
    );
</script>
