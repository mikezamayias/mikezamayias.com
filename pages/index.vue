<script setup lang="ts">
    import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
    import {
        faArrowUpRightFromSquare,
        faCode,
        faCopy,
        faEnvelope,
        faFeather,
        faPenNib,
        faPersonRunning,
        faRobot,
        faTerminal,
        faUserDoctor,
        faWallet,
    } from "@fortawesome/free-solid-svg-icons";
    import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
    import LetterChip from "~/components/letter/LetterChip.vue";
    import LetterIcon from "~/components/letter/LetterIcon.vue";
    import LetterMark from "~/components/letter/LetterMark.vue";
    import LetterNote from "~/components/letter/LetterNote.vue";
    import LetterSignature from "~/components/letter/LetterSignature.vue";
    import { formatWorkStack } from "~/utils/workFormat";

    // The home page is a signed letter. Its sentences live in
    // i18n/locales/en.json (`letter.*`); the chips inside them open notes
    // whose facts (stack, links, posts, contact) come from the content
    // snapshot, so admin edits still show up after a deploy.
    definePageMeta({ layout: false });

    const { locale, t } = useI18n();
    const localePath = useLocalePath();

    useHead({ bodyAttrs: { class: "letter-body" } });
    useSeoMeta({
        title: "Mike Zamayias · Mobile engineer",
        description: () => t("meta.description.home"),
    });

    const [{ data: work }, { data: writing }, { data: contact }, { data: social }] =
        await Promise.all([
            useWork({ locale }),
            useWriting({ locale, limit: 3 }),
            useContactInfo(),
            useSocialLinks(),
        ]);

    type WorkChip = {
        /** slot name in the `letter.*` sentence */
        slot: string;
        slug: string;
        icon: IconDefinition;
        /** used when the work entry is missing, and for the site chip */
        name: string;
        label?: string;
    };

    const workChips: WorkChip[] = [
        { slot: "healpen", slug: "healpen", icon: faFeather, name: "Healpen" },
        { slot: "peakward", slug: "peakward", icon: faPersonRunning, name: "Peakward" },
        { slot: "budgetCoach", slug: "budget-coach", icon: faWallet, name: "Budget Coach" },
        { slot: "localmind", slug: "localmind", icon: faRobot, name: "LocalMind" },
        { slot: "famon", slug: "famon", icon: faTerminal, name: "famon" },
        { slot: "efimeries", slug: "efimeries", icon: faUserDoctor, name: "Efimeries" },
        {
            slot: "site",
            slug: "site-2026",
            icon: faCode,
            name: "This site",
            label: t("letter.chip.site"),
        },
    ];
    const workParagraphs = [
        { key: "letter.apps", slots: ["healpen", "peakward", "budgetCoach", "localmind"] },
        { key: "letter.tools", slots: ["famon", "efimeries", "site"] },
    ];

    const workBySlug = computed(() => new Map((work.value ?? []).map((w) => [w.slug, w])));
    const chipBySlot = new Map(workChips.map((c) => [c.slot, c]));

    function entryFor(chip: WorkChip) {
        return workBySlug.value.get(chip.slug) ?? null;
    }
    function nameFor(chip: WorkChip) {
        return entryFor(chip)?.locale?.[locale.value]?.name ?? chip.name;
    }
    function hostOf(url: string) {
        try {
            return new URL(url).host.replace(/^www\./, "");
        } catch {
            return url;
        }
    }

    // One flag per note, keyed by the note's element id.
    const noteId = (slot: string) => `n-${slot}`;
    const open = reactive<Record<string, boolean>>({});
    function toggle(id: string) {
        open[id] = !open[id];
    }

    const posts = computed(() => writing.value ?? []);
    const dateFormat = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
    function formatDate(date: string) {
        const d = new Date(`${date}T00:00:00Z`);
        return Number.isNaN(d.getTime()) ? date : dateFormat.format(d);
    }

    const email = computed(() => contact.value?.email ?? "contact@mikezamayias.com");
    const timezone = computed(() => contact.value?.timezone ?? "Europe/Athens");
    const socialIcons: Record<string, IconDefinition> = { github: faGithub, linkedin: faLinkedin };
    const socialLinks = computed(() =>
        (social.value ?? [])
            .filter((s) => s.visible !== false)
            .map((s) => ({ ...s, iconDef: socialIcons[s.icon ?? s.id] ?? null }))
    );
    const github = computed(() => socialLinks.value.find((s) => s.id === "github") ?? null);

    // "It's 20:14 here": set on the client, since the page is prerendered.
    // The placeholder keeps the same width, so nothing shifts when it fills.
    const clock = ref("");
    // Copy-to-clipboard feedback, announced through the live region.
    const copied = ref(false);
    const live = ref("");
    async function copyEmail() {
        try {
            await navigator.clipboard.writeText(email.value);
            copied.value = true;
            live.value = t("letter.note.copiedLive");
            setTimeout(() => (copied.value = false), 2000);
        } catch {
            live.value = t("letter.note.copyFailed");
        }
    }

    onMounted(() => {
        clock.value = new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone.value,
        }).format(new Date());
        // #n-peakward and the other note ids open that note on load.
        const id = decodeURIComponent(location.hash.slice(1));
        if (id.startsWith("n-")) open[id] = true;
    });
