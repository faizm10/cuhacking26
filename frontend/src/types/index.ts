export type GameType = "platformer" | "puzzle" | "adventure";

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
