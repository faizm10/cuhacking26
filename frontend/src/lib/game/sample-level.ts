import type { Level } from "@/types";

/**
 * Demo blueprint in the same shape the sketch pipeline emits
 * (backend levelSchema). A short left-to-right run: ground → lava gap →
 * spikes → two floating steps with the high coins → drop to the flag.
 * Every jump stays within the shared platformer feel (~95px rise).
 */
export const SAMPLE_LEVEL: Level = {
  name: "Coin Meadow",
  theme: "grass",
  world: { width: 1600, height: 900, gravity: 1200 },
  player: { x: 90, y: 730 },
  goal: { x: 1500, y: 780 },
  platforms: [
    { x: 0, y: 780, width: 560, height: 120, kind: "static" },
    { x: 700, y: 780, width: 420, height: 120, kind: "static" },
    { x: 1140, y: 700, width: 140, height: 36, kind: "static" },
    { x: 1320, y: 620, width: 140, height: 36, kind: "static" },
    { x: 1200, y: 780, width: 400, height: 120, kind: "static" },
  ],
  hazards: [
    { x: 560, y: 830, width: 140, height: 70, type: "lava" },
    { x: 940, y: 752, width: 80, height: 28, type: "spikes" },
  ],
  coins: [
    { x: 180, y: 720 },
    { x: 300, y: 720 },
    { x: 420, y: 720 },
    { x: 630, y: 690 },
    { x: 800, y: 720 },
    { x: 980, y: 680 },
    { x: 1210, y: 650 },
    { x: 1390, y: 565 },
  ],
  enemies: [{ x: 350, y: 756, type: "walker", patrolDistance: 200 }],
};
