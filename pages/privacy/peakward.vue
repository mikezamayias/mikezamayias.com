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
            <p class="text-lg text-brand font-medium mb-2">Peakward</p>
            <p class="text-sm text-soft mb-12">Last updated: February 19, 2026</p>

            <!-- Content -->
            <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-fg">
                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Introduction</h2>
                    <p class="text-soft leading-relaxed">
                        Mike Zamayias ("we", "us", or "our") operates Peakward, a fitness and health
                        tracking application. This Privacy Policy explains how we collect, use,
                        disclose, and safeguard your information when you use our mobile
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

                    <h3 class="text-xl font-medium text-fg mb-2">Health &amp; Fitness Data</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg">HealthKit data</strong>
                            — health metrics synced from Apple Health with your explicit permission
                        </li>
                        <li>
                            <strong class="text-fg">Workout data</strong>
                            — exercise sessions, duration, and related metrics
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">Location Data</h3>
                    <ul class="list-disc list-inside text-soft space-y-2 mb-4">
                        <li>
                            <strong class="text-fg">Approximate location</strong>
                            — used solely to provide local weather information relevant to your
                            workouts. Location data is not stored or shared.
                        </li>
                    </ul>

                    <h3 class="text-xl font-medium text-fg mb-2">
                        Automatically Collected Information
                    </h3>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            <strong class="text-fg">Analytics data</strong>
                            — app usage patterns, feature interactions, and performance metrics
                            (collected via PostHog)
                        </li>
                        <li>
                            <strong class="text-fg">Crash reports</strong>
                            — technical error information to help us fix bugs (collected via Sentry)
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">How We Use Your Information</h2>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>To provide and maintain the app's functionality</li>
                        <li>To authenticate your account</li>
                        <li>To display health and fitness insights based on your data</li>
                        <li>To show weather-relevant workout information</li>
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
                            <strong class="text-fg">Apple HealthKit</strong>
                            — for reading and writing health data with your permission
                        </li>
                        <li>
                            <strong class="text-fg">PostHog</strong>
                            — for product analytics (<a
                                href="https://posthog.com/privacy"
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
                    <h2 class="text-2xl font-semibold text-fg mb-4">HealthKit Data</h2>
                    <p class="text-soft leading-relaxed">
                        Peakward accesses Apple HealthKit data only with your explicit permission.
                        We do not sell HealthKit data to third parties, use it for advertising, or
                        share it with data brokers. HealthKit data is used solely to provide you
                        with health and fitness insights within the app.
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
                        Peakward is not intended for children under the age of 13. We do not
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
        title: "Peakward Privacy Policy · Mike Zamayias",
        description:
            "Privacy Policy for Peakward, a fitness and health tracking app by Mike Zamayias.",
    });
</script>
