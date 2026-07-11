import { GAME_WORLD, type GameSpec } from "@/lib/game/schema";

/**
 * Deterministic GameSpec patches for common chat requests.
 * Used by mock refine and as a fallback when the model returns invalid JSON.
 */

export interface LocalRefineResult {
  game: GameSpec;
  assistantMessage: string;
  matched: boolean;
}

function nextId(prefix: string, used: Set<string>): string {
  let i = 1;
  while (used.has(`${prefix}-${i}`)) i += 1;
  const id = `${prefix}-${i}`;
  used.add(id);
  return id;
}

function collectIds(game: GameSpec): Set<string> {
  return new Set([
    ...game.enemies.map((e) => e.id),
    ...game.obstacles.map((o) => o.id),
    ...game.collectibles.map((c) => c.id),
    ...game.platforms.map((p) => p.id),
  ]);
}

function hasBottomFloor(game: GameSpec): boolean {
  const floorY = GAME_WORLD.height - 48;
  return game.platforms.some(
    (p) =>
      p.y >= floorY - 20 &&
      p.width >= GAME_WORLD.width * 0.6 &&
      p.movement === "none"
  );
}

function ensurePlayerOnFloor(game: GameSpec, floorTop: number): void {
  const feet = game.player.y + game.player.height;
  if (feet > floorTop || feet < floorTop - 8) {
    game.player.y = Math.max(0, floorTop - game.player.height);
  }
}

/**
 * Apply best-effort local edits. Returns matched:false if nothing applied.
 */
