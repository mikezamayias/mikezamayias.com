<script setup lang="ts">
    import Wordmark from "./Wordmark.vue";

    const { t } = useI18n();
    const { preference, setTheme } = useTheme();

    const localePath = useLocalePath();
    const route = useRoute();
    const navWrap = ref<HTMLElement | null>(null);
    const isMenuOpen = ref(false);
    const isThemeMenuOpen = ref(false);
    type ThemePreference = "light" | "dark" | "system";

    const themeOptions = computed(
        () =>
            [
                { value: "light", label: t("theme.light"), glyph: "☀" },
                { value: "dark", label: t("theme.dark"), glyph: "☾" },
                { value: "system", label: t("theme.system"), glyph: "◐" },
            ] satisfies { value: ThemePreference; label: string; glyph: string }[]
    );

    const navItems = computed(() => [
        { key: "home", to: localePath("/") },
        { key: "work", to: localePath("/work") },
        { key: "writing", to: localePath("/writing") },
        { key: "about", to: localePath("/about") },
        { key: "contact", to: localePath("/contact") },
    ]);

    function toggleThemeMenu() {
        isThemeMenuOpen.value = !isThemeMenuOpen.value;
        if (isThemeMenuOpen.value) isMenuOpen.value = false;
    }

    async function chooseTheme(value: ThemePreference) {
        await setTheme(value);
        isThemeMenuOpen.value = false;
    }

    function toggleMenu() {
        isMenuOpen.value = !isMenuOpen.value;
        if (isMenuOpen.value) isThemeMenuOpen.value = false;
    }

    function closeMenu() {
        isMenuOpen.value = false;
    }

    function closeThemeMenu() {
        isThemeMenuOpen.value = false;
    }

    function closePanels() {
        closeMenu();
        closeThemeMenu();
    }

    function handleDocumentPointerDown(event: PointerEvent) {
        if (!isMenuOpen.value && !isThemeMenuOpen.value) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (navWrap.value?.contains(target)) return;
        closePanels();
    }

    watch(
        () => route.fullPath,
        () => {
            closePanels();
        }
    );

    onMounted(() => {
        document.addEventListener("pointerdown", handleDocumentPointerDown);
    });

    onBeforeUnmount(() => {
        document.removeEventListener("pointerdown", handleDocumentPointerDown);
    });
</script>

<template>
    <header ref="navWrap" class="codex-nav-wrap" @keydown.escape="closePanels">
        <nav class="codex-nav" :aria-label="t('a11y.primaryNav')">
            <Wordmark class="codex-nav-brand" :size="36" />

            <div class="codex-nav-links">
                <NuxtLink
                    v-for="item in navItems"
                    :key="item.key"
                    :to="item.to"
                    :data-codex-nav-link="item.key"
                >
                    {{ t(`nav.${item.key}`) }}
                </NuxtLink>
            </div>

            <div class="codex-nav-tools">
                <div class="codex-theme-control">
                    <button
                        type="button"
                        class="codex-theme-toggle"
                        :aria-label="t('a11y.themeOptions')"
                        aria-haspopup="menu"
                        aria-controls="codex-theme-menu"
                        :aria-expanded="isThemeMenuOpen"
                        @click="toggleThemeMenu"
                    >
                        <span aria-hidden="true">◐</span>
                    </button>
                    <Transition name="codex-theme-menu">
                        <div
                            v-if="isThemeMenuOpen"
                            id="codex-theme-menu"
                            class="codex-theme-menu"
                            role="menu"
                            :aria-label="t('a11y.theme')"
                        >
                            <button
                                v-for="option in themeOptions"
                                :key="option.value"
                                type="button"
                                class="codex-theme-option"
                                role="menuitemradio"
                                :aria-checked="preference === option.value"
                                :data-active="preference === option.value ? 'true' : 'false'"
                                @click="chooseTheme(option.value)"
                            >
                                <span class="codex-theme-option-glyph" aria-hidden="true">
                                    {{ option.glyph }}
                                </span>
                                <span>{{ option.label }}</span>
                            </button>
                        </div>
                    </Transition>
                </div>
                <button
                    type="button"
                    class="codex-menu-toggle"
                    aria-controls="codex-mobile-menu"
                    :aria-expanded="isMenuOpen"
                    :aria-label="t('a11y.menuToggle')"
                    :data-open="isMenuOpen ? 'true' : 'false'"
                    @click="toggleMenu"
                >
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                </button>
            </div>
        </nav>
        <Transition name="codex-mobile-menu">
            <div v-if="isMenuOpen" id="codex-mobile-menu" class="codex-mobile-menu">
                <NuxtLink
                    v-for="item in navItems"
                    :key="item.key"
                    :to="item.to"
                    class="codex-mobile-link"
                    @click="closeMenu"
                >
                    {{ t(`nav.${item.key}`) }}
                </NuxtLink>
            </div>
        </Transition>
    </header>
</template>