</script>

<template>
    <div class="letter-page">
        <main id="main" class="letter-sheet">
            <header class="letter-head">
                <div class="letter-who">
                    <LetterMark class="letter-head-mark" />
                    <div>
                        <h1>Mike Zamayias</h1>
                        <span class="letter-role">{{ t("letter.role") }}</span>
                    </div>
                </div>
                <p class="letter-reach">
                    <a :href="`mailto:${email}`">{{ email }}</a>
                    <a v-if="github" :href="github.url" target="_blank" rel="noopener">
                        {{ hostOf(github.url) }}/{{ github.url.split("/").pop() }}
                    </a>
                </p>
            </header>

            <div class="letter">
                <p class="letter-hello">{{ t("letter.hello") }}</p>

                <p>{{ t("letter.intro") }}</p>

                <div v-for="para in workParagraphs" :key="para.key" class="letter-block">
                    <i18n-t :keypath="para.key" tag="p" scope="global">
                        <template v-for="slot in para.slots" :key="slot" #[slot]>
                            <LetterChip
                                v-if="entryFor(chipBySlot.get(slot)!)"
                                :controls="noteId(slot)"
                                :expanded="!!open[noteId(slot)]"
                                :icon="chipBySlot.get(slot)!.icon"
                                @toggle="toggle(noteId(slot))"
                                >{{
                                    chipBySlot.get(slot)!.label ?? nameFor(chipBySlot.get(slot)!)
                                }}</LetterChip
                            ><template v-else>{{
                                chipBySlot.get(slot)!.label ?? chipBySlot.get(slot)!.name
                            }}</template>
                        </template>
                    </i18n-t>
                    <template v-for="slot in para.slots" :key="`note-${slot}`">
                        <LetterNote
                            v-if="entryFor(chipBySlot.get(slot)!)"
                            :id="noteId(slot)"
                            :open="!!open[noteId(slot)]"
                        >
                            <span class="note-title">
                                <LetterIcon :icon="chipBySlot.get(slot)!.icon" />
                                {{ nameFor(chipBySlot.get(slot)!) }}
                                <span class="note-tag">{{
                                    formatWorkStack(entryFor(chipBySlot.get(slot)!)!.stack)
                                }}</span>
                            </span>
                            <a
                                v-for="link in entryFor(chipBySlot.get(slot)!)!.links ?? []"
                                :key="link.url"
                                class="note-go"
                                :href="link.url"
                                target="_blank"
                                rel="noopener"
                                >{{ link.label || hostOf(link.url)
                                }}<LetterIcon :icon="faArrowUpRightFromSquare"
                            /></a>
                            <NuxtLink
                                class="note-go"
                                :to="localePath(`/work/${chipBySlot.get(slot)!.slug}`)"
                            >
                                {{
                                    t("letter.note.more", { name: nameFor(chipBySlot.get(slot)!) })
                                }}
                            </NuxtLink>
                        </LetterNote>
                    </template>
                </div>

                <div class="letter-block">
                    <i18n-t keypath="letter.writing" tag="p" scope="global">
                        <template #write>
                            <LetterChip
                                :controls="noteId('writing')"
                                :expanded="!!open[noteId('writing')]"
                                :icon="faPenNib"
                                @toggle="toggle(noteId('writing'))"
                                >{{ t("letter.chip.write") }}</LetterChip
                            >
                        </template>
                    </i18n-t>
                    <LetterNote :id="noteId('writing')" :open="!!open[noteId('writing')]">
                        <span class="note-title">
                            <LetterIcon :icon="faPenNib" />
                            {{ t("letter.note.writing") }}
                            <span class="note-tag">{{ t("letter.note.recent") }}</span>
                        </span>
                        <ul v-if="posts.length">
                            <li v-for="post in posts" :key="post.slug">
                                <time :datetime="post.date">{{ formatDate(post.date) }}</time>
                                <NuxtLink :to="localePath(`/writing/${post.slug}`)">{{
                                    post.locale?.[locale]?.title ?? post.slug
                                }}</NuxtLink>
                            </li>
                        </ul>
                        <span class="note-links">
                            <NuxtLink class="note-go" :to="localePath('/writing')">{{
                                t("letter.note.allWriting")
                            }}</NuxtLink>
                            <a class="note-go" href="/rss.xml">{{ t("letter.note.feed") }}</a>
                        </span>
                    </LetterNote>
                </div>

                <div class="letter-block">
                    <i18n-t keypath="letter.contact" tag="p" scope="global">
                        <template #contact>
                            <LetterChip
                                :controls="noteId('contact')"
                                :expanded="!!open[noteId('contact')]"
                                :icon="faEnvelope"
                                @toggle="toggle(noteId('contact'))"
                                >{{ t("letter.chip.contact") }}</LetterChip
                            >
                        </template>
                        <template #time>
                            <span class="letter-clock" :class="{ ready: clock }">{{
                                clock || "00:00"
                            }}</span>
                        </template>
                    </i18n-t>
                    <LetterNote :id="noteId('contact')" :open="!!open[noteId('contact')]">
                        <span class="note-title">
                            <LetterIcon :icon="faEnvelope" />
                            {{ t("letter.note.contact") }}
                            <span class="note-tag">{{ timezone }}</span>
                        </span>
                        <span>
                            {{ email }}
                            <button class="note-copy" type="button" @click="copyEmail">
                                <LetterIcon :icon="faCopy" />
                                <span>{{
                                    copied ? t("letter.note.copied") : t("letter.note.copy")
                                }}</span>
                            </button>
                        </span>
                        <span class="note-pills">
                            <a class="note-pill" :href="`mailto:${email}`"
                                ><LetterIcon :icon="faEnvelope" />{{ t("letter.note.email") }}</a
                            >
                            <a
                                v-for="link in socialLinks"
                                :key="link.id"
                                class="note-pill"
                                :href="link.url"
                                target="_blank"
                                rel="noopener"
                                ><LetterIcon v-if="link.iconDef" :icon="link.iconDef" />{{
                                    link.label
                                }}</a
                            >
                        </span>
                        <p class="sr-only" aria-live="polite">{{ live }}</p>
                    </LetterNote>
                </div>

                <div class="letter-sign">
                    <img
                        class="letter-avatar"
                        src="/images/mike.jpg"
                        alt=""
                        width="76"
                        height="76"
                    />
                    <p class="letter-close">
                        {{ t("letter.signoff") }}
                        <span class="letter-name"
                            ><LetterSignature /><span class="sr-only">Mike</span></span
                        >
                    </p>
                </div>
            </div>
        </main>

        <footer class="letter-footer">
            <nav :aria-label="t('letter.footer.nav')">
                <NuxtLink :to="localePath('/work')">{{ t("nav.work") }}</NuxtLink>
                <NuxtLink :to="localePath('/writing')">{{ t("nav.writing") }}</NuxtLink>
                <NuxtLink :to="localePath('/about')">{{ t("nav.about") }}</NuxtLink>
                <NuxtLink :to="localePath('/contact')">{{ t("nav.contact") }}</NuxtLink>
            </nav>
            <span>© {{ new Date().getFullYear() }} Mike Zamayias</span>
        </footer>
    </div>