export function applyLocalRefine(
  source: GameSpec,
  message: string
): LocalRefineResult {
  const game = structuredClone(source);
  const lower = message.toLowerCase();
  const changes: string[] = [];
  const ids = collectIds(game);

  const wantsFloor = /floor|ground|bottom/.test(lower);
  const wantsObstacles =
    /obstacl|hazard|spike|wall|more (stuff|things)|add more/.test(lower) ||
    wantsFloor;
  const wantsSpikes = /spike/.test(lower) || (wantsObstacles && wantsFloor);

  if (wantsFloor && !hasBottomFloor(game)) {
    const floorHeight = 36;
    const floorTop = GAME_WORLD.height - floorHeight;
    const floorId = nextId("floor", ids);
    game.platforms.push({
      id: floorId,
      label: "Floor",
      color: "#78716c",
      kind: "static",
      movement: "none",
      patrolDistance: 0,
      x: 0,
      y: floorTop,
      width: GAME_WORLD.width,
      height: floorHeight,
    });
    ensurePlayerOnFloor(game, floorTop);
    // Keep goal/flag above the floor if present.
    for (const item of game.collectibles) {
      if (
        item.appearance === "flag" ||
        /flag|goal|exit/i.test(item.label)
      ) {
        const top = floorTop - item.height - 4;
        if (item.y + item.height > floorTop) item.y = Math.max(0, top);
      }
    }
    changes.push("added a full-width floor at the bottom");
  } else if (wantsFloor && hasBottomFloor(game)) {
    changes.push("kept the existing floor");
  }

  if (wantsObstacles || wantsSpikes) {
    const floorTop =
      game.platforms
        .filter((p) => p.movement === "none" && p.width >= 200)
        .sort((a, b) => b.y - a.y)[0]?.y ?? GAME_WORLD.height - 36;

    const hazardCount = game.obstacles.filter((o) => o.kind === "hazard").length;
    const toAdd = Math.min(3, Math.max(1, 4 - hazardCount));
    const slots = [180, 420, 680].filter((x) =>
      !game.obstacles.some(
        (o) => Math.abs(o.x - x) < 60 && Math.abs(o.y - (floorTop - 28)) < 40
      )
    );

    let added = 0;
    for (const x of slots) {
      if (added >= toAdd) break;
      if (game.obstacles.length >= 40) break;
      // Don't stack on the player spawn.
      if (Math.abs(x - game.player.x) < 80) continue;
      const id = nextId("spike", ids);
      game.obstacles.push({
        id,
        label: "Spikes",
        color: "#ef4444",
        kind: "hazard",
        solid: false,
        damage: 1,
        x,
        y: floorTop - 28,
        width: 56,
        height: 28,
      });
      added += 1;
    }

    // Mid-air platforms as extra obstacles / stepping stones when asked.
    if (/platform|ledge|block/.test(lower) || (wantsObstacles && added === 0)) {
      const midYs = [360, 280];
      const midXs = [300, 560];
      for (let i = 0; i < midXs.length; i += 1) {
        if (game.platforms.length >= 24) break;
        const x = midXs[i]!;
        const y = midYs[i]!;
        if (
          game.platforms.some(
            (p) => Math.abs(p.x - x) < 40 && Math.abs(p.y - y) < 40
          )
        ) {
          continue;
        }
        const id = nextId("ledge", ids);
        game.platforms.push({
          id,
          label: "Ledge",
          color: "#a8a29e",
          kind: "static",
          movement: "none",
          patrolDistance: 0,
          x,
          y,
          width: 140,
          height: 28,
        });
        changes.push("added a mid-level ledge");
      }
    }

    if (added > 0) {
      changes.push(
        added === 1 ? "added spike hazards" : `added ${added} spike hazards`
      );
    }
  }

  if (/fast|speed|quick/.test(lower)) {
    game.player.speed = Math.min(900, Math.round(game.player.speed * 1.25) || 280);
    for (const enemy of game.enemies) {
      enemy.speed = Math.min(500, Math.round(enemy.speed * 1.2) || 120);
    }
    changes.push("sped things up");
  }
  if (/slow|easier|easy/.test(lower)) {
    game.player.speed = Math.max(80, Math.round(game.player.speed * 0.85));
    game.difficulty = "easy";
    changes.push("made it a bit easier");
  }
  if (/hard|harder|difficult/.test(lower)) {
    game.difficulty = "normal";
    game.lives = Math.max(1, game.lives - 1);
    changes.push("nudged difficulty up");
  }
  if (/coin|collect|star|gem/.test(lower) && game.collectibles.length > 0) {
    const template = game.collectibles[0]!;
    if (game.collectibles.length < 30) {
      game.collectibles.push({
        ...template,
        id: nextId("collectible", ids),
        x: Math.min(920, template.x + 48),
        y: template.y,
      });
      changes.push("added another collectible");
    }
  }
  // Jump / physics feel — set a solid arcade jump, don't only nudge by 15%.
  if (/physic|jump|bounce|gravity|hop|float/.test(lower)) {
    const before = game.player.jumpStrength;
    game.player.jumpStrength = Math.min(
      900,
      Math.max(520, Math.round(before * 1.2) || 560)
    );
    game.feel.bounce = true;
    if (game.platforms.length === 0 && game.gameType === "platform-jumper") {
      // Ensure there is ground to jump from.
      const floorHeight = 36;
      game.platforms.push({
        id: nextId("floor", ids),
        label: "Floor",
        color: "#78716c",
        kind: "static",
        movement: "none",
        patrolDistance: 0,
        x: 0,
        y: GAME_WORLD.height - floorHeight,
        width: GAME_WORLD.width,
        height: floorHeight,
      });
      ensurePlayerOnFloor(game, GAME_WORLD.height - floorHeight);
    }
    changes.push(
      game.player.jumpStrength > before
        ? "improved jump physics"
        : "tuned jump feel"
    );
  }

  // Deduplicate change notes like "added a mid-level ledge" repeated
  const uniqueChanges = [...new Set(changes)];

  if (uniqueChanges.length === 0) {
    return {
      game: source,
      assistantMessage: "",
      matched: false,
    };
  }

  return {
    game,
    assistantMessage: `Done — ${uniqueChanges.join(", ")}.`,
    matched: true,
  };
}
