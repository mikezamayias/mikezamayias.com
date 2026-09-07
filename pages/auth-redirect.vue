<template>
    <div class="redirect-wrapper">
        <div class="redirect-container">
            <div v-if="isLoading" class="redirect-status">
                <div class="spinner"></div>
                <p>Opening Healpen app...</p>
            </div>

            <template v-if="!isLoading">
                <h1>Authentication Link</h1>
                <p>If the app doesn't open automatically, tap the button below:</p>

                <a :href="currentUrl" class="app-link">Open in Healpen</a>

                <p class="text-muted">
                    If you continue to see this page, please check that you have the Healpen app
                    installed.
                </p>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount } from "vue";

    const isLoading = ref(true);
    const currentUrl = ref("");

    onMounted(() => {
        // Store the current URL for the link button
        currentUrl.value = window.location.href;

        // Replace history to prevent back button loop
        window.history.replaceState(null, "", "/");

        // Give the app 2.5 seconds to open; if it hasn't, show the manual button
        const appOpenTimeout = setTimeout(() => {
            isLoading.value = false;
        }, 2500);

        // If the page becomes hidden (app opened), clear the timeout
        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearTimeout(appOpenTimeout);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup
        onBeforeUnmount(() => {
            clearTimeout(appOpenTimeout);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        });
    });
</script>

<style scoped>
    .redirect-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
            "Cantarell", sans-serif;
        padding: 1rem;
    }

    .redirect-container {
        text-align: center;
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        max-width: 400px;
    }

    h1 {
        color: #333;
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }

    p {
        color: #666;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    .app-link {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        border-radius: 6px;
        margin: 0.5rem;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        font-weight: 500;
    }

    .app-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .text-muted {
        font-size: 0.875rem;
        color: #999;
        margin-top: 1rem;
    }

    .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 0.5rem;
        vertical-align: middle;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    .redirect-status {
        margin-bottom: 1rem;
    }

    .redirect-status p {
        display: inline;
    }
</style>
