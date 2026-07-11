# PlayBox

Turn your sketches into playable games. PlayBox is an AI-powered web app
where you draw a game idea on a canvas and AI turns it into a real, playable
game.

**Current status:** foundation only — landing page, dashboard with mock data,
and Supabase client scaffolding. The drawing canvas, game engine, and AI
generation come next.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)
- Framer Motion
- Supabase (client setup only, not yet wired to data)

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — the app runs fine without Supabase
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page and
[http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the
dashboard.

## Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start the dev server           |
| `npm run build`    | Production build               |
| `npm run lint`     | Run ESLint                     |
| `npx tsc --noEmit` | Type-check without emitting    |

## Project structure

```
src/
  app/                  # Routes: / (landing), /dashboard
  components/
    landing/            # Hero, ProductFlow, FeatureSection, CTASection, Footer
    dashboard/          # ProjectCard, ProjectGrid, NewProjectModal, EmptyState
    layout/             # Navbar, Sidebar, DashboardHeader, Logo
    ui/                 # shadcn/ui primitives
  lib/
    supabase/           # Browser + server clients (null when env is unset)
    mock-data/          # Mock projects — replace with Supabase queries later
  types/                # Shared domain types (Project, GameType, ...)
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project values.
The app runs without them — the Supabase clients return `null` until
configured, and the dashboard uses local mock data.
