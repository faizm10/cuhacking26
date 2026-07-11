# PlayBox

Sketch a game. Generate it. Play it. Tweak it with AI.

PlayBox turns a drawing (or an uploaded image) into a playable browser game.
You label the canvas, describe what should happen, hit Generate, then iterate
with chat or by editing the sketch and regenerating.

## How it works

```
Sketch / upload on tldraw
  + text labels + game description
        ↓
POST /api/generate-game  (Next.js → OpenAI)
        ↓
Validated GameSpec (JSON)
        ↓
Play in the browser (HTML Canvas renderer)
        ↓
Chat → POST /api/refine-game  (tweak rules live)
  or edit the sketch → Regenerate from sketch
```

Supported templates: `dodge`, `collect`, `pong`, `snake`, `maze`, `clicker`,
`simple-shooter`, `platform-jumper`.

More detail on the design: [GAME_PIPELINE.md](GAME_PIPELINE.md).

## Project layout

| Folder      | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `frontend/` | Next.js app — landing, dashboard, editor, generate/refine API routes       |
| `backend/`  | Optional Fastify + Gemini service (platformer level JSON; see its README)  |

## Quick start

**One command** (frontend + backend):

```bash
./dev.sh
```

- App: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:8080/health](http://localhost:8080/health)

**Frontend only** (enough for generate + play + chat):

```bash
cd frontend
npm install
cp .env.example .env.local   # add OPENAI_API_KEY (see below)
npm run dev
```

## Environment

Generation runs in the **frontend** Next.js server routes. Put secrets in
`frontend/.env.local` (gitignored), never with a `NEXT_PUBLIC_` prefix:

```bash
# frontend/.env.local
OPENAI_API_KEY=sk-...
USE_MOCK_OPENAI=false
# OPENAI_MODEL=gpt-4.1-mini   # optional; default is gpt-4.1-mini (fast).
#                             # Use gpt-5-mini for higher quality / slower runs.
```

`OPEN_API_KEY` is also accepted as an alias for `OPENAI_API_KEY`.

Set `USE_MOCK_OPENAI=true` to exercise the UI without calling OpenAI (example
games + simple chat patches).

Optional Supabase keys are documented in `frontend/.env.example`.

## Using the editor

1. Create a project from the dashboard.
2. Sketch on the canvas, **upload / drop** a drawing, and add text labels
   (Player, Enemy, Coin, Goal, or freeform instructions).
3. Fill in **What should happen in this game?**
4. Hit **Generate** — the right panel plays the result.
5. **Chat** to tweak rules (“make enemies faster”, “add more coins”), or edit
   the sketch and **Regenerate from sketch** for layout changes.

## Scripts

| Command              | Where      | Description                |
| -------------------- | ---------- | -------------------------- |
| `./dev.sh`           | repo root  | Start frontend + backend   |
| `npm run dev`        | `frontend` | Next.js dev server         |
| `npm run build`      | `frontend` | Production build           |
| `npm run test`       | `frontend` | Vitest unit tests          |
| `npm run lint`       | `frontend` | ESLint                     |
| `npm run dev`        | `backend`  | Fastify API (optional)     |

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, tldraw,
  OpenAI SDK (server routes), HTML Canvas game renderer
- **Backend (optional):** Fastify, Zod, Google Gemini

Each package has its own README (`frontend/README.md`, `backend/README.md`).

## Contributors

- [Yolanda Guo](https://github.com/yolandaguoo)
- [Faiz Mustansar](https://github.com/faizm10)