</template>

<style>
    /* The page behind the sheet, including overscroll. */
    body.letter-body {
        background: var(--letter-bg);
    }
</style>

<style scoped>
    .letter-page {
        min-height: 100vh;
        background: var(--letter-bg);
        color: var(--letter-text);
        font-family: var(--font-letter);
        font-optical-sizing: auto;
        font-size: clamp(18px, 0.5vw + 15px, 20px);
        line-height: 1.65;
        padding: clamp(16px, 5vh, 56px) clamp(16px, 4vw, 48px) 0;
    }
    .letter-sheet {
        max-width: 46rem;
        margin: 0 auto;
        background: var(--letter-sheet);
        border: 1px solid var(--letter-hairline);
        border-radius: 28px;
        padding: clamp(22px, 5vw, 60px) clamp(20px, 5vw, 64px) clamp(28px, 5vw, 56px);
    }
    a {
        color: var(--letter-primary);
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
    }
    a:hover {
        text-decoration-thickness: 2px;
    }
    :focus-visible {
        outline: 3px solid var(--letter-primary);
        outline-offset: 3px;
    }

    /* letterhead, like the address block on paper letterhead */
    .letter-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px 24px;
        padding-bottom: 18px;
        margin-bottom: clamp(28px, 5vw, 44px);
        border-bottom: 1px solid var(--letter-hairline);
        font-family: var(--font-mono);
        font-size: 14px;
        line-height: 1.5;
    }
    .letter-head h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
    }
    .letter-who {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .letter-head-mark {
        width: 44px;
        height: 44px;
        flex: none;
    }
    .letter-role {
        display: block;
        color: var(--letter-soft);
    }
    .letter-reach {
        margin: 0;
        display: grid;
        gap: 2px;
        text-align: right;
    }
    .letter-reach a {
        color: var(--letter-soft);
        text-decoration: none;
        padding-block: 3px;
    }
    .letter-reach a:hover {
        color: var(--letter-primary);
        text-decoration: underline;
    }

    /* the letter */
    .letter p {
        margin: 0 0 1em;
        max-width: 36em;
    }
    .letter .letter-hello {
        font-size: clamp(30px, 2.4vw + 18px, 40px);
        line-height: 1.15;
        font-style: italic;
        color: var(--letter-primary);
        margin: 0 0 0.6em;
        letter-spacing: -0.01em;
    }
    .letter-clock {
        font-family: var(--font-mono);
        visibility: hidden;
    }
    .letter-clock.ready {
        visibility: visible;
    }

    /* inside the notes (slot content, so styled here) */
    .note-title {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 12px;
        font-weight: 700;
    }
    .note-title .letter-icon {
        width: 1.1em;
        height: 1.1em;
    }
    .note-tag {
        font-weight: 400;
    }
    .letter-note a:not(.note-pill) {
        color: inherit;
    }
    .note-go {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        justify-self: start;
        min-height: 24px;
    }
    .note-go .letter-icon {
        width: 0.8em;
        height: 0.8em;
    }
    .note-links {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 18px;
    }
    .letter-note ul {
        list-style: none;
        margin: 2px 0 0;
        padding: 0;
        display: grid;
        gap: 8px;
    }
    .letter-note li {
        display: grid;
        grid-template-columns: 7.5rem 1fr;
        gap: 2px 14px;
    }
    .letter-note time {
        font-variant-numeric: tabular-nums;
    }
    .note-copy {
        font: 500 13px var(--font-mono);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 3px 11px;
        margin-left: 8px;
        border-radius: 10px;
        border: 1.5px solid currentColor;
        background: none;
        color: inherit;
        cursor: pointer;
        vertical-align: 1px;
    }
    .note-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 12px;
        margin-top: 6px;
    }
    .note-pill {
        font: 500 15px var(--font-mono);
        display: inline-flex;
        align-items: center;
        gap: 9px;
        min-height: 40px;
        padding: 8px 16px 8px 14px;
        border-radius: 14px;
        background: var(--letter-cta);
        color: var(--letter-on-cta);
        text-decoration: none;
        transition:
            background-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
    }
    .note-pill:hover {
        background: var(--letter-sheet);
        color: var(--letter-text);
        box-shadow: var(--letter-shadow);
    }

    /* sign-off */
    .letter-sign {
        margin-top: 2em;
        display: flex;
        align-items: center;
        gap: 18px;
    }
    .letter-avatar {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        outline: 3px solid var(--letter-outline);
        outline-offset: 3px;
        object-fit: cover;
        flex: none;
    }
    .letter .letter-close {
        margin: 0;
        color: var(--letter-soft);
        font-style: italic;
    }
    .letter-name {
        display: block;
        font-size: 1.7em;
        line-height: 1.1;
        margin-top: 0.1em;
    }

    .letter-footer {
        max-width: 46rem;
        margin: 0 auto;
        padding: 22px 8px 32px;
        font: 13px/1.6 var(--font-mono);
        color: var(--letter-soft);
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 6px 20px;
    }
    .letter-footer nav {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 18px;
    }
    .letter-footer a {
        color: var(--letter-soft);
        padding-block: 3px;
    }
    .letter-footer a:hover {
        color: var(--letter-primary);
    }

    @media (min-width: 1080px) {
        .letter-sheet {
            padding: 60px 72px 56px;
        }
    }
    @media (max-width: 640px) {
        .letter-reach {
            text-align: left;
        }
    }
    @media (max-width: 520px) {
        .letter-note li {
            grid-template-columns: 1fr;
        }
        .letter-sheet {
            border-radius: 22px;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .note-pill {
            transition: none;
        }
    }
</style>
