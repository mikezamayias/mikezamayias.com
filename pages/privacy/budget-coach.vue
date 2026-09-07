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
            <p class="text-lg text-brand font-medium mb-2">Budget Coach</p>
            <p class="text-sm text-soft mb-12">Last updated: February 19, 2026</p>

            <!-- Content -->
            <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-fg">
                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Introduction</h2>
                    <p class="text-soft leading-relaxed">
                        Mike Zamayias ("we", "us", or "our") operates Budget Coach, a personal
                        finance management application. This Privacy Policy explains how we collect,
                        use, disclose, and safeguard your information when you use our mobile
                        application. Please read this policy carefully.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Information We Collect</h2>

                    <h3 class="text-xl font-medium text-fg mb-2">Personal Information</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg">Email address</strong>
                            — used for account creation and authentication
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">Financial Data</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg">Budget information</strong>
                            — budget categories, limits, and goals you create
                        </li>
                        <li>
                            <strong class="text-fg">Transaction data</strong>
                            — income and expense records you enter manually
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">
                        Automatically Collected Information
                    </h3>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            <strong class="text-fg">Analytics data</strong>
                            — app usage patterns and feature interactions
                        </li>
                        <li>
                            <strong class="text-fg">Crash reports</strong>
                            — technical error information to help us fix bugs
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">How We Use Your Information</h2>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>To provide and maintain the app's budgeting and tracking features</li>
                        <li>To authenticate your account</li>
                        <li>To generate financial insights and reports based on your data</li>
                        <li>To analyze app usage and improve the user experience</li>
                        <li>To identify and fix technical issues</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Third-Party Services</h2>
                    <p class="text-soft leading-relaxed mb-4">
                        We use the following third-party services that may collect information:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            <strong class="text-fg">Firebase</strong>
                            — for authentication and data storage (<a
                                href="https://firebase.google.com/support/privacy"
                                target="_blank"
                                class="text-brand underline underline-offset-2"
                                >Privacy Policy</a
                            >)
                        </li>
                        <li>
                            <strong class="text-fg">Sentry</strong>
                            — for crash reporting and error tracking (<a
                                href="https://sentry.io/privacy/"
                                target="_blank"
                                class="text-brand underline underline-offset-2"
                                >Privacy Policy</a
                            >)
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Financial Data Security</h2>
                    <p class="text-soft leading-relaxed">
                        We understand the sensitivity of financial data. Your budget and transaction
                        data is stored securely and is never sold to third parties, shared with
                        advertisers, or used for any purpose other than providing you with the app's
                        core functionality. We do not connect to your bank accounts or access any
                        financial accounts directly.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Data Retention</h2>
                    <p class="text-soft leading-relaxed">
                        We retain your personal data only for as long as necessary to provide the
                        services you have requested, or for other essential purposes such as
                        complying with legal obligations. When you delete your account, your
                        personal data will be deleted within 30 days.
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
                        To exercise any of these rights, please contact us at the email address
                        below.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Children's Privacy</h2>
                    <p class="text-soft leading-relaxed">
                        Budget Coach is not intended for children under the age of 13. We do not
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
        title: "Budget Coach Privacy Policy · Mike Zamayias",
        description:
            "Privacy Policy for Budget Coach, a personal finance management app by Mike Zamayias.",
    });
</script>