<style scoped>
    .codex-nav-wrap {
        position: sticky;
        top: 0;
        z-index: 50;
        padding: 0.75rem 0;
        background: color-mix(in oklch, var(--bg) 78%, transparent);
        backdrop-filter: blur(18px);
    }
    .codex-nav {
        max-width: 1180px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 0.55rem 0.75rem 0.55rem 1rem;
        width: calc(100% - 3rem);
        border: 1px solid color-mix(in oklch, var(--line) 60%, transparent);
        border-radius: 999px;
        background: color-mix(in oklch, var(--surface-card) 90%, transparent);
        box-shadow: 0 12px 32px color-mix(in oklch, var(--fg) 8%, transparent);
    }
    .codex-nav-links {
        display: flex;
        gap: 0.05rem;
        flex: 1;
        justify-content: center;
        flex-wrap: wrap;
    }
    .codex-nav-links a {
        padding: 0.45rem 0.8rem;
        border-radius: 999px;
        font-size: 0.86rem;
        font-weight: 700;
        letter-spacing: 0;
        color: var(--soft);
        position: relative;
        cursor: pointer;
        transition:
            color 0.25s var(--ease-out-quart),
            background-color 0.25s var(--ease-out-quart);
    }
    .codex-nav-links a:hover {
        color: var(--fg);
        background: var(--surface-hover);
    }
    .codex-nav-links a.router-link-active {
        color: var(--fg);
        background: var(--surface-strong);
    }

    .codex-nav-tools {
        --codex-nav-action-size: 2.55rem;

        display: flex;
        gap: 0.45rem;
        align-items: center;
    }
    .codex-theme-control {
        position: relative;
        display: grid;
        place-items: center;
    }
    .codex-theme-toggle,
    .codex-menu-toggle {
        display: grid;
        flex: 0 0 var(--codex-nav-action-size);
        width: var(--codex-nav-action-size);
        height: var(--codex-nav-action-size);
        aspect-ratio: 1;
        place-items: center;
        background: transparent;
        border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
        border-radius: 999px;
        padding: 0;
        color: var(--soft);
        cursor: pointer;
        font-size: 0.85rem;
        line-height: 1;
    }
    .codex-theme-toggle:hover,
    .codex-menu-toggle:hover {
        color: var(--fg);
        border-color: var(--fg);
    }
    .codex-theme-menu {
        position: absolute;
        top: calc(100% + 0.55rem);
        right: 0;
        z-index: 90;
        display: grid;
        min-width: 10.5rem;
        padding: 0.4rem;
        gap: 0.12rem;
        border: 1px solid color-mix(in oklch, var(--line) 65%, transparent);
        border-radius: 8px;
        background: color-mix(in oklch, var(--surface-card) 96%, var(--bg));
        box-shadow: var(--shadow-float);
    }
    .codex-theme-option {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-height: 2.45rem;
        border: 0;
        border-radius: 7px;
        padding: 0 0.75rem;
        background: transparent;
        color: var(--soft);
        font: inherit;
        font-weight: 750;
        cursor: pointer;
        text-align: left;
    }
    .codex-theme-option:hover,
    .codex-theme-option[data-active="true"] {
        color: var(--fg);
        background: var(--surface-strong);
    }
    .codex-theme-option-glyph {
        width: 1.35rem;
        height: 1.35rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: color-mix(in oklch, var(--surface-cool) 55%, transparent);
        font-size: 0.75rem;
        line-height: 1;
    }
    .codex-menu-toggle {
        display: none;
        color: var(--fg);
    }
    .codex-menu-toggle span {
        display: block;
        grid-area: 1 / 1;
        width: 0.9rem;
        height: 1.5px;
        border-radius: 999px;
        background: currentcolor;
        transition:
            transform 0.24s var(--ease-out-quart),
            opacity 0.18s ease;
    }
    .codex-menu-toggle span:first-child {
        transform: translateY(-0.32rem);
    }
    .codex-menu-toggle span:last-child {
        transform: translateY(0.32rem);
    }
    .codex-menu-toggle[data-open="true"] span:first-child {
        transform: rotate(45deg);
    }
    .codex-menu-toggle[data-open="true"] span:nth-child(2) {
        opacity: 0;
    }
    .codex-menu-toggle[data-open="true"] span:last-child {
        transform: rotate(-45deg);
    }
    .codex-mobile-menu {
        display: none;
    }

    @media (max-width: 720px) {
        .codex-nav {
            width: calc(100% - 1.5rem);
            border-radius: 999px;
            padding: 0.55rem 0.65rem 0.55rem 0.9rem;
            gap: 0.75rem;
        }
        .codex-nav-links {
            display: none;
        }
        .codex-nav-tools {
            margin-left: auto;
        }
        .codex-menu-toggle {
            display: grid;
        }
        .codex-mobile-menu {
            display: grid;
            width: calc(100% - 1.5rem);
            max-width: 30rem;
            margin: 0.55rem auto 0;
            padding: 0.45rem;
            border: 1px solid color-mix(in oklch, var(--line) 65%, transparent);
            border-radius: 8px;
            background: color-mix(in oklch, var(--surface-card) 96%, var(--bg));
            box-shadow: var(--shadow-float);
            gap: 0.12rem;
        }
        .codex-mobile-link {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            min-height: 2.85rem;
            padding: 0 0.85rem;
            border-radius: 7px;
            color: var(--soft);
            font-weight: 750;
            text-decoration: none;
        }
        .codex-mobile-link:hover {
            color: var(--fg);
            background: var(--surface-hover);
        }
        .codex-mobile-link.router-link-active {
            color: var(--fg);
            background: var(--surface-strong);
        }
    }

    .codex-mobile-menu-enter-active,
    .codex-mobile-menu-leave-active {
        transition:
            opacity 0.18s ease,
            transform 0.24s var(--ease-out-quart);
    }
    .codex-mobile-menu-enter-from,
    .codex-mobile-menu-leave-to {
        opacity: 0;
        transform: translateY(-0.35rem);
    }
    .codex-theme-menu-enter-active,
    .codex-theme-menu-leave-active {
        transition:
            opacity 0.18s ease,
            transform 0.22s var(--ease-out-quart);
    }
    .codex-theme-menu-enter-from,
    .codex-theme-menu-leave-to {
        opacity: 0;
        transform: translateY(-0.25rem);
    }
</style>
