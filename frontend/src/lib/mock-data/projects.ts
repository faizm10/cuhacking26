import type { GameType, Project, ProjectStatus } from "@/types";

// Temporary stand-in for Supabase data. Replace with a real query once the
// `projects` table exists — the shape mirrors the intended schema.

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_PROJECTS: Project[] = [
  {
    id: "mock-1",
    name: "Moon Jumper",
    gameType: "platformer",
    status: "playable",
    thumbnailUrl: null,
    updatedAt: daysAgo(0),
  },
  {
    id: "mock-2",
    name: "Sliding Sushi",
    gameType: "puzzle",
    status: "generating",
    thumbnailUrl: null,
    updatedAt: daysAgo(1),
  },
  {
    id: "mock-3",
    name: "Cave of Doodles",
    gameType: "adventure",
    status: "draft",
    thumbnailUrl: null,
    updatedAt: daysAgo(4),
  },
];

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  platformer: "Platformer",
  puzzle: "Puzzle",
  adventure: "Adventure",
};

export const GAME_TYPE_OPTIONS = (
  Object.entries(GAME_TYPE_LABELS) as [GameType, string][]
).map(([value, label]) => ({ value, label }));

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  playable: "Playable",
};
