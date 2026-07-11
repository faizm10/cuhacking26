# PlayBox

Draw a game. Play it.

PlayBox is an AI-powered web app where you sketch a game level on a canvas,
and AI turns it into a real, playable 2D platformer.

## How it works

```
You sketch a level (tldraw)
        ↓
Backend sends it to Google Gemini
        ↓
Gemini returns the level as JSON
        ↓
The game runs in your browser (Phaser — coming soon)
```

## Project layout

| Folder      | What it is                                            |
| ----------- | ----------------------------------------------------- |
| `frontend/` | The web app — landing page, dashboard, drawing editor |
| `backend/`  | The API — turns sketches into game levels with Gemini |

Each folder has its own README with more detail.

## Quick start

**Frontend** (http://localhost:3000):

```bash
cd frontend
npm install
npm run dev
```

**Backend** (http://localhost:8080):

```bash
cd backend
npm install
cp .env.example .env   # starts in mock mode — no API key needed
npm run dev
```

That's it. The frontend runs on its own, and the backend answers with a
sample level until you add a Gemini API key (see `backend/README.md`).
