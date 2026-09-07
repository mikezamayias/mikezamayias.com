// Common utility functions used across components

export const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: "smooth" });
    }
};

export const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
};

export const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
    });
};

export const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Common animation classes
export const commonAnimations = {
    fadeInUp: "transition-all duration-500 hover:-translate-y-2",
    scaleOnHover: "transition-transform duration-300 hover:scale-105",
    shadowOnHover: "transition-all duration-300 hover:shadow-xl",
    cardHover: "transition-all duration-300 hover:shadow-xl hover:-translate-y-2",
};

// Common color classes — Plan A semantic aliases (auto-swap via html[data-theme])
export const commonColors = {
    primary: "text-brand",
    secondary: "text-soft",
    onBackground: "text-fg",
    onSurface: "text-soft",
};
