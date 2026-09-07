// TypeScript interfaces for the portfolio website

export interface BaseContent {
    id?: string;
    order?: number;
}

export interface Profile {
    name: string;
    title: string;
    tagline: string;
}

// Experience types
export interface Experience extends BaseContent {
    title: string;
    company: string;
    period: string;
    location: string;
    status: string;
    description: string;
    achievements: string[];
    technologies: string[];
}

// Education types
export interface Education extends BaseContent {
    degree: string;
    institution: string;
    period: string;
    location: string;
    description: string;
    subjects?: string[];
}

export interface Certification extends BaseContent {
    title: string;
    issuer: string;
    date: string;
    description?: string;
    icon: [string, string];
    link?: string;
}

// Project types
export interface Project extends BaseContent {
    title: string;
    description: string;
    category: string;
    status: string;
    type: string;
    icon: [string, string];
    techStack: string[];
    features: string[];
    demoUrl?: string;
    demoText?: string;
    githubUrl?: string;
}

// Skills types
export interface Skill {
    name: string;
    level: string;
    percentage: number;
}

export interface SkillCategory extends BaseContent {
    title: string;
    description: string;
    icon: [string, string];
    skills: Skill[];
}

export interface Contact extends BaseContent {
    label: string;
    value: string;
    href: string;
    icon: [string, string];
    external: boolean;
}

export interface Social extends BaseContent {
    platform: string;
    url: string;
    icon: [string, string];
}

// Type aliases for data files
export type ContactMethod = Contact;
export type SocialLink = Social;
export type FeaturedProject = Project;
export type OtherProject = Partial<Project> &
    Pick<Project, "title" | "description" | "category" | "icon" | "techStack">;

// Additional tech type for skills
export interface AdditionalTech {
    name: string;
    icon: [string, string];
}
