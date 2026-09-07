# Portfolio Redesign

## Design Decisions

| Aspect      | Decision                                        |
| ----------- | ----------------------------------------------- |
| Style       | Minimal & clean                                 |
| Colors      | Monochrome + blue accent (`#2563eb`)            |
| Typography  | Inter (body), JetBrains Mono (accents)          |
| Layout      | Single-page scroll                              |
| Sections    | Hero → Projects → Experience → Skills → Contact |
| Tone        | Professional & direct                           |
| Data Source | Decap CMS via Nuxt Content                      |

## Color Palette

- **Background:** `#ffffff` (white)
- **Text Primary:** `#111827` (gray-900)
- **Text Secondary:** `#6b7280` (gray-500)
- **Text Muted:** `#9ca3af` (gray-400)
- **Accent:** `#2563eb` (blue-600)
- **Accent Hover:** `#1d4ed8` (blue-700)
- **Border:** `#e5e7eb` (gray-200)
- **Card Hover:** `#f9fafb` (gray-50)

## Sections

### 1. Hero

**Content from CMS:** New `profile` collection (single file)

- Name: "Mike Zamayias"
- Title: "Mobile Engineer"
- Tagline: "Building polished Flutter and Android apps with clean architecture and CI/CD."
- Social links from `social` collection

**Layout:**

- Full viewport height, centered
- Name large and bold (text-5xl)
- Title in gray (text-xl)
- Tagline in lighter gray, max-w-lg
- Social icons row (GitHub, LinkedIn, Email)
- Scroll indicator at bottom

### 2. Projects

**Content from CMS:** `featured-projects` collection

**Layout:**

- Section title "Projects" left-aligned
- 2-column grid (1-col mobile)
- Cards with: title, description, tech tags
- Subtle border, hover lift with blue accent

### 3. Experience

**Content from CMS:** `experience` collection

**Layout:**

- Section title "Experience" left-aligned
- Vertical list, no timeline decorations
- Each entry: Company (bold) + Period (right), Role, Bullet achievements
- Sorted by status (Current first) then period

### 4. Skills

**Content from CMS:** `skills` collection

**Layout:**

- Section title "Skills" left-aligned
- Categories stacked vertically
- Skills as horizontal pill tags
- Hover: blue background, white text

### 5. Contact

**Content from CMS:** `contact` and `social` collections

**Layout:**

- Section title "Contact" left-aligned
- Brief CTA line
- Primary email button (blue)
- Social icon links below
- Footer with copyright

## CMS Changes Required

Add new `profile` collection (single file):

```yaml
- name: profile
  label: Profile
  files:
      - name: hero
        label: Hero Section
        file: content/profile/hero.yml
        fields:
            - { label: Name, name: name, widget: string }
            - { label: Title, name: title, widget: string }
            - { label: Tagline, name: tagline, widget: text }
```

## Implementation Tasks

1. Add `profile` collection to CMS config
2. Create `content/profile/hero.yml` with initial data
3. Update Tailwind config with new color tokens
4. Create new minimal components:
    - `HeroSection.vue`
    - `ProjectsSection.vue`
    - `ExperienceSection.vue`
    - `SkillsSection.vue`
    - `ContactSection.vue`
5. Update `pages/index.vue` to use new sections
6. Remove unused components and old color system
7. Test and deploy
