<template>
    <!--
        ClientOnly wraps the entire admin shell so SSR responds with a
        bare empty `<div>` (the fallback below) and the actual layout
        + nav + page content only renders on the client AFTER
        `middleware/admin-auth.ts` has run and redirected unauthenticated
        visitors to `/admin/login`.

        Previously the `routeRules: "/admin/**": { ssr: false }` rule
        looked correct in source but Nitro applied it inconsistently to
        the built function (login was skipped; `/admin`, `/admin/messages`,
        `/admin/work` still rendered full SSR shell). This wrap is
        independent of Nitro's route-rule matching and works for every
        admin page that uses `layout: "admin"`. Login bypasses this
        layout (definePageMeta `layout: false`) — its own ssr:false
        handling is separate.
    -->
    <ClientOnly>
        <div class="codex-admin-shell min-h-screen bg-background text-foreground">
            <header class="codex-admin-topbar sticky top-0 z-50">
                <div class="codex-admin-topbar-inner">
                    <div class="codex-admin-brand">
                        <Wordmark to="/admin" :size="28" />
                        <div class="codex-admin-brand-copy">
                            <NuxtLink to="/admin">Portfolio admin</NuxtLink>
                            <span>Apps, writing, inbox</span>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="ghost" class="flex items-center gap-2 px-2">
                                <Avatar class="h-8 w-8">
                                    <AvatarImage
                                        v-if="user?.photoURL"
                                        :src="user.photoURL"
                                        :alt="user.displayName || 'User'"
                                    />
                                    <AvatarFallback>
                                        <User class="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <span class="hidden sm:inline-block">{{
                                    user?.displayName || "Admin"
                                }}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="w-48">
                            <DropdownMenuItem as-child>
                                <NuxtLink to="/admin/security" class="flex items-center gap-2">
                                    <Shield class="h-4 w-4" />
                                    Security
                                </NuxtLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem as-child>
                                <NuxtLink to="/" class="flex items-center gap-2">
                                    <ExternalLink class="h-4 w-4" />
                                    View Site
                                </NuxtLink>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                class="text-destructive focus:text-destructive"
                                @click="handleLogout"
                            >
                                <LogOut class="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div class="codex-admin-body">
                <aside class="codex-admin-sidebar hidden w-64 shrink-0 py-6 lg:block">
                    <nav class="sticky top-24 grid gap-4">
                        <!--
                        Sidebar IA — five buckets ordered by frequency-of-use:
                          1. Dashboard (single link, no group)
                          2. Content — collections you publish from
                          3. Inbox — contact form, requires triage
                          4. Site pages — singleton page chrome
                          5. Resume data — career inventory + social
                          6. Locales — EL translations seam
                        Security stays out of the sidebar; the avatar
                        dropdown is the one true entry point.
                    -->
                        <div class="grid gap-1">
                            <NuxtLink
                                v-for="item in primaryNav"
                                :key="item.to"
                                :to="item.to"
                                :class="['codex-nav-link', isActive(item.to) ? 'is-active' : '']"
                                @mouseenter="onHoverNav(item)"
                                @focus="onHoverNav(item)"
                            >
                                <component :is="item.icon" class="h-4 w-4" />
                                {{ item.label }}
                            </NuxtLink>
                        </div>

                        <div
                            v-for="group in navGroups"
                            :key="group.label"
                            class="codex-admin-nav-group grid gap-1"
                        >
                            <p class="codex-section-eyebrow codex-admin-sidebar-eyebrow">
                                {{ group.label }}
                            </p>
                            <NuxtLink
                                v-for="item in group.items"
                                :key="item.to"
                                :to="item.to"
                                :class="['codex-nav-link', isActive(item.to) ? 'is-active' : '']"
                                @mouseenter="onHoverNav(item)"
                                @focus="onHoverNav(item)"
                            >
                                <component :is="item.icon" class="h-4 w-4" />
                                {{ item.label }}
                            </NuxtLink>
                        </div>
                    </nav>
                </aside>

                <main class="codex-admin-main min-w-0 flex-1 py-6 pb-28 lg:pb-10">
                    <slot />
                </main>
            </div>

            <nav
                class="codex-admin-mobile-nav fixed inset-x-0 bottom-0 z-50 px-2 py-2 backdrop-blur lg:hidden"
            >
                <div class="mx-auto grid max-w-lg grid-cols-5 gap-1">
                    <NuxtLink
                        v-for="item in mobileNav"
                        :key="item.to"
                        :to="item.to"
                        :class="['codex-tab', isActive(item.to) ? 'is-active' : '']"
                        @mouseenter="onHoverNav(item)"
                        @focus="onHoverNav(item)"
                    >
                        <component :is="item.icon" class="h-5 w-5" />
                        <span>{{ item.label }}</span>
                    </NuxtLink>

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <button
                                class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-2 text-[0.68rem] text-muted-foreground"
                            >
                                <MoreHorizontal class="h-5 w-5" />
                                <span>More</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="mb-2 w-56">
                            <DropdownMenuItem v-for="item in moreNav" :key="item.to" as-child>
                                <NuxtLink :to="item.to" class="flex items-center gap-2">
                                    <component :is="item.icon" class="h-4 w-4" />
                                    {{ item.label }}
                                </NuxtLink>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </nav>

            <AdminEditorSheet />

            <Toaster position="top-right" :rich-colors="true" />
        </div>
        <template #fallback>
            <div class="min-h-screen bg-background" />
        </template>
    </ClientOnly>
