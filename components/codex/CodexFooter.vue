<script setup lang="ts">
    const year = useState("codex-footer-year", () => new Date().getFullYear());
</script>

<template>
    <footer class="codex-footer" aria-label="Site footer">
        <p>© {{ year }} Mike Zamayias</p>
    </footer>
</template>

<style scoped>
    .codex-footer {
        max-width: 1180px;
        margin: 0 auto;
        padding: 2rem 1.5rem 2.4rem;
        color: var(--faint);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.03em;
    }

    .codex-footer p {
        margin: 0;
    }
</style>
