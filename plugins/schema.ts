// SAFETY: innerHTML is used here to inject JSON-LD structured data via Nuxt's useHead().
// This is safe because the content is entirely static, hard-coded schema.org markup —
// no user input is interpolated. Nuxt's useHead serialises it as a <script type="application/ld+json">
// tag, which browsers do not execute as JavaScript.
const SITE_URL = "https://mikezamayias.com";
const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export default defineNuxtPlugin(() => {
    useHead({
        script: [
            {
                type: "application/ld+json",
                innerHTML: JSON.stringify({
                    "@context": "https://schema.org",
                    "@graph": [
                        {
                            "@type": "Person",
                            "@id": PERSON_ID,
                            name: "Mike Zamayias",
                            alternateName: "Michail Anargyros Zamagias",
                            jobTitle: "Mobile Engineer",
                            url: SITE_URL,
                            mainEntityOfPage: { "@id": WEBSITE_ID },
                            sameAs: [
                                "https://github.com/mikezamayias",
                                "https://www.linkedin.com/in/mikezamayias/",
                                "https://x.com/mikezamayias",
                                "https://pub.dev/publishers/mikezamayias.com/packages",
                            ],
                            knowsAbout: ["Flutter", "Dart", "Kotlin", "Swift", "iOS", "Android"],
                            address: {
                                "@type": "PostalAddress",
                                addressLocality: "Heraklion",
                                addressCountry: "GR",
                            },
                        },
                        {
                            "@type": "WebSite",
                            "@id": WEBSITE_ID,
                            url: SITE_URL,
                            name: "Mike Zamayias",
                            inLanguage: "en",
                            author: { "@id": PERSON_ID },
                            publisher: { "@id": PERSON_ID },
                        },
                    ],
                }),
            },
        ],
    });
});