</template>

<script setup lang="ts">
    import {
        BookOpen,
        BriefcaseBusiness,
        ExternalLink,
        FolderKanban,
        GraduationCap,
        Home,
        Languages,
        LogOut,
        Mail,
        Map,
        Medal,
        MoreHorizontal,
        Newspaper,
        Settings,
        Share2,
        Shield,
        Sparkles,
        User,
        UserCog,
        Wrench,
    } from "lucide-vue-next";
    import Wordmark from "~/components/codex/Wordmark.vue";
    import { Button } from "@/components/ui/button";
    import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import { Toaster } from "@/components/ui/sonner";

    const route = useRoute();
    const router = useRouter();
    const { user, logout } = useAuth();

    // SEO defence: never let crawlers index any admin surface even if it
    // briefly renders for an unauthenticated visitor. The SSR shell leak
    // is prevented by `server/middleware/admin-redirect.ts` (302 redirect
    // before render), but `noindex,nofollow,noarchive` ensures any
    // accidental cache miss can't surface admin URLs in search results.
    useHead({
        meta: [{ name: "robots", content: "noindex,nofollow,noarchive" }],
    });

    interface NavItem {
        label: string;
        to: string;
        icon: ReturnType<typeof Home>;
    }

    interface NavGroup {
        label: string;
        items: NavItem[];
    }

    const primaryNav: NavItem[] = [{ label: "Home", to: "/admin", icon: Home }];

    const navGroups: NavGroup[] = [
        {
            label: "Publish",
            items: [
                { label: "Apps", to: "/admin/work", icon: FolderKanban },
                { label: "Writing", to: "/admin/writing", icon: Newspaper },
                { label: "Roadmap", to: "/admin/roadmap", icon: Map },
            ],
        },
        {
            label: "Inbox",
            items: [{ label: "Messages", to: "/admin/messages", icon: Mail }],
        },
        {
            label: "Site",
            items: [
                { label: "Hero", to: "/admin/hero", icon: Sparkles },
                { label: "About", to: "/admin/about", icon: BookOpen },
                { label: "Contact", to: "/admin/contact", icon: Mail },
                { label: "Roadmap setup", to: "/admin/roadmap-settings", icon: Settings },
            ],
        },
        {
            label: "Profile",
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
            label: "System",
            items: [{ label: "Translations", to: "/admin/translations", icon: Languages }],
        },
    ];

    // Mobile bottom nav: the four highest-frequency tabs. Everything
    // else collapses behind "More".
    const mobileNav: NavItem[] = [
        primaryNav[0]!,
        navGroups[0]!.items[0]!,
        navGroups[0]!.items[1]!,
        navGroups[1]!.items[0]!,
    ];

    const moreNav: NavItem[] = [
        navGroups[0]!.items[2]!,
        ...navGroups[2]!.items,
        ...navGroups[3]!.items,
        ...navGroups[4]!.items,
    ];

    const isActive = (to: string) =>
        to === "/admin" ? route.path === to : route.path === to || route.path.startsWith(`${to}/`);

    const adminApi = useAdminApi();
    function pathToCollection(to: string): string | null {
        const m = to.match(
            /^\/admin\/(work|writing|roadmap|social|experience|skills|education|certifications)\b/
        );
        return m?.[1] ?? null;
    }
    function onHoverNav(item: { to: string }) {
        const collection = pathToCollection(item.to);
        if (collection) void adminApi.prefetchListCollection(collection);
    }

    const handleLogout = async () => {
        await logout();
        await router.push("/admin/login");
    };
