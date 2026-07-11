/**
 * Game types are inferred from the Zod schema so the renderer, API route,
 * and tests can never drift apart. Import types from here (or the schema
 * module directly) — both point at the same source of truth.
 */
export type {
  GameAppearance,
  GameCollectible,
  GameControls,
  GameEnemy,
  GameObstacle,
  GamePlatform,
  GamePlayer,
  GameRect,
  GameSpec,
  GenerationResult,
  SupportedGameType,
} from "@/lib/game/schema";
