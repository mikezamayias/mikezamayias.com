<template>
    <section>
        <AdminPageHeader
            title="Dashboard"
            description="Publish apps, write posts, triage messages, and keep the portfolio current."
            eyebrow="Command center"
        />

        <div class="codex-admin-overview">
            <div>
                <span>Inbox</span>
                <strong>{{ recentUnreadCount }}</strong>
                <small>Unread in latest 5</small>
            </div>
            <div>
                <span>Publishing</span>
                <strong>{{ cachedSectionCount }}</strong>
                <small>Sections warmed</small>
            </div>
            <div>
                <span>Mode</span>
                <strong>Live</strong>
                <small>Firestore-backed UI</small>
            </div>
        </div>

        <!-- Primary actions — the three publishable collections + inbox. -->
        <div class="codex-admin-cards">
            <NuxtLink
                v-for="item in primaryActions"
                :key="item.to"
                :to="item.to"
                class="codex-card codex-admin-card"
            >
                <component :is="item.icon" class="codex-admin-card-icon" />
                <span class="codex-card-eyebrow">{{ item.eyebrow }}</span>
                <h2 class="codex-card-title">{{ item.title }}</h2>
                <p class="codex-card-sub">{{ item.description }}</p>
                <span v-if="item.badge" class="codex-admin-card-badge">{{ item.badge }}</span>
            </NuxtLink>
        </div>

        <!-- Two-column body: recent messages + grouped section navigator. -->
        <div class="codex-admin-grid">
            <section class="codex-admin-panel">
                <div class="codex-admin-panel-header">
                    <h2 class="codex-admin-panel-title">Recent messages</h2>
                    <Button variant="ghost" size="sm" as-child>
                        <NuxtLink to="/admin/messages" class="codex-cta-glyph">Manage</NuxtLink>
                    </Button>
                </div>
                <div v-if="messagesPending" class="codex-admin-panel-body codex-admin-panel-skel">
                    <Skeleton v-for="item in 3" :key="item" class="h-14 w-full" />
                </div>
                <div v-else-if="messages.length === 0" class="codex-admin-panel-empty">
                    No messages yet.
                </div>
                <ul v-else class="codex-list codex-admin-panel-list">
                    <li
                        v-for="message in messages.slice(0, 5)"
                        :key="message.id"
                        class="codex-list-row"
                    >
                        <NuxtLink to="/admin/messages" class="codex-list-link codex-admin-message">
                            <span class="codex-admin-message-line">
                                <span class="codex-admin-message-subject">
                                    {{ message.subject || message.name }}
                                </span>
                                <Badge v-if="!message.read" variant="secondary">unread</Badge>
                            </span>
                            <span class="codex-admin-message-email">
                                {{ message.email }}
                            </span>
                        </NuxtLink>
                    </li>
                </ul>
            </section>

            <section class="codex-admin-panel">
                <div class="codex-admin-panel-header">
                    <h2 class="codex-admin-panel-title">Sections</h2>
                </div>
                <div class="codex-admin-section-groups">
                    <div
                        v-for="group in sectionGroups"
                        :key="group.label"
                        class="codex-admin-section-group"
                    >
                        <p class="codex-card-eyebrow">{{ group.label }}</p>
                        <div class="codex-admin-section-tiles">
                            <NuxtLink
                                v-for="link in group.items"
                                :key="link.to"
                                :to="link.to"
                                class="codex-card codex-admin-tile"
                            >
                                <span class="codex-card-title">{{ link.label }}</span>
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </section>
</template>

