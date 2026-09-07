# Personal Portfolio Website

A modern, responsive personal portfolio website built with **Nuxt.js 3**, **Vue 3**, and **TailwindCSS**. Features a clean, professional design with dark mode support and optimized performance.

## 🚀 Features

- **Modern Stack**: Built with Nuxt.js 3, Vue 3, and TypeScript
- **Responsive Design**: Optimized for all devices and screen sizes
- **Dark Mode**: Toggle between light and dark themes
- **Performance Optimized**: Fast loading with excellent Core Web Vitals
- **SEO Friendly**: Server-side rendering and meta tag optimization
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels
- **Smooth Animations**: Subtle transitions and hover effects
- **Component-Based**: Reusable, maintainable component architecture

## 📱 Sections

- **Hero**: Introduction with profile image and call-to-action buttons
- **About**: Personal and professional background with key highlights
- **Experience**: Professional timeline with achievements and technologies
- **Education**: Academic background and certifications
- **Skills**: Technical skills organized by categories with proficiency levels
- **Projects**: Featured projects with live demos and source code links
- **Contact**: Multiple contact methods with interactive form

## 🛠️ Tech Stack

### Core Technologies

- **[Nuxt.js 3](https://nuxt.com/)** - Vue.js framework with SSR/SSG
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework

### UI & Styling

- **[FontAwesome](https://fontawesome.com/)** - Icon library
- **Material Design Colors** - Custom color system
- **Google Fonts** - Typography (Inter font family)
- **CSS Grid & Flexbox** - Modern layout techniques

### Development Tools

- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Git** - Version control

### Deployment & Hosting

- **[Firebase Hosting](https://firebase.google.com/docs/hosting)** - Static site hosting
- **GitHub Actions** - CI/CD pipeline (optional)

## 🏗️ Architecture

### Component Structure

```
components/
├── layout/
│   └── Header.vue              # Navigation header with smooth scrolling
├── sections/
│   ├── AboutSection.vue        # Personal background and highlights
│   ├── ContactSection.vue      # Contact form and information
│   ├── EducationSection.vue    # Education and certifications
│   ├── ExperienceSection.vue   # Professional timeline
│   ├── HeroSection.vue         # Main landing section
│   ├── ProjectsSection.vue     # Featured projects showcase
│   └── SkillsSection.vue       # Technical skills display
├── content/                   # Nuxt Content prose components
└── ui/                        # Shadcn UI reusable components
```

### Pages Structure

```
pages/
├── index.vue                   # Main portfolio page
├── contact/
│   └── index.vue              # Dedicated contact page
└── [...slug].vue              # 404 error page
```

### Utilities

```
utils/
└── common.ts                   # Shared utility functions
```

## 📦 Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **Bun** package manager/runtime

### Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/mikezamayias/personal-website-v1.git
    cd personal-website-v1
    ```

2. **Install dependencies**

    ```bash
    bun install
    ```

3. **Start development server**

    ```bash
    bun run dev
    ```

4. **Open in browser**
   Navigate to `http://localhost:3000` (or the port shown in terminal)

## 🚀 Deployment

### Firebase Hosting

1. **Authenticate with Firebase CLI**

    ```bash
    bunx firebase-tools login
    ```

2. **Build the application**

    ```bash
    bun run generate
    ```

3. **Deploy to Firebase**

    ```bash
    bunx firebase-tools deploy
    ```

### Other Platforms

The built application (`/.output` or `/dist`) can be deployed to:

- **Vercel**: Import GitHub repository
- **Netlify**: Drag and drop dist folder or Git integration
- **GitHub Pages**: Use GitHub Actions workflow
- **Any static hosting**: Upload the generated files

## ⚙️ Configuration

### Customization

1. **Personal Information**: Update content in section components
2. **Colors**: Modify `tailwind.config.ts` for color scheme
3. **Fonts**: Change Google Fonts in `nuxt.config.ts`
4. **Meta Tags**: Update SEO information in page components
5. **Resume**: Replace `public/resume.pdf` with your CV

### Environment Variables

Create a `.env` file for any API keys or configuration:

```env
# Example environment variables
CONTACT_FORM_ENDPOINT=your-form-endpoint
ANALYTICS_ID=your-analytics-id
```

## 🔧 Development

### Project Scripts

```bash
# Development server
bun run dev

# Build for production
bun run build

# Generate static site
bun run generate

# Preview production build
bun run preview

# Lint code
bun run lint

# Type check
bun run type-check
```

### Code Quality

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Configured with Vue.js and TypeScript rules
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit hooks for code quality

## 📈 Performance Optimizations

### Implemented Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Optimized images and lazy loading
- **Font Loading**: Optimized Google Fonts loading
- **CSS Purging**: Unused CSS removal in production
- **Minification**: JavaScript and CSS minification
- **Gzip Compression**: Server-side compression

### Performance Metrics

- **Lighthouse Score**: 95+ for all categories
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## 🔄 Recent Changes & Simplifications

### Major Refactoring (July 2025)

- **Component Architecture**: Created reusable components (`SectionWrapper`, `SkillCard`, `ProjectCard`)
- **Code Reduction**: Eliminated ~1,400 lines of redundant code
- **Data-Driven Approach**: Moved all content to reactive data arrays
- **Type Safety**: Added comprehensive TypeScript interfaces
- **Performance**: Improved build times and bundle size

### Removed Components

- ✅ Removed duplicate `*_SIMPLIFIED.vue` files
- ✅ Removed unused `components/index/` directory
- ✅ Removed `AnimatedSection.vue`, `Dialog.vue`, `Modal.vue`
- ✅ Cleaned up redundant template code

### Component Reductions

- **HeroSection**: 211 → 150 lines (-29%)
- **SkillsSection**: 268 → 70 lines (-74%)
- **ProjectsSection**: 329 → 120 lines (-64%)
- **ExperienceSection**: 247 → 80 lines (-68%)
- **AboutSection**: ~200 → 120 lines (-40%)
- **ContactSection**: ~250 → 130 lines (-48%)
- **EducationSection**: ~300 → 150 lines (-50%)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

### Mike Zamayias

- Website: [mikezamayias.dev](https://mikezamayias.dev)
- GitHub: [@mikezamayias](https://github.com/mikezamayias)
- LinkedIn: [mikezamayias](https://linkedin.com/in/mikezamayias)
- Email: <mike@zamayias.com>

## 🙏 Acknowledgments

- **Nuxt.js Team** for the amazing framework
- **Vue.js Community** for the excellent ecosystem
- **TailwindCSS** for the utility-first CSS approach
- **FontAwesome** for the comprehensive icon library
- **Vercel/Netlify/Firebase** for excellent hosting solutions

---

⭐ **Star this repository if you found it helpful!**

```bash
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
