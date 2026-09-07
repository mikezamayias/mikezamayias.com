/**
 * Emit a single <link rel="canonical"> for the current route.
 * The site is single-locale, so the canonical is always the bare path on the
 * production origin: no query string, no trailing slash except for "/".
 */
export function useCanonical() {
    const route = useRoute();
    const site = useSiteConfig();
    const href = computed(() => {
        const path = route.path === "/" ? "/" : route.path.replace(/\/+$/, "");
        return `${site.url.replace(/\/+$/, "")}${path}`;
    });
    useHead({ link: [{ rel: "canonical", key: "canonical", href }] });
}
