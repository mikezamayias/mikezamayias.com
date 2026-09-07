<template>
    <div class="min-h-screen bg-bg">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <!-- Back Link -->
            <NuxtLink
                to="/"
                class="inline-flex items-center text-sm text-brand underline underline-offset-2 mb-8"
            >
                ← Back to Home
            </NuxtLink>

            <!-- Header -->
            <h1 class="text-4xl md:text-5xl font-bold text-fg mb-4">Terms of Service</h1>
            <p class="text-sm text-soft mb-12">Last updated: February 19, 2026</p>

            <!-- Content -->
            <div class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-fg">
                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Agreement to Terms</h2>
                    <p class="text-soft leading-relaxed">
                        These Terms of Service ("Terms") govern your use of applications developed
                        by Mike Zamayias ("Developer", "we", "us", or "our"), including but not
                        limited to Peakward, Budget Coach, Healpen, and lsom (collectively, the
                        "Apps"). By downloading, installing, or using any of our Apps, you agree to
                        be bound by these Terms.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Use of the Apps</h2>
                    <p class="text-soft leading-relaxed mb-4">
                        You agree to use the Apps only for their intended purpose and in compliance
                        with all applicable laws and regulations. You must not:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2">
                        <li>
                            Use the Apps for any unlawful purpose or in violation of any applicable
                            laws
                        </li>
                        <li>
                            Attempt to reverse engineer, decompile, or disassemble any part of the
                            Apps
                        </li>
                        <li>Interfere with or disrupt the integrity or performance of the Apps</li>
                        <li>
                            Attempt to gain unauthorized access to the Apps or their related systems
                        </li>
                        <li>Use the Apps to transmit harmful, offensive, or illegal content</li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Account Registration</h2>
                    <p class="text-soft leading-relaxed">
                        Some of our Apps may require you to create an account. You are responsible
                        for maintaining the confidentiality of your account credentials and for all
                        activities that occur under your account. You agree to provide accurate and
                        complete information when creating your account and to update your
                        information as necessary.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Intellectual Property</h2>
                    <p class="text-soft leading-relaxed">
                        The Apps and their original content, features, and functionality are owned
                        by Mike Zamayias and are protected by international copyright, trademark,
                        and other intellectual property laws. You may not copy, modify, distribute,
                        sell, or lease any part of the Apps without our prior written consent.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Your Content</h2>
                    <p class="text-soft leading-relaxed">
                        You retain all rights to the content you create within our Apps (including
                        journal entries, financial records, workout data, and health information).
                        We do not claim ownership of your content. By using the Apps, you grant us a
                        limited license to store and process your content solely for the purpose of
                        providing the Apps' services to you.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">
                        Health &amp; Financial Disclaimers
                    </h2>
                    <p class="text-soft leading-relaxed mb-4">
                        <strong class="text-fg">Health Information:</strong>
                        Peakward and Healpen provide health and wellness features for informational
                        purposes only. They are not substitutes for professional medical advice,
                        diagnosis, or treatment. Always seek the advice of a qualified health
                        provider with any questions regarding a medical condition.
                    </p>
                    <p class="text-soft leading-relaxed">
                        <strong class="text-fg">Financial Information:</strong>
                        Budget Coach provides budgeting tools for personal use. It is not a
                        substitute for professional financial advice. We are not responsible for any
                        financial decisions you make based on information presented in the app.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Privacy</h2>
                    <p class="text-soft leading-relaxed">
                        Your privacy is important to us. Please review the Privacy Policy for each
                        App to understand how we collect, use, and protect your information:
                    </p>
                    <ul class="list-disc list-inside text-soft space-y-2 mt-4">
                        <li>
                            <NuxtLink
                                to="/privacy/peakward"
                                class="text-brand underline underline-offset-2"
                                >Peakward Privacy Policy</NuxtLink
                            >
                        </li>
                        <li>
                            <NuxtLink
                                to="/privacy/budget-coach"
                                class="text-brand underline underline-offset-2"
                                >Budget Coach Privacy Policy</NuxtLink
                            >
                        </li>
                        <li>
                            <NuxtLink
                                to="/privacy/healpen"
                                class="text-brand underline underline-offset-2"
                                >Healpen Privacy Policy</NuxtLink
                            >
                        </li>
                        <li>
                            <NuxtLink
                                to="/privacy/lsom"
                                class="text-brand underline underline-offset-2"
                                >lsom Privacy Policy</NuxtLink
                            >
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Disclaimer of Warranties</h2>
                    <p class="text-soft leading-relaxed">
                        The Apps are provided "as is" and "as available" without any warranties of
                        any kind, express or implied. We do not warrant that the Apps will be
                        uninterrupted, error-free, or free of harmful components. Your use of the
                        Apps is at your sole risk.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Limitation of Liability</h2>
                    <p class="text-soft leading-relaxed">
                        To the fullest extent permitted by applicable law, Mike Zamayias shall not
                        be liable for any indirect, incidental, special, consequential, or punitive
                        damages, or any loss of profits or revenues, whether incurred directly or
                        indirectly, or any loss of data, use, goodwill, or other intangible losses
                        resulting from your use of the Apps.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Termination</h2>
                    <p class="text-soft leading-relaxed">
                        We may terminate or suspend your access to the Apps at any time, without
                        prior notice, for conduct that we believe violates these Terms or is harmful
                        to other users, us, or third parties. You may stop using the Apps at any
                        time by deleting your account and uninstalling the app.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Governing Law</h2>
                    <p class="text-soft leading-relaxed">
                        These Terms shall be governed by and construed in accordance with the laws
                        of Greece, without regard to its conflict of law provisions.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Changes to These Terms</h2>
                    <p class="text-soft leading-relaxed">
                        We reserve the right to modify these Terms at any time. If we make material
                        changes, we will update the "Last updated" date at the top of this page.
                        Your continued use of the Apps after changes are posted constitutes your
                        acceptance of the modified Terms.
                    </p>
                </section>

                <section>
                    <h2 class="text-2xl font-semibold text-fg mb-4">Contact Us</h2>
                    <p class="text-soft leading-relaxed">
                        If you have any questions about these Terms of Service, please contact us
                        at:
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
    </div>
</template>

<script setup lang="ts">
    const currentYear = new Date().getFullYear();

    useSeoMeta({
        title: "Terms of Service · Mike Zamayias",
        description:
            "Terms of Service for apps by Mike Zamayias, including Peakward, Budget Coach, Healpen, and lsom.",
    });
</script>
