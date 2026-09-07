// Base interface for all Firestore documents
export interface FirestoreDoc {
    id?: string;
}

// Profile (single document)
export interface Profile extends FirestoreDoc {
    name: string;
    title: string;
    tagline: string;
}

// Social link
export interface Social extends FirestoreDoc {
    platform: string;
    url: string;
    iconSet: string;
    iconName: string;
    order: number;
}

// Experience entry
export interface Experience extends FirestoreDoc {
    company: string;
    title: string;
    period: string;
    location?: string;
    description?: string;
    status?: "Current" | "Completed" | "Foundation";
    achievements?: string[];
    technologies?: string[];
    order: number;
}

// Project
export interface Project extends FirestoreDoc {
    title: string;
    description: string;
    category?: string;
    status?: "Live" | "In Development" | "Completed" | "Archived";
    type?: string;
    iconSet?: string;
    iconName?: string;
    techStack?: string[];
    features?: string[];
    githubUrl?: string;
    demoUrl?: string;
    demoText?: string;
    order: number;
}

// Skill item within a skill category
export interface SkillItem {
    name: string;
    level?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    percentage?: number;
}

// Skill category
export interface SkillCategory extends FirestoreDoc {
    title: string;
    description?: string;
    iconSet?: string;
    iconName?: string;
    skills: SkillItem[];
    order: number;
}

// Education entry
export interface Education extends FirestoreDoc {
    degree: string;
    institution: string;
    period: string;
    location: string;
    description?: string;
    subjects?: string[];
    order: number;
}

// Certification
export interface Certification extends FirestoreDoc {
    title: string;
    issuer: string;
    date: string;
    description?: string;
    iconSet: string;
    iconName: string;
    link?: string;
    order: number;
}

// Contact method
export interface Contact extends FirestoreDoc {
    label: string;
    type?: string;
    value?: string;
    encodedValue?: string;
    href?: string;
    iconSet?: string;
    iconName?: string;
    external?: boolean;
    order: number;
}

// Settings (single document)
export interface Settings extends FirestoreDoc {
    allowedAdminIds: string[];
    siteEnabled?: boolean;
}
