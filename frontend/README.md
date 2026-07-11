# PlayBox Frontend

The web app for PlayBox — landing page, dashboard, and the tldraw drawing
editor.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — landing page
- `/dashboard` — your projects (mock data for now)
- `/project/[id]` — the drawing editor (tldraw)

## Built with

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion,
tldraw, and Supabase (client setup only — not wired to data yet).

## Folders

```
src/
  app/          # Pages and routes
  components/   # UI pieces (landing, dashboard, canvas, layout, ui)
  lib/          # Supabase clients, mock data, helpers
  types/        # Shared TypeScript types
```

## Environment

Optional — the app runs fine without it:

```bash
cp .env.example .env.local   # add Supabase keys when ready
```
