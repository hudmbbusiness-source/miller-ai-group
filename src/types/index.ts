export * from './database'

export interface PressLink {
  title: string
  url: string
  image?: string
  source?: string
  date?: string
}

export interface Project {
  slug: string
  name: string
  description: string
  longDescription: string
  status: 'active' | 'development' | 'coming-soon' | 'past'
  logoPath?: string
  category: 'technology' | 'venture' | 'past'
  website?: string
  instagram?: string
  pressLinks?: PressLink[]
}

export const PROJECTS: Project[] = [
  {
    slug: 'kachow',
    name: 'Kachow AI',
    description: 'AI auto-editing software that edits according to live algorithmic data from YouTube.',
    longDescription: 'Kachow AI is an advanced auto-editing platform that leverages real-time YouTube algorithmic data to identify viral moments in long-form content. The system automatically generates optimized short-form clips designed for maximum engagement and distribution across social platforms.',
    status: 'development',
    logoPath: '/logos/kachow.png',
    category: 'technology',
    instagram: 'https://www.instagram.com/kachowai/',
  },
  {
    slug: 'stuntman',
    name: 'StuntMan AI',
    description: 'High-frequency micro-scalping crypto trading system using advanced AI analytics.',
    longDescription: 'StuntMan AI is a sophisticated high-frequency trading system exclusively targeting cryptocurrency markets. Built with advanced AI data analysis and precision-focused analytical strategies, StuntMan aims to execute micro-scalping trades with maximum accuracy. Currently in active development.',
    status: 'development',
    logoPath: undefined,
    category: 'technology',
  },
  {
    slug: 'brainbox',
    name: 'BrainBox',
    description: 'Cross-AI memory and reasoning system connecting OpenAI, Anthropic, and Gemini.',
    longDescription: 'BrainBox provides a unified memory and context layer that works across multiple AI providers including OpenAI, Anthropic, and Google Gemini. It enables persistent knowledge, seamless model switching, and compounding intelligence across all your AI interactions.',
    status: 'coming-soon',
    logoPath: undefined,
    category: 'technology',
  },
  {
    slug: 'arcene',
    name: 'Arcene Studios',
    description: 'Unique streetwear clothing and apparel brand focused on high-quality design.',
    longDescription: 'Arcene Studios is a streetwear brand dedicated to creating unique, high-quality clothing and apparel. Focused on distinctive design and premium materials, Arcene represents the intersection of fashion and entrepreneurial vision.',
    status: 'active',
    logoPath: '/logos/arcene.png',
    category: 'venture',
    website: 'https://arcenestudios.com',
    instagram: 'https://www.instagram.com/arcenestudios/',
  },
  {
    slug: 'cozyfilmz',
    name: 'CozyFilmz',
    description: 'Drive-in theater experience featuring beloved classic films.',
    longDescription: 'CozyFilmz was a drive-in movie theater venture in Provo, Utah, bringing the nostalgic drive-in experience back to life by featuring the world\'s favorite classic movies rather than just new releases. As CEO and Co-Founder, this venture provided invaluable lessons in entrepreneurship, operations, real estate negotiations, and pivoting under pressure.',
    status: 'past',
    logoPath: '/logos/cozyfilmz.png',
    category: 'past',
    instagram: 'https://www.instagram.com/cozyfilmz_provo/',
    pressLinks: [
      {
        title: 'CozyFilmz Hosts Drive-In Movie',
        url: 'https://www.sltrib.com/news/2025/05/30/cozyfilmz-hosts-drive-in-movie/',
        source: 'Salt Lake Tribune',
        date: 'May 30, 2025',
        image: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&q=80',
      },
      {
        title: 'CozyFilmz Looking for New Home',
        url: 'https://www.sltrib.com/news/2025/07/02/cozyfilmz-looking-new-home-after/',
        source: 'Salt Lake Tribune',
        date: 'July 2, 2025',
        image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
      },
      {
        title: 'Drive-In Startup Looking for New Location',
        url: 'https://www.heraldextra.com/news/2025/jun/30/provo-drive-in-movie-startup-looking-for-new-location-after-lease-gets-terminated/',
        source: 'Herald Extra',
        date: 'June 30, 2025',
        image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80',
      },
    ],
  },
]

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/_hudson.miller',
  linkedin: 'https://www.linkedin.com/in/hudson-barnes-608074347',
}

// Career paths for Zuckerberg Project
export interface CareerPath {
  title: string
  category: 'internship' | 'entry' | 'mid' | 'senior' | 'founder'
  salaryRange: { min: number; max: number } | null
  description: string
  skills: string[]
  probability: number // 0-100
}

export const CAREER_PATHS: CareerPath[] = [
  {
    title: 'Technical Product Manager (AI/Platform)',
    category: 'entry',
    salaryRange: { min: 120000, max: 180000 },
    description: 'Lead AI product strategy, work with engineering teams, define roadmaps for AI-enabled products.',
    skills: ['Product Strategy', 'AI/ML Fundamentals', 'Technical Communication', 'Agile/Scrum'],
    probability: 75,
  },
  {
    title: 'AI Solutions Engineer',
    category: 'entry',
    salaryRange: { min: 130000, max: 200000 },
    description: 'Bridge technical AI capabilities with customer needs, implement AI solutions, drive adoption.',
    skills: ['Python', 'AI/ML', 'Customer-Facing', 'Solution Architecture'],
    probability: 70,
  },
  {
    title: 'Technical Program Manager (AI)',
    category: 'entry',
    salaryRange: { min: 140000, max: 190000 },
    description: 'Coordinate complex AI initiatives across teams, manage timelines, remove blockers.',
    skills: ['Program Management', 'Technical Background', 'Cross-Functional Leadership'],
    probability: 65,
  },
  {
    title: 'Applied Software Engineer (Product)',
    category: 'entry',
    salaryRange: { min: 150000, max: 250000 },
    description: 'Build user-facing AI products, integrate ML models into production systems.',
    skills: ['Full-Stack Development', 'ML Integration', 'System Design', 'Production Engineering'],
    probability: 80,
  },
  {
    title: 'AI Product Lead',
    category: 'mid',
    salaryRange: { min: 180000, max: 280000 },
    description: 'Own AI product vision, lead cross-functional teams, drive product-market fit.',
    skills: ['Product Leadership', 'AI Strategy', 'Team Management', 'Business Acumen'],
    probability: 50,
  },
  {
    title: 'Technical Co-Founder / CTO',
    category: 'founder',
    salaryRange: null,
    description: 'Build and lead technical teams, define technical vision, equity-based compensation.',
    skills: ['Technical Leadership', 'System Architecture', 'Team Building', 'Fundraising'],
    probability: 40,
  },
  {
    title: 'Software Engineering Intern',
    category: 'internship',
    salaryRange: { min: 8000, max: 12000 },
    description: 'Summer internship at top tech companies, learn production engineering.',
    skills: ['Data Structures', 'Algorithms', 'Coding Interview', 'Teamwork'],
    probability: 85,
  },
  {
    title: 'AI/ML Intern',
    category: 'internship',
    salaryRange: { min: 8500, max: 14000 },
    description: 'Work on AI/ML projects at leading companies, hands-on model development.',
    skills: ['Machine Learning', 'Python', 'TensorFlow/PyTorch', 'Data Analysis'],
    probability: 70,
  },
]
