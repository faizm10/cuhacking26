import {
  gravityForJump,
  PLATFORMER_FEEL,
} from "./platformer-physics";
import { GAME_WORLD, type GamePlatform, type GameSpec } from "./schema";

/**
 * Deterministic layout validation + minimal repair for platform-jumpers.
 * Runs after schema validation and geometric repair, before rendering.
 *
 * Philosophy: the sketch layout is authoritative. Corrections are the
 * smallest change that makes the level function, applied in a strict
 * priority order — never a wholesale redesign, and never a silent generic
 * ground platform when drawn platforms exist.
 */

/** HUD chips occupy this strip; required objects must not hide under it. */
const HUD_HEIGHT = 48;
/** Safety margin applied to the jump envelope so "reachable" means it. */
const RISE_MARGIN = 0.88;
const HORIZONTAL_MARGIN = 0.9;
/** Largest single correction we allow per rule (px). */
const MAX_NUDGE = 90;

export interface JumpEnvelope {
  /** Max height gain from takeoff to landing platform top (px). */
  maxRise: number;
  /** Max horizontal gap clearable between platform edges (px). */
  maxGap: number;
}

export function jumpEnvelope(speed: number, jumpStrength: number): JumpEnvelope {
  const impulse = Math.min(
    PLATFORMER_FEEL.maxJumpStrength,
    Math.max(PLATFORMER_FEEL.minJumpStrength, jumpStrength || 0)
  );
  const runSpeed = Math.min(
    PLATFORMER_FEEL.maxSpeed,
    Math.max(PLATFORMER_FEEL.minSpeed, speed || 0)
  );
  const gravity = gravityForJump(impulse);
  const apexRise = (impulse * impulse) / (2 * gravity);
  const sameHeightAirtime = (2 * impulse) / gravity;
  return {
    maxRise: apexRise * RISE_MARGIN,
    maxGap: runSpeed * sameHeightAirtime * HORIZONTAL_MARGIN,
  };
}

function horizontalGap(a: GamePlatform, b: GamePlatform): number {
  if (b.x >= a.x + a.width) return b.x - (a.x + a.width);
  if (a.x >= b.x + b.width) return a.x - (b.x + b.width);
  return 0; // overlapping spans
}

/** Can the player travel from platform a to platform b with one jump/fall? */
export function canTraverse(
  a: GamePlatform,
  b: GamePlatform,
  env: JumpEnvelope
): boolean {
  const gap = horizontalGap(a, b);
  const rise = a.y - b.y; // positive = b is higher
  if (rise <= 0) {
    // Dropping down — horizontal reach grows a little with fall time.
    return gap <= env.maxGap * 1.15;
  }
  return rise <= env.maxRise && gap <= env.maxGap;
}

/** BFS over the platform graph from the given start platform index. */
export function reachablePlatforms(
  platforms: GamePlatform[],
  startIndex: number,
  env: JumpEnvelope
): Set<number> {
  const reached = new Set<number>([startIndex]);
  const queue = [startIndex];
  while (queue.length > 0) {
    const current = queue.shift()!;
    platforms.forEach((candidate, index) => {
      if (reached.has(index)) return;
      if (canTraverse(platforms[current]!, candidate, env)) {
        reached.add(index);
        queue.push(index);
      }
    });
  }
  return reached;
}

