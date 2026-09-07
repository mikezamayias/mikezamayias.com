<template>
    <main id="main" role="main" class="min-h-screen bg-bg">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <!-- Back Link -->
            <NuxtLink
                to="/"
                class="inline-flex items-center text-sm text-brand underline underline-offset-2 mb-8"
            >
                ← Back to Home
            </NuxtLink>

            <!-- Header -->
            <h1 class="text-4xl md:text-5xl font-bold text-fg mb-4">Privacy Policy</h1>
            <p class="text-lg text-brand font-medium mb-2">lsom</p>
            <p class="text-sm text-soft mb-12">Last updated: February 19, 2026</p>

            <!-- Content -->
            <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-fg">
                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Introduction</h2>
                    <p class="text-soft leading-relaxed">
                        Mike Zamayias ("we", "us", or "our") operates lsom, a macOS utility
                        application for local device communication. This Privacy Policy explains how
                        we handle your information when you use our application. Please read this
                        policy carefully.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Information We Collect</h2>
                    <p class="text-soft leading-relaxed">
                        <strong class="text-fg">lsom does not collect any personal data.</strong>
                    </p>
                    <p class="text-soft leading-relaxed mt-4">
                        The app operates entirely locally on your device. It does not:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2 mt-2">
                        <li>Collect personal information</li>
                        <li>Track your usage or behavior</li>
                        <li>Use analytics or tracking services</li>
                        <li>Send data to external servers</li>
                        <li>Require an account or sign-in</li>
                        <li>Use cookies or similar technologies</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">How the App Works</h2>
                    <p class="text-soft leading-relaxed">
                        lsom is a utility that facilitates local device communication on your Mac.
                        All processing happens locally on your device. No data is transmitted to us
                        or any third parties.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Third-Party Services</h2>
                    <p class="text-soft leading-relaxed">
                        lsom does not use any third-party services, SDKs, or libraries that collect
                        user data.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Data Retention</h2>
                    <p class="text-soft leading-relaxed">
                        Since we do not collect any data, there is no data to retain. Uninstalling
                        the app removes all app-related files from your device.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Your Rights (GDPR)</h2>
                    <p class="text-soft leading-relaxed">
                        Since lsom does not collect or process any personal data, GDPR data subject
                        rights do not apply. However, if you have any questions or concerns about
                        your privacy, you are welcome to contact us.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Children's Privacy</h2>
                    <p class="text-soft leading-relaxed">
                        lsom does not collect any data from any user, including children. The app is
                        safe for use by people of all ages.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Changes to This Policy</h2>
                    <p class="text-soft leading-relaxed">
                        We may update this Privacy Policy from time to time. We will notify you of
                        any changes by posting the new Privacy Policy on this page and updating the
                        "Last updated" date.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Contact Us</h2>
                    <p class="text-soft leading-relaxed">
                        If you have any questions about this Privacy Policy, please contact us at:
                    </p>
                    <p class="mt-2">
                        <a
                            href="mailto:contact@mikezamayias.com"
                            class="text-brand underline underline-offset-2"
                            >contact@mikezamayias.com</a
                        >
                    </p>
                </section>
            </div>

            <!-- Footer -->
            <div class="mt-16 pt-8 border-t border-line/20 text-center">
                <p class="text-sm text-soft">
                    © {{ currentYear }} Mike Zamayias. All rights reserved.
                </p>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    const currentYear = new Date().getFullYear();

    useSeoMeta({
        title: "lsom Privacy Policy · Mike Zamayias",
        description:
            "Privacy Policy for lsom, a macOS utility app by Mike Zamayias. lsom collects no personal data.",
    });
</script>