</script>

<style scoped>
    .codex-admin-shell {
        background: linear-gradient(
            180deg,
            color-mix(in oklch, var(--surface-cool, var(--surface-hover)) 26%, var(--bg)) 0%,
            var(--bg) 22rem
        );
    }

    .codex-admin-topbar {
        padding: 0.8rem 0;
        background: color-mix(in oklch, var(--bg) 78%, transparent);
        backdrop-filter: blur(18px);
    }

    .codex-admin-topbar-inner,
    .codex-admin-body {
        width: min(100% - 2rem, 1440px);
        margin: 0 auto;
    }

    .codex-admin-topbar-inner {
        min-height: 3.8rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.55rem 0.75rem;
        border: 1px solid color-mix(in oklch, var(--line) 58%, transparent);
        border-radius: 999px;
        background: color-mix(in oklch, var(--surface-card, var(--surface)) 92%, transparent);
        box-shadow: 0 12px 32px color-mix(in oklch, var(--fg) 8%, transparent);
    }

    .codex-admin-brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
    }

    .codex-admin-brand-copy {
        display: grid;
        gap: 0.05rem;
        line-height: 1.1;
    }

    .codex-admin-brand-copy a {
        font-weight: 800;
        color: var(--fg);
    }

    .codex-admin-brand-copy span {
        color: var(--soft);
        font-size: 0.78rem;
    }

    .codex-admin-body {
        display: flex;
        gap: 1rem;
    }

    .codex-admin-sidebar {
        padding-right: 0.25rem;
    }

    .codex-admin-sidebar nav {
        border: 1px solid color-mix(in oklch, var(--line) 55%, transparent);
        border-radius: 8px;
        padding: 0.8rem;
        background: var(--surface-card, var(--surface));
        box-shadow: 0 1px 0 color-mix(in oklch, var(--fg) 6%, transparent);
    }

    .codex-admin-nav-group {
        padding-top: 0.75rem;
        border-top: 1px solid color-mix(in oklch, var(--line) 48%, transparent);
    }

    .codex-admin-sidebar-eyebrow {
        margin: 0 0 0.25rem;
        padding: 0 0.75rem;
    }

    .codex-admin-main {
        min-height: calc(100vh - 6rem);
    }

    .codex-admin-mobile-nav {
        border-top: 1px solid color-mix(in oklch, var(--line) 58%, transparent);
        background: color-mix(in oklch, var(--surface-card, var(--surface)) 94%, transparent);
    }

    @media (max-width: 640px) {
        .codex-admin-topbar-inner,
        .codex-admin-body {
            width: min(100% - 1rem, 1440px);
        }

        .codex-admin-topbar-inner {
            border-radius: 18px;
        }

        .codex-admin-brand-copy span {
            display: none;
        }
    }
</style>
