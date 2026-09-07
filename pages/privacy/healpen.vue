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
            <p class="text-lg text-brand font-medium mb-2">Healpen</p>
            <p class="text-sm text-soft mb-12">Last updated: June 11, 2026</p>

            <!-- Content -->
            <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-fg">
                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Introduction</h2>
                    <p class="text-soft leading-relaxed">
                        Mike Zamayias ("we", "us", or "our") operates Healpen, a private journaling
                        and reflection application. This Privacy Policy explains what information
                        Healpen collects, how that information is used, how long it is retained, and
                        how you can request deletion.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Information We Collect</h2>

                    <h3 class="text-xl font-medium text-fg mb-2">Personal Information</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg"
                                >Email address, display name, Firebase user ID, and authentication
                                state</strong
                            >
                            — used for account creation, sign-in, and account security
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">Journal Data</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg">Journal entries and related metadata</strong>
                            — text content, writing-session information, mood or tone signals,
                            preferences, timestamps, note history, and generated analysis results
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">
                        Automatically Collected Information
                    </h3>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            <strong class="text-fg">Optional analytics and app usage events</strong>
                            — used to understand reliability and feature usage
                        </li>
                        <li>
                            <strong class="text-fg"
                                >Diagnostic, crash, and security information</strong
                            >
                            — technical error details, app integrity signals, and device identifiers
                            used for analytics, debugging, or abuse prevention
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">How We Use Your Information</h2>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            To provide account sign-in, local storage, sync, note history, settings,
                            and account deletion
                        </li>
                        <li>
                            To analyze journal entries when you request analysis and show mood,
                            tone, and writing insights
                        </li>
                        <li>
                            To protect the service from abuse using Firebase App Check and related
                            platform integrity checks
                        </li>
                        <li>
                            To improve reliability through crash reporting and optional analytics
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Third-Party Services</h2>
                    <p class="text-soft leading-relaxed mb-4">
                        Healpen uses third-party service providers to operate app features:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            <strong class="text-fg">Firebase and Google Cloud</strong>
                            — for authentication, hosting, database, Cloud Functions, analytics,
                            crash reporting, and app integrity checks (<a
                                href="https://firebase.google.com/support/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-brand underline underline-offset-2"
                                >Privacy Policy</a
                            >)
                        </li>
                        <li>
                            <strong class="text-fg">OpenAI</strong>
                            — for journal analysis only when you request analysis. Healpen sends the
                            entry text through a Firebase Cloud Function and uses the result to
                            return sentiment and writing insights (<a
                                href="https://openai.com/policies/privacy-policy/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-brand underline underline-offset-2"
                                >Privacy Policy</a
                            >)
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Journal Data Privacy</h2>
                    <p class="text-soft leading-relaxed">
                        We recognize the deeply personal nature of journal entries. Healpen does not
                        sell your personal information, does not use journal content for third-party
                        advertising, and does not track you across other companies' apps or websites
                        for advertising purposes. Journal content is processed only to provide the
                        app features you use, including analysis when you request it.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Data Retention</h2>
                    <p class="text-soft leading-relaxed">
                        Healpen keeps account and journal information while your account is active
                        or as needed to provide the app. You can delete your account in Settings or
                        contact us for deletion help. Account deletion removes Firebase account data
                        and associated cloud journal, preference, and analysis data handled by the
                        app within 30 days, unless a longer period is required for security, fraud
                        prevention, or legal obligations. Local device data may also be removed by
                        signing out, deleting the app, or clearing app data through the operating
                        system.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Data Security</h2>
                    <p class="text-soft leading-relaxed">
                        We implement appropriate technical and organizational measures to protect
                        your personal data against unauthorized access, alteration, disclosure, or
                        destruction. However, no method of transmission over the Internet or
                        electronic storage is 100% secure.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Your Rights (GDPR)</h2>
                    <p class="text-soft leading-relaxed mb-4">
                        If you are a resident of the European Economic Area (EEA), you have the
                        following data protection rights:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>The right to access your personal data</li>
                        <li>The right to rectification of inaccurate data</li>
                        <li>The right to erasure ("right to be forgotten")</li>
                        <li>The right to restrict processing</li>
                        <li>The right to data portability</li>
                        <li>The right to object to processing</li>
                        <li>The right to withdraw consent at any time</li>
                    </ul>
                    <p class="text-soft leading-relaxed mt-4">
                        You can update your display name in the app, sign out, delete your account,
                        or contact us to request access, correction, or deletion help.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Children's Privacy</h2>
                    <p class="text-soft leading-relaxed">
                        Healpen is not intended for children under the age of 13. We do not
                        knowingly collect personal data from children under 13. If we become aware
                        that we have collected data from a child under 13, we will take steps to
                        delete such information.
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
        title: "Healpen Privacy Policy · Mike Zamayias",
        description: "Privacy Policy for Healpen, a private journaling app by Mike Zamayias.",
    });
</script>
