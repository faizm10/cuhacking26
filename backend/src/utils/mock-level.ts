import { levelSchema, type Level } from "../schemas/level.js";

/**
 * Returned by /api/games/generate when USE_MOCK_GEMINI=true — a small,
 * hand-tuned level that exercises every schema feature so the frontend can
 * build against realistic data.
 */
const MOCK_LEVEL: Level = levelSchema.parse({
  name: "Mock Meadow",
  theme: "grass",
  world: { width: 1600, height: 900, gravity: 1200 },
  player: { x: 80, y: 700 },
  goal: { x: 1500, y: 180 },
  platforms: [
    { x: 0, y: 800, width: 620, height: 100, kind: "static" },
    { x: 720, y: 700, width: 200, height: 40, kind: "static" },
    { x: 1000, y: 560, width: 180, height: 40, kind: "moving" },
    { x: 1240, y: 420, width: 160, height: 40, kind: "crumbling" },
    { x: 1420, y: 280, width: 180, height: 40, kind: "static" },
  ],
  hazards: [
    { x: 620, y: 860, width: 380, height: 40, type: "lava" },
    { x: 1180, y: 860, width: 420, height: 40, type: "spikes" },
  ],
  coins: [
    { x: 400, y: 740 },
    { x: 810, y: 640 },
    { x: 1090, y: 500 },
    { x: 1320, y: 360 },
  ],
  enemies: [
    { x: 300, y: 760, type: "walker", patrolDistance: 200 },
    { x: 1100, y: 300, type: "flyer", patrolDistance: 320 },
  ],
});

/** Deep copy so callers can't mutate the shared template. */
export function getMockLevel(): Level {
  return structuredClone(MOCK_LEVEL);
}
