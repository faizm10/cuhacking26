# PlayBox Backend

Fastify + TypeScript service that turns tldraw sketches into playable 2D
platformer levels using Google Gemini.

```
tldraw sketch (screenshot + shapes + prompt)
        → POST /api/games/generate
        → Gemini (structured JSON output)
        → Zod validation (one repair retry)
        → Level JSON for the Phaser frontend
```

## Endpoints

### `GET /health`

Liveness plus a feature report:

```json
{
  "status": "ok",
  "gemini": "mock",
  "firestore": "disabled",
  "storage": "disabled",
  "uptime": 12,
  "timestamp": "2026-07-11T00:00:00.000Z"
}
```

### `POST /api/games/generate`

Request body (all coordinates in canvas pixels):

```json
{
  "projectId": "optional-project-id",
  "prompt": "make it a lava level with lots of coins",
  "screenshot": "data:image/png;base64,...",
  "shapes": [{ "type": "geo", "x": 100, "y": 600, "props": { "w": 400, "h": 40 } }]
}
```

At least one of `screenshot` / `shapes` is required. Response:

```json
{
  "source": "gemini",
  "levelId": "firestore-doc-id-or-null",
  "screenshotUrl": "gcs-url-or-null",
  "level": {
    "name": "…",
    "theme": "lava",
    "world": { "width": 1600, "height": 900, "gravity": 1200 },
    "player": { "x": 80, "y": 700 },
    "goal": { "x": 1500, "y": 180 },
    "platforms": [{ "x": 0, "y": 800, "width": 620, "height": 100, "kind": "static" }],
    "hazards": [{ "x": 620, "y": 860, "width": 380, "height": 40, "type": "lava" }],
    "coins": [{ "x": 400, "y": 740 }],
    "enemies": [{ "x": 300, "y": 760, "type": "walker", "patrolDistance": 200 }]
  }
}
```

Errors are always `{ "error": { "code", "message", "details?" } }` — `400` for
bad requests, `502` when Gemini fails or returns an invalid level twice.

## Running locally

```bash
cd backend
npm install
cp .env.example .env    # defaults to mock mode — no keys needed
npm run dev             # http://localhost:8080
```

Set `USE_MOCK_GEMINI=false` and add a `GEMINI_API_KEY`
([aistudio.google.com](https://aistudio.google.com/apikey)) for real
generations. `GOOGLE_CLOUD_PROJECT` (Firestore) and `GCS_BUCKET` (screenshot
uploads) are optional — persistence is skipped cleanly when they're unset.

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Dev server with reload (tsx watch) |
| `npm run build`     | Compile to `dist/`                 |
| `npm start`         | Run the compiled server            |
| `npm run typecheck` | Type-check without emitting        |

## Structure

```
src/
  index.ts        # Entrypoint + graceful shutdown (Cloud Run SIGTERM)
  app.ts          # Fastify assembly: CORS, routes, error handler
  config/env.ts   # Zod-validated environment (fails fast, clear messages)
  routes/         # /health, /api/games/generate
  services/       # gemini.ts, firestore.ts, storage.ts
  schemas/        # Level + request schemas (Zod → JSON Schema for Gemini)
  prompts/        # Sketch-to-level prompt builder + repair prompt
  utils/          # Errors, mock level, tldraw shape summarizer
```

## Deploying to Cloud Run

```bash
gcloud run deploy playbox-backend \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "USE_MOCK_GEMINI=false,GEMINI_MODEL=gemini-2.5-flash,GCS_BUCKET=your-bucket,CORS_ORIGIN=https://your-frontend.example" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest"
```

Notes:

- The container listens on `PORT` (Cloud Run sets it) and handles `SIGTERM`
  for graceful shutdown.
- `GOOGLE_CLOUD_PROJECT` is provided by Cloud Run automatically, which enables
  Firestore. Grant the service account `roles/datastore.user` and
  `roles/storage.objectCreator` on the bucket.
- Store `GEMINI_API_KEY` in Secret Manager (as above), not in plain env vars.
