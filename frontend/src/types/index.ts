import type { GameSpec, SupportedGameType } from "@/types/game";

export type GameType = SupportedGameType;

export type ProjectStatus = "draft" | "generating" | "playable";

export interface Project {
  id: string;
  name: string;
  gameType: GameType;
  status: ProjectStatus;
  /** URL of the generated thumbnail; null renders a placeholder. */
  thumbnailUrl: string | null;
  updatedAt: string; // ISO 8601
}

export interface NewProjectInput {
  name: string;
  gameType: GameType;
}

/** Mirrors backend/src/schemas/level.ts — logical world for generated levels. */
export type LevelTheme =
  | "grass"
  | "desert"
  | "ice"
  | "lava"
  | "space"
  | "cave";

export interface LevelPosition {
  x: number;
  y: number;
}

export interface LevelRect extends LevelPosition {
  width: number;
  height: number;
}

export interface LevelPlatform extends LevelRect {
  kind: "static" | "moving" | "crumbling";
}

export interface LevelHazard extends LevelRect {
  type: "spikes" | "lava" | "water";
}

export interface LevelEnemy extends LevelPosition {
  type: "walker" | "flyer";
  patrolDistance: number;
}

export interface Level {
  name: string;
  theme: LevelTheme;
  world: {
    width: number;
    height: number;
    gravity: number;
  };
  player: LevelPosition;
  goal: LevelPosition;
  platforms: LevelPlatform[];
  hazards: LevelHazard[];
  coins: LevelPosition[];
  enemies: LevelEnemy[];
}

export interface GenerateResponse {
  source: "gemini" | "mock";
  levelId: string | null;
  screenshotUrl: string | null;
  game: GameSpec;
}

export type { GameSpec, SupportedGameType } from "@/types/game";
