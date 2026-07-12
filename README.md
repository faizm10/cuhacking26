# PlayBox

🎮 Sketch a game. Generate it. Play it. Tweak it with AI.


<p align="center">
  <img src="frontend/public/hero.png" width="800" alt="PlayBox hero">
</p>

<p align="center">
  <a href="frontend/public/demo.mp4">Watch the demo →</a>
</p>

## Stack

Next.js, React, TypeScript, Tailwind, tldraw, OpenAI, Phaser, Fastify, Gemini

## Run

```bash
# one command
./dev.sh

# or frontend only (generate + play + chat)
cd frontend && npm i && cp .env.example .env.local && npm run dev
```

App → http://localhost:3000

## Env

`frontend/.env.local`
```
OPENAI_API_KEY=
OPENAI_MODEL=
USE_MOCK_OPENAI=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`backend/.env` (optional)
```
PORT=8080
USE_MOCK_GEMINI=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
CORS_ORIGIN=http://localhost:3000
```