/** Index of the platform whose top the player's spawn best belongs to. */
export function findStartPlatform(game: GameSpec): number {
  const feet = game.player.y + game.player.height;
  const centerX = game.player.x + game.player.width / 2;
  let best = -1;
  let bestScore = Infinity;
  game.platforms.forEach((platform, index) => {
    const withinSpan =
      centerX >= platform.x - 20 && centerX <= platform.x + platform.width + 20;
    const drop = platform.y - feet; // positive = platform below the feet
    const score =
      (withinSpan ? 0 : 10_000) +
      Math.abs(drop) +
      (drop < -8 ? 5_000 : 0); // heavily penalize platforms above the feet
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

function snapPlayerOntoPlatform(game: GameSpec, platform: GamePlatform): void {
  const centerX = game.player.x + game.player.width / 2;
  const minX = platform.x;
  const maxX = platform.x + platform.width - game.player.width;
  game.player.x = Math.min(Math.max(game.player.x, minX), Math.max(minX, maxX));
  void centerX;
  game.player.y = platform.y - game.player.height;
}

function overlapsAny(
  rect: { x: number; y: number; width: number; height: number },
  others: { x: number; y: number; width: number; height: number }[]
): boolean {
  return others.some(
    (o) =>
      rect.x < o.x + o.width &&
      rect.x + rect.width > o.x &&
      rect.y < o.y + o.height &&
      rect.y + rect.height > o.y
  );
}

/** A collectible counts as reachable when it sits in some platform's jump zone. */
function collectibleReachable(
  item: { x: number; y: number; width: number; height: number },
  platforms: GamePlatform[],
  reachable: Set<number>,
  env: JumpEnvelope
): boolean {
  const cx = item.x + item.width / 2;
  const bottom = item.y + item.height;
  return platforms.some((platform, index) => {
    if (!reachable.has(index)) return false;
    const spanOk =
      cx >= platform.x - 45 && cx <= platform.x + platform.width + 45;
    const riseOk =
      platform.y - bottom >= -12 && platform.y - bottom <= env.maxRise + 40;
    return spanOk && riseOk;
  });
}

const GOAL_HINT = /flag|goal|exit|door|finish|rocket|pond|home/i;

export interface LayoutResult {
  game: GameSpec;
  warnings: string[];
}

/**
 * Validate and minimally repair a platform-jumper layout. Other templates
 * pass through untouched (their layouts are open fields).
 */
export function applyLayoutPass(spec: GameSpec): LayoutResult {
  if (spec.gameType !== "platform-jumper") {
    return { game: spec, warnings: [] };
  }

  const game = structuredClone(spec);
  const warnings: string[] = [];
  const env = jumpEnvelope(game.player.speed, game.player.jumpStrength);

  // Rule: a ground platform is a last resort, never a replacement. Only add
  // one when the sketch produced no platforms at all.
  if (game.platforms.length === 0) {
    game.platforms.push({
      id: "ground",
      label: "",
      color: "#78716c",
      kind: "static",
      movement: "none",
      patrolDistance: 0,
      x: 0,
      y: GAME_WORLD.height - 36,
      width: GAME_WORLD.width,
      height: 36,
    });
    warnings.push("The sketch had no platforms — added a ground floor");
  }

  // Platform-jumpers need at least two platforms to be a jumper.
  if (game.platforms.length === 1) {
    const base = game.platforms[0]!;
    const stepX = Math.min(
      GAME_WORLD.width - 140,
      base.x + base.width + Math.min(env.maxGap * 0.7, 150)
    );
    game.platforms.push({
      id: "step-1",
      label: "",
      color: base.color,
      kind: "static",
      movement: "none",
      patrolDistance: 0,
      x: stepX,
      y: Math.max(HUD_HEIGHT + 40, base.y - Math.min(env.maxRise * 0.7, 70)),
      width: 130,
      height: 28,
    });
    warnings.push("Added a second platform so there is something to jump to");
  }

  // Spawn the player on their drawn start platform — not floating, not
  // inside the ground.
  const startIndex = Math.max(0, findStartPlatform(game));
  const startPlatform = game.platforms[startIndex]!;
  const feet = game.player.y + game.player.height;
  const restingOnStart =
    Math.abs(feet - startPlatform.y) <= 6 &&
    game.player.x + game.player.width > startPlatform.x &&
    game.player.x < startPlatform.x + startPlatform.width;
  if (!restingOnStart) {
    snapPlayerOntoPlatform(game, startPlatform);
    warnings.push("Placed the player on its starting platform");
  }

  // Player must not overlap hazards after snapping.
  const hazards = game.obstacles.filter((o) => o.kind === "hazard");
  if (overlapsAny(game.player, hazards)) {
    game.player.x = Math.max(0, startPlatform.x + 4);
    game.player.y = startPlatform.y - game.player.height;
    if (overlapsAny(game.player, hazards)) {
      warnings.push("Player start still overlaps a hazard — check the sketch");
    } else {
      warnings.push("Moved the player start off a hazard");
    }
  }

  // Reachability: every platform should be enterable from the start.
  // Minimal corrections, in priority order: move closer → lower → widen →
  // add one stepping platform → raise jump strength as the final resort.
  let reachable = reachablePlatforms(game.platforms, startIndex, env);
  let addedSteps = 0;
  for (let round = 0; round < game.platforms.length; round += 1) {
    const unreachableIndex = game.platforms.findIndex(
      (_, index) => !reachable.has(index)
    );
    if (unreachableIndex === -1) break;
    const target = game.platforms[unreachableIndex]!;

    // Find its nearest reachable neighbour to correct against.
    let nearest: GamePlatform | null = null;
    let nearestDist = Infinity;
    reachable.forEach((index) => {
      const platform = game.platforms[index]!;
      const dist =
        horizontalGap(platform, target) + Math.abs(platform.y - target.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = platform;
      }
    });
    if (!nearest) break;
    const from = nearest as GamePlatform;

    const gap = horizontalGap(from, target);
    const rise = from.y - target.y;

    // 1. Move slightly closer.
    if (gap > env.maxGap && gap - env.maxGap <= MAX_NUDGE) {
      const shift = gap - env.maxGap + 4;
      target.x += target.x > from.x ? -shift : shift;
      warnings.push(`Moved platform "${target.id}" ${Math.round(shift)}px closer`);
    }
    // 2. Lower it slightly.
    else if (rise > env.maxRise && rise - env.maxRise <= MAX_NUDGE) {
      const drop = rise - env.maxRise + 4;
      target.y += drop;
      warnings.push(`Lowered platform "${target.id}" ${Math.round(drop)}px`);
    }
    // 3. Widen it slightly (shrinks the edge-to-edge gap).
    else if (gap > env.maxGap && gap - env.maxGap <= MAX_NUDGE + 60) {
      const grow = Math.min(60, gap - env.maxGap + 4);
      if (target.x > from.x) target.x -= grow;
      target.width += grow;
      warnings.push(`Widened platform "${target.id}" by ${Math.round(grow)}px`);
    }
    // 4. Add one small stepping platform midway.
    else if (addedSteps < 2) {
      addedSteps += 1;
      const midX =
        (Math.max(from.x + from.width, target.x + target.width) +
          Math.min(from.x, target.x)) /
          2 -
        55;
      const midY = Math.max(
        HUD_HEIGHT + 30,
        (from.y + target.y) / 2 + 10
      );
      game.platforms.push({
        id: `step-${addedSteps + 1}`,
        label: "",
        color: from.color,
        kind: "static",
        movement: "none",
        patrolDistance: 0,
        x: Math.max(0, Math.min(GAME_WORLD.width - 110, midX)),
        y: Math.min(GAME_WORLD.height - 60, midY),
        width: 110,
        height: 26,
      });
      warnings.push(`Added a stepping platform toward "${target.id}"`);
    }
    // 5. Final resort: raise jump strength.
    else if (game.player.jumpStrength < PLATFORMER_FEEL.maxJumpStrength) {
      game.player.jumpStrength = Math.min(
        PLATFORMER_FEEL.maxJumpStrength,
        game.player.jumpStrength + 80
      );
      warnings.push("Raised jump strength so far platforms are reachable");
    } else {
      warnings.push(`Platform "${target.id}" may be unreachable`);
      break;
    }

    reachable = reachablePlatforms(
      game.platforms,
      startIndex,
      jumpEnvelope(game.player.speed, game.player.jumpStrength)
    );
  }

  // Required collectibles (and the goal) must sit in a reachable jump zone.
  const finalEnv = jumpEnvelope(game.player.speed, game.player.jumpStrength);
  game.collectibles.forEach((item) => {
    if (collectibleReachable(item, game.platforms, reachable, finalEnv)) return;
    // Smallest correction: move it above the nearest reachable platform.
    let nearest: GamePlatform | null = null;
    let nearestDist = Infinity;
    reachable.forEach((index) => {
      const platform = game.platforms[index]!;
      const dist = Math.hypot(
        platform.x + platform.width / 2 - item.x,
        platform.y - item.y
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = platform;
      }
    });
    if (!nearest) return;
    const host = nearest as GamePlatform;
    item.x = Math.round(host.x + host.width / 2 - item.width / 2);
    item.y = Math.round(host.y - item.height - 34);
    warnings.push(`Moved "${item.label || item.id}" above a reachable platform`);
  });

  // Objective-driven role guards.
  const objective = `${game.objective} ${game.winCondition}`.toLowerCase();
  if (/collect|gather|grab|star|coin|pick up/.test(objective)) {
    if (game.collectibles.length === 0) {
      const hosts = [...reachable].slice(0, 2);
      hosts.forEach((index, i) => {
        const platform = game.platforms[index]!;
        game.collectibles.push({
          id: `star-auto-${i + 1}`,
          label: "",
          color: "#facc15",
          appearance: "star",
          points: 10,
          width: 30,
          height: 30,
          x: Math.round(platform.x + platform.width / 2 - 15),
          y: Math.round(platform.y - 64),
        });
      });
      if (hosts.length > 0)
        warnings.push("Objective mentions collecting — added missing stars");
    }
  }
  if (
    /avoid|dodge|spike|lava|hazard/.test(objective) &&
    game.obstacles.every((o) => o.kind !== "hazard") &&
    game.enemies.length === 0
  ) {
    warnings.push("Objective mentions avoiding danger but no hazards exist");
  }
  if (
    /reach|flag|exit|door|goal|finish/.test(objective) &&
    !game.collectibles.some(
      (c) => GOAL_HINT.test(`${c.label} ${c.id}`) || c.appearance === "flag"
    )
  ) {
    const rightmost = [...reachable]
      .map((index) => game.platforms[index]!)
      .sort((a, b) => b.x + b.width - (a.x + a.width))[0];
    if (rightmost) {
      game.collectibles.push({
        id: "goal-flag",
        label: "Goal",
        color: "#ef4444",
        appearance: "flag",
        points: 25,
        width: 38,
        height: 54,
        x: Math.round(rightmost.x + rightmost.width - 54),
        y: Math.round(rightmost.y - 54),
      });
      warnings.push("Objective mentions a goal — added the missing flag");
    }
  }

  // Nothing required may hide behind the HUD strip.
  for (const item of [game.player, ...game.collectibles]) {
    if (item.y + item.height <= HUD_HEIGHT) {
      item.y = HUD_HEIGHT + 4;
      warnings.push("Moved an object out from under the score display");
    }
  }

  return { game, warnings };
}