<script setup lang="ts">
    import {
        BookOpen,
        BriefcaseBusiness,
        FolderKanban,
        GraduationCap,
        Languages,
        Mail,
        Map,
        Medal,
        Newspaper,
        Settings,
        Share2,
        Sparkles,
        UserCog,
        Wrench,
    } from "lucide-vue-next";
    import { useAdminApi, type AdminMessage } from "~/composables/useAdminApi";
    import { Badge } from "@/components/ui/badge";
    import { Button } from "@/components/ui/button";
    import { Skeleton } from "@/components/ui/skeleton";

    definePageMeta({
        layout: "admin",
        middleware: "admin-auth",
    });

    const api = useAdminApi();
    const messages = ref<AdminMessage[]>([]);
    const messagesPending = ref(true);

    // Plan I.8: prewarm the per-collection list cache so clicking a
    // section nav link paints instantly from cache instead of hitting
    // the skeleton state. Cache is keyed in `useState("admin-list-cache")`
    // and read by `AdminCollectionList`.
    type AdminListItem = Record<string, unknown> & { id: string };
    const listCache = useState<Record<string, AdminListItem[]>>("admin-list-cache", () => ({}));

    async function prewarmList(collection: string) {
        if (listCache.value[collection]?.length) return;
        try {
            const data = await api.listCollection<AdminListItem>(collection);
            listCache.value = { ...listCache.value, [collection]: data };
        } catch {
            // Best-effort prewarm; section page does its own fetch on
            // mount if the cache stays empty.
        }
    }

    const recentUnreadCount = computed(() => messages.value.filter((m) => !m.read).length);

    const primaryActions = computed(() => [
        {
            eyebrow: "Content",
            title: "Apps",
            description: "Portfolio app cards and detail pages.",
            to: "/admin/work",
            icon: FolderKanban,
            badge: undefined,
        },
        {
            eyebrow: "Content",
            title: "Writing",
            description: "Essays and notes.",
            to: "/admin/writing",
            icon: Newspaper,
            badge: undefined,
        },
        {
            eyebrow: "Content",
            title: "Roadmap",
            description: "Public roadmap entries.",
            to: "/admin/roadmap",
            icon: Map,
            badge: undefined,
        },
        {
            eyebrow: "Inbox",
            title: "Messages",
            description: "Contact form inbox.",
            to: "/admin/messages",
            icon: Mail,
            badge: recentUnreadCount.value ? `${recentUnreadCount.value} recent unread` : undefined,
        },
    ]);

    const sectionGroups = [
        {
            label: "Site",
            items: [
                { label: "Hero", to: "/admin/hero", icon: Sparkles },
                { label: "About", to: "/admin/about", icon: BookOpen },
                { label: "Roadmap Settings", to: "/admin/roadmap-settings", icon: Settings },
                { label: "Contact", to: "/admin/contact", icon: Mail },
            ],
        },
        {
            label: "Resume",
            items: [
                { label: "Profile", to: "/admin/profile", icon: UserCog },
                { label: "Experience", to: "/admin/experience", icon: BriefcaseBusiness },
                { label: "Education", to: "/admin/education", icon: GraduationCap },
                { label: "Certifications", to: "/admin/certifications", icon: Medal },
                { label: "Skills", to: "/admin/skills", icon: Wrench },
                { label: "Social", to: "/admin/social", icon: Share2 },
            ],
        },
        {
            label: "Locales",
            items: [{ label: "Translations", to: "/admin/translations", icon: Languages }],
        },
    ];

    const cachedSectionCount = computed(() => Object.keys(listCache.value).length);

    onMounted(async () => {
        try {
            messages.value = await api.listMessages(5);
        } finally {
            messagesPending.value = false;
        }
        void Promise.all(
            [
                "work",
                "writing",
                "roadmap",
                "social",
                "experience",
                "skills",
                "education",
                "certifications",
            ].map(prewarmList)
        );
    });
</script>

<style scoped>
    .codex-admin-cards {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
    }

    .codex-admin-overview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .codex-admin-overview div {
        border-radius: 8px;
        border: 1px solid color-mix(in oklch, var(--line) 55%, transparent);
        background: var(--surface-card, var(--surface));
        padding: 0.9rem 1rem;
        display: grid;
        gap: 0.08rem;
    }

    .codex-admin-overview span,
    .codex-admin-overview small {
        color: var(--soft);
        font-size: 0.78rem;
    }

    .codex-admin-overview strong {
        color: var(--fg);
        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 400;
        line-height: 1;
    }

    @media (width >= 640px) {
        .codex-admin-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (width >= 1024px) {
        .codex-admin-cards {
            grid-template-columns: repeat(4, minmax(0, 1fr));
        }
    }

    .codex-admin-card {
        padding: 1.15rem;
        position: relative;
        min-height: 11rem;
    }

    .codex-admin-card-icon {
        height: 1.25rem;
        width: 1.25rem;
        color: var(--faint);
        margin-bottom: 1rem;
        display: block;
    }

    .codex-admin-card-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-family: var(--font-mono);
        font-size: 0.65rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 0.25rem 0.5rem;
        background: var(--phoenix-ember);
        color: var(--argent);
    }

    .codex-admin-grid {
        margin-top: 2rem;
        display: grid;
        gap: 1.5rem;
    }

    @media (width >= 1024px) {
        .codex-admin-grid {
            grid-template-columns: 1fr 1fr;
        }
    }

    .codex-admin-panel {
        border: 1px solid color-mix(in oklch, var(--line) 55%, transparent);
        border-radius: 8px;
        background: var(--surface-card, var(--surface));
        overflow: hidden;
    }

    .codex-admin-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid color-mix(in oklch, var(--line) 48%, transparent);
    }

    .codex-admin-panel-title {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--soft);
    }

    .codex-admin-panel-body {
        padding: 1rem;
    }

    .codex-admin-panel-skel {
        display: grid;
        gap: 0.75rem;
    }

    .codex-admin-panel-empty {
        padding: 1rem;
        font-size: 0.85rem;
        color: var(--soft);
    }

    .codex-admin-panel-list {
        border-top: 0;
    }

    .codex-admin-message {
        display: block;
    }

    .codex-admin-message-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .codex-admin-message-subject {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: var(--fg);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }

    .codex-admin-message-email {
        margin: 0.35rem 0 0;
        font-size: 0.8rem;
        color: var(--soft);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .codex-admin-section-groups {
        padding: 1rem;
        display: grid;
        gap: 1.25rem;
    }

    .codex-admin-section-group {
        display: grid;
        gap: 0.5rem;
    }

    .codex-admin-section-tiles {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: 1fr;
    }

    @media (width >= 640px) {
        .codex-admin-section-tiles {
            grid-template-columns: 1fr 1fr;
        }
    }

    .codex-admin-tile {
        padding: 0.75rem 1rem;
    }

    @media (max-width: 640px) {
        .codex-admin-overview {
            grid-template-columns: 1fr;
        }
    }
</style>
