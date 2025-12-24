# Miller AI Group

An entrepreneurial landing pad and hub for Hudson Barnes' technology ventures. This is a production-grade Next.js web application with Supabase backend.

## Features

- **Public Pages**
  - Landing page (`/`)
  - Resume viewer with PDF embed (`/resume`)
  - Project directory (`/projects`)
  - Unskippable intro video (`/intro`)

- **Private Hub** (requires GitHub login)
  - Dashboard with stats and quick actions (`/app`)
  - Notes with tags, pinning, and search (`/app/notes`)
  - Pinterest-style boards with image/link pins (`/app/boards`)
  - Link manager with categories (`/app/links`)
  - File upload/download manager (`/app/files`)
  - **Zuckerberg Project** - Full interactive roadmap with semester-based tracking (`/app/zuckerberg`)
  - Private project management with status & links (`/app/projects/[slug]`)
  - Settings to customize public content (`/app/settings`)
  - Admin system verification (`/app/admin/verify`)

- **Future Engine Hooks** (placeholders ready for integration)
  - Kachow AI (`/app/tools/kachow`)
  - Stuntman AI (`/app/tools/stuntman`)
  - BrainBox (`/app/tools/brainbox`)

## Mobile Support

The application is fully mobile-responsive with:
- **Minimum width**: 320px support
- **Bottom navigation**: Dedicated mobile nav bar (hidden on desktop)
- **Touch targets**: All interactive elements are at least 44px
- **No horizontal scrolling**: Content adapts to all screen sizes
- **Safe area support**: iOS notch/home indicator compatibility
- **Reduced motion**: Respects `prefers-reduced-motion` setting

## SEO Implementation

- **Dynamic metadata**: Per-page title, description, and OpenGraph tags
- **Sitemap**: Auto-generated at `/sitemap.xml`
- **Robots.txt**: Generated at `/robots.txt` (private routes excluded)
- **Semantic HTML**: Proper heading hierarchy (h1-h3)
- **Social cards**: Twitter and OpenGraph support

## Analytics Integration

Analytics is provider-agnostic. Enable via environment variables:

```env
# Choose provider: 'vercel' | 'plausible' | 'posthog' | 'none'
NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel

# For Plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com

# For PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Supported Providers
- **Vercel Analytics**: Zero-config with Vercel deployment
- **Plausible**: Privacy-friendly, lightweight
- **PostHog**: Feature flags, session recording, product analytics

## Owner Model

This is a **single-owner system**. The first user to log in becomes the owner and has full control.

### How Owner Assignment Works
1. First authenticated user is automatically set as owner
2. Owner ID is stored in `site_settings` table
3. Only the owner can:
   - Edit public site content
   - Modify project statuses
   - Add/edit resume items
   - Access admin features

### Reset Owner (SQL)
If you need to reset the owner:
```sql
-- Remove current owner
DELETE FROM site_settings;

-- Next login will become the new owner
```

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Animation**: Framer Motion
- **Forms**: Zod + react-hook-form
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Auth**: GitHub OAuth via Supabase

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)
- GitHub account (for OAuth)

## Local Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd miller-ai-group
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL
   - anon public key
   - service_role key (keep secret!)

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run Database Schema

1. Go to **Supabase Dashboard > SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the script
4. Then run `supabase/schema-v2.sql` for owner model and additional features
5. This creates all tables, RLS policies, and storage buckets

### 5. Configure GitHub OAuth

1. Go to **Supabase Dashboard > Authentication > Providers**
2. Enable **GitHub**
3. Go to [GitHub Developer Settings](https://github.com/settings/developers)
4. Create a new OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase GitHub provider settings

### 6. Add Assets

Place these files in the `public` directory:

```
public/
├── intro.mp4              # Intro video (required for /intro)
├── resume.pdf             # Resume PDF (required for /resume)
└── zuckerberg.pdf         # Zuckerberg Project PDF (for /app/zuckerberg)
```

**File naming is exact.** If files are missing, the app will show fallback UI with instructions.

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Vercel Deployment

### 1. Connect Repository

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel auto-detects Next.js

### 2. Configure Environment Variables

In Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL (e.g., `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | (Optional) `vercel`, `plausible`, or `posthog` |

### 3. Update Supabase Redirect URLs

1. Go to **Supabase Dashboard > Authentication > URL Configuration**
2. Add your production URL to:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

### 4. Update GitHub OAuth

In your GitHub OAuth App settings, add:
- Homepage URL: `https://your-app.vercel.app`
- Callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. Deploy

Click "Deploy" in Vercel. The build will run automatically.

## Storage Buckets

The schema creates two storage buckets:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `hudson-files` | No | General file uploads |
| `board-images` | Yes | Board pin images |

If buckets aren't created automatically:
1. Go to **Supabase Dashboard > Storage**
2. Create buckets manually with the names above
3. Set `hudson-files` as private, `board-images` as public

## Environment Validation

The app validates required environment variables at runtime:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Recommended:**
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)
- `NEXT_PUBLIC_SITE_URL` (defaults to kachow.app)

**Optional:**
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`
- Provider-specific keys (Plausible domain, PostHog key)

## Future Engine Checklist

The following tool pages are ready for future engine integration:

| Engine | Page | Status |
|--------|------|--------|
| Kachow AI | `/app/tools/kachow` | Placeholder ready |
| Stuntman AI | `/app/tools/stuntman` | Placeholder ready |
| BrainBox | `/app/tools/brainbox` | Placeholder ready |

Each page includes:
- Connection status indicator
- Integration readiness checklist
- Quick action buttons (disabled until connected)

To connect an engine:
1. Deploy the engine with API endpoints
2. Configure webhook URLs
3. Update the tool status in database

## Verification Checklist

After deployment, verify each feature:

| Route | Test |
|-------|------|
| `/health` | Returns JSON with status and env flags |
| `/sitemap.xml` | Valid XML sitemap |
| `/robots.txt` | Valid robots file |
| `/intro` | Video plays, cannot skip, button appears at end |
| `/` | Landing page loads with correct links |
| `/resume` | PDF viewer shows, download works |
| `/projects` | Project grid displays |
| `/login` | GitHub OAuth redirects properly |
| `/app` | Dashboard shows after login |
| `/app/notes` | Create, edit, delete, pin, search notes |
| `/app/boards` | Create board, add pins, upload images |
| `/app/links` | Add, edit, delete links with validation |
| `/app/files` | Upload, download, delete files |
| `/app/zuckerberg` | Add/complete checklist items, export JSON |
| `/app/settings` | Edit content, changes reflect on public pages |
| `/app/tools/*` | Engine hook pages display status |
| `/app/admin/verify` | System verification shows all green |

## Project Structure

```
miller-ai-group/
├── src/
│   ├── app/
│   │   ├── (hub)/           # Private hub routes (wrapped in auth layout)
│   │   │   └── app/
│   │   │       ├── page.tsx      # Dashboard
│   │   │       ├── notes/
│   │   │       ├── boards/
│   │   │       ├── links/
│   │   │       ├── files/
│   │   │       ├── zuckerberg/
│   │   │       ├── tools/        # Engine integration hooks
│   │   │       │   ├── kachow/
│   │   │       │   ├── stuntman/
│   │   │       │   └── brainbox/
│   │   │       ├── projects/
│   │   │       ├── settings/
│   │   │       └── admin/
│   │   ├── auth/            # Auth callback
│   │   ├── intro/           # Intro video page
│   │   ├── login/           # Login page
│   │   ├── projects/        # Public projects
│   │   ├── resume/          # Public resume
│   │   ├── health/          # Health check API
│   │   ├── sitemap.ts       # Dynamic sitemap
│   │   ├── robots.ts        # Robots.txt
│   │   ├── page.tsx         # Landing page
│   │   └── layout.tsx       # Root layout
│   ├── components/
│   │   ├── hub/             # Hub-specific components
│   │   │   ├── hub-layout.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── ui/              # shadcn/ui components
│   │   └── pdf-viewer.tsx
│   ├── hooks/
│   │   └── useMediaQuery.ts # Responsive hooks
│   ├── lib/
│   │   ├── supabase/        # Supabase client utilities
│   │   ├── actions/         # Server actions
│   │   ├── analytics.ts     # Analytics abstraction
│   │   ├── env.ts           # Environment validation
│   │   ├── owner.ts         # Owner utilities
│   │   ├── seo.ts           # SEO configuration
│   │   └── utils.ts
│   ├── ui/
│   │   └── theme.ts         # Design system tokens
│   └── types/
│       ├── database.ts      # Supabase types
│       └── index.ts         # Shared types
├── supabase/
│   ├── schema.sql           # Database schema
│   └── schema-v2.sql        # Owner model schema
├── public/
│   ├── intro.mp4            # Add your intro video
│   ├── resume.pdf           # Add your resume
│   └── zuckerberg.pdf       # Add project PDF
├── .env.example
├── middleware.ts            # Auth middleware
└── README.md
```

## What's Implemented vs Known Limitations

### Fully Implemented
- Owner/admin model with automatic first-user assignment
- Content management system (DB-driven public content)
- Notes, Boards, Links, Files - full CRUD
- Zuckerberg Project - interactive semester-based roadmap
- Private project management with status badges & links
- System verification page (`/app/admin/verify`)
- Health endpoint with owner status
- GitHub OAuth authentication
- Mobile-first responsive design
- SEO (sitemap, robots, metadata)
- Analytics abstraction layer
- Engine integration hook pages
- Environment validation

### Known Limitations
- **Project Engines**: Kachow, StuntMan, BrainBox are placeholders. No AI/trading/video logic.
- **Business Card Generator**: Marked as TODO - requires PDF generation library
- **Multi-user Support**: Single-owner only
- **Email Notifications**: No email integration
- **Analytics Dashboard**: Tracking only, no visible dashboard

## Notes

- This is a **single-owner hub**. RLS policies ensure only the owner can access their data.
- The intro video is **unskippable by design**. Users must wait for it to finish.
- All CRUD operations are wired to Supabase. No mock data.
- Project integrations show "Not connected" status until you manually change them.
- Mobile navigation uses bottom tab bar, desktop uses sidebar.
- All animations respect `prefers-reduced-motion`.

## Social Links

- Instagram: https://www.instagram.com/_hudson.miller
- LinkedIn: https://www.linkedin.com/in/hudson-barnes-608074347

## License

Private. All rights reserved.
