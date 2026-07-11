"use client";

import { RotateCcw, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { center, clamp, contains, intersects } from "@/lib/game/systems/geometry";
import type {
  GameCollectible,
  GameEnemy,
  GameRect,
  GameSpec,
} from "@/types/game";

const WORLD = { width: 960, height: 540 };

interface RuntimeEnemy extends GameEnemy {
  originX: number;
  originY: number;
  dir: number;
  alive: boolean;
}

interface RuntimeProjectile extends GameRect {
  vx: number;
  vy: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface RuntimeState {
  player: GameRect & { color: string; vx: number; vy: number; grounded: boolean };
  enemies: RuntimeEnemy[];
  collectibles: (GameCollectible & { collected: boolean })[];
  projectiles: RuntimeProjectile[];
  particles: Particle[];
  score: number;
  lives: number;
  elapsed: number;
  lastShot: number;
  damageCooldown: number;
  status: "playing" | "paused" | "won" | "lost";
  message: string;
}

interface CanvasGameProps {
  game: GameSpec;
}

function createState(game: GameSpec): RuntimeState {
  return {
    player: { ...game.player, vx: 0, vy: 0, grounded: false },
    enemies: game.enemies.map((enemy) => ({
      ...enemy,
      originX: enemy.x,
      originY: enemy.y,
      dir: 1,
      alive: true,
    })),
    collectibles: game.collectibles.map((item) => ({ ...item, collected: false })),
    projectiles: [],
    particles: [],
    score: game.scoring.start,
    lives: game.lives,
    elapsed: 0,
    lastShot: -9999,
    damageCooldown: 0,
    status: "playing",
    message: game.objective,
  };
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  rect: GameRect,
  color: string,
  radius = 8
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, game: GameSpec) {
  ctx.fillStyle = game.visualTheme.background.color;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = game.visualTheme.accentColor;
  ctx.fillStyle = game.visualTheme.accentColor;

  if (game.visualTheme.background.pattern === "grid") {
    for (let x = 0; x <= WORLD.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
  } else if (game.visualTheme.background.pattern === "stars") {
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 97) % WORLD.width;
      const y = (i * 53) % WORLD.height;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (game.visualTheme.background.pattern === "dots") {
    for (let x = 24; x < WORLD.width; x += 56) {
      for (let y = 24; y < WORLD.height; y += 56) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (game.visualTheme.background.pattern === "stripes") {
    for (let x = -WORLD.height; x < WORLD.width; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, WORLD.height);
      ctx.lineTo(x + WORLD.height, 0);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
}

function drawLabel(ctx: CanvasRenderingContext2D, label: string, rect: GameRect) {
  if (!label) return;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label.slice(0, 18), rect.x + rect.width / 2, rect.y - 5);
}

function spawnParticles(state: RuntimeState, rect: GameRect, color: string) {
  const c = center(rect);
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(i * 0.9) * (60 + i * 8),
      vy: Math.sin(i * 0.9) * (60 + i * 8),
      life: 0.45,
      color,
    });
  }
}

function blockAgainst(player: RuntimeState["player"], previous: GameRect, blockers: GameRect[]) {
  for (const blocker of blockers) {
    if (!intersects(player, blocker)) continue;
    const fromLeft = previous.x + previous.width <= blocker.x;
    const fromRight = previous.x >= blocker.x + blocker.width;
    const fromTop = previous.y + previous.height <= blocker.y;
    const fromBottom = previous.y >= blocker.y + blocker.height;

    if (fromLeft) player.x = blocker.x - player.width;
    else if (fromRight) player.x = blocker.x + blocker.width;
    else if (fromTop) {
      player.y = blocker.y - player.height;
      player.vy = 0;
      player.grounded = true;
    } else if (fromBottom) {
      player.y = blocker.y + blocker.height;
      player.vy = 0;
    }
  }
}

function solidRects(game: GameSpec): GameRect[] {
  return [
    ...game.platforms,
    ...game.obstacles.filter((obstacle) => obstacle.solid),
  ];
}

export function CanvasGame({ game }: CanvasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RuntimeState>(createState(game));
  const keysRef = useRef(new Set<string>());
  const pointerRef = useRef<{ x: number; y: number; down: boolean } | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [uiStatus, setUiStatus] = useState<RuntimeState["status"]>("playing");

  const blockers = useMemo(() => solidRects(game), [game]);
  const isPlatformer = game.gameType === "platform-jumper";
  const isClicker = game.gameType === "clicker";

  const reset = useCallback(() => {
    stateRef.current = createState(game);
    lastTimeRef.current = null;
    setUiStatus("playing");
  }, [game]);

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "won" || state.status === "lost") return;
    state.status = state.status === "paused" ? "playing" : "paused";
    state.message = state.status === "paused" ? "Paused" : game.objective;
    setUiStatus(state.status);
  }, [game.objective]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "p") {
        togglePause();
        return;
      }
      if (event.key.toLowerCase() === "r") {
        reset();
        return;
      }
      keysRef.current.add(event.key.toLowerCase());
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [reset, togglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toWorld = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WORLD.width,
        y: ((event.clientY - rect.top) / rect.height) * WORLD.height,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      pointerRef.current = { ...toWorld(event), down: true };
      if (isClicker) {
        const state = stateRef.current;
        for (const item of state.collectibles) {
          if (!item.collected && contains(item, pointerRef.current.x, pointerRef.current.y)) {
            item.collected = true;
            state.score += item.points;
            spawnParticles(state, item, item.color);
          }
        }
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerRef.current) return;
      pointerRef.current = { ...toWorld(event), down: pointerRef.current.down };
    };
    const onPointerUp = () => {
      if (pointerRef.current) pointerRef.current.down = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isClicker]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const damagePlayer = (state: RuntimeState, message: string) => {
      if (state.damageCooldown > 0) return;
      if (game.collisionRules.playerHitsEnemy === "ignore") return;
      state.damageCooldown = 0.9;
      state.lives -= 1;
      state.message = message;
      spawnParticles(state, state.player, "#ffffff");
      state.player.x = game.player.x;
      state.player.y = game.player.y;
      state.player.vx = 0;
      state.player.vy = 0;
      if (state.lives <= 0 || game.collisionRules.playerHitsEnemy === "lose-game") {
        state.status = "lost";
        state.message = game.loseCondition;
        setUiStatus("lost");
      }
    };

    const shoot = (state: RuntimeState, now: number) => {
      if (!game.projectiles.enabled || now - state.lastShot < game.projectiles.cooldownMs) return;
      state.lastShot = now;
      const playerCenter = center(state.player);
      let vx = 0;
      let vy = 0;
      if (game.projectiles.direction === "up") vy = -game.projectiles.speed;
      if (game.projectiles.direction === "down") vy = game.projectiles.speed;
      if (game.projectiles.direction === "left") vx = -game.projectiles.speed;
      if (game.projectiles.direction === "right") vx = game.projectiles.speed;
      if (game.projectiles.direction === "toward-pointer" && pointerRef.current) {
        const dx = pointerRef.current.x - playerCenter.x;
        const dy = pointerRef.current.y - playerCenter.y;
        const length = Math.hypot(dx, dy) || 1;
        vx = (dx / length) * game.projectiles.speed;
        vy = (dy / length) * game.projectiles.speed;
      }
      state.projectiles.push({
        x: playerCenter.x - game.projectiles.width / 2,
        y: playerCenter.y - game.projectiles.height / 2,
        width: game.projectiles.width,
        height: game.projectiles.height,
        vx,
        vy,
        color: game.projectiles.color,
      });
    };

    const update = (dt: number, now: number) => {
      const state = stateRef.current;
      if (state.status !== "playing") return;

      state.elapsed += dt;
      state.damageCooldown = Math.max(0, state.damageCooldown - dt);

      const previous = { ...state.player };
      const keys = keysRef.current;
      const left = keys.has("arrowleft") || keys.has("a");
      const right = keys.has("arrowright") || keys.has("d");
      const up = keys.has("arrowup") || keys.has("w");
      const down = keys.has("arrowdown") || keys.has("s");
      const fire = keys.has(" ") || keys.has("spacebar");

      if (pointerRef.current?.down && game.controls.touch.includes("drag")) {
        state.player.x = pointerRef.current.x - state.player.width / 2;
        state.player.y = pointerRef.current.y - state.player.height / 2;
      } else if (isPlatformer) {
        state.player.vx = 0;
        if (left) state.player.vx = -game.player.speed;
        if (right) state.player.vx = game.player.speed;
        if (up && state.player.grounded) {
          state.player.vy = -Math.max(260, game.player.jumpStrength);
          state.player.grounded = false;
        }
        state.player.vy += 1500 * dt;
        state.player.x += state.player.vx * dt;
        state.player.y += state.player.vy * dt;
      } else {
        let dx = 0;
        let dy = 0;
        if (left) dx -= 1;
        if (right) dx += 1;
        if (up) dy -= 1;
        if (down) dy += 1;
        const length = Math.hypot(dx, dy) || 1;
        state.player.x += (dx / length) * game.player.speed * dt;
        state.player.y += (dy / length) * game.player.speed * dt;
      }

      if (fire || pointerRef.current?.down) shoot(state, now);

      state.player.grounded = false;
      blockAgainst(state.player, previous, blockers);

      if (game.collisionRules.outOfBounds === "wrap") {
        if (state.player.x > WORLD.width) state.player.x = -state.player.width;
        if (state.player.x + state.player.width < 0) state.player.x = WORLD.width;
        if (state.player.y > WORLD.height) state.player.y = -state.player.height;
        if (state.player.y + state.player.height < 0) state.player.y = WORLD.height;
      } else {
        state.player.x = clamp(state.player.x, 0, WORLD.width - state.player.width);
        state.player.y = clamp(state.player.y, 0, WORLD.height - state.player.height);
        if (state.player.y >= WORLD.height - state.player.height) state.player.grounded = true;
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (enemy.movement === "patrol-horizontal" || enemy.movement === "bounce") {
          enemy.x += enemy.dir * enemy.speed * dt;
          if (Math.abs(enemy.x - enemy.originX) > enemy.patrolDistance / 2) enemy.dir *= -1;
        } else if (enemy.movement === "patrol-vertical" || enemy.movement === "fall") {
          enemy.y += enemy.dir * enemy.speed * dt;
          if (Math.abs(enemy.y - enemy.originY) > enemy.patrolDistance / 2) enemy.dir *= -1;
        } else if (enemy.movement === "chase-player") {
          const enemyCenter = center(enemy);
          const playerCenter = center(state.player);
          const dx = playerCenter.x - enemyCenter.x;
          const dy = playerCenter.y - enemyCenter.y;
          const length = Math.hypot(dx, dy) || 1;
          enemy.x += (dx / length) * enemy.speed * dt;
          enemy.y += (dy / length) * enemy.speed * dt;
        }
        enemy.x = clamp(enemy.x, 0, WORLD.width - enemy.width);
        enemy.y = clamp(enemy.y, 0, WORLD.height - enemy.height);
        if (intersects(state.player, enemy)) damagePlayer(state, "Hit! You lost a life.");
      }

      for (const obstacle of game.obstacles) {
        if (!intersects(state.player, obstacle)) continue;
        if (obstacle.kind === "hazard" || game.collisionRules.playerHitsObstacle === "lose-life") {
          damagePlayer(state, "Hazard! You lost a life.");
        }
      }

      for (const item of state.collectibles) {
        if (item.collected || !intersects(state.player, item)) continue;
        if (game.collisionRules.playerCollectsCollectible === "ignore") continue;
        item.collected = game.collisionRules.playerCollectsCollectible !== "score";
        state.score += item.points || game.scoring.perCollectible;
        spawnParticles(state, item, item.color);
        if (game.collisionRules.playerCollectsCollectible === "win") {
          state.status = "won";
          state.message = game.winCondition;
        }
      }

      for (const projectile of state.projectiles) {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        for (const enemy of state.enemies) {
          if (!enemy.alive || !intersects(projectile, enemy)) continue;
          enemy.alive = false;
          projectile.x = WORLD.width + 999;
          state.score += game.scoring.perEnemy;
          spawnParticles(state, enemy, enemy.color);
        }
      }
      state.projectiles = state.projectiles.filter(
        (shot) =>
          shot.x > -80 &&
          shot.x < WORLD.width + 80 &&
          shot.y > -80 &&
          shot.y < WORLD.height + 80
      );

      for (const particle of state.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);

      const allCollected =
        state.collectibles.length > 0 && state.collectibles.every((item) => item.collected);
      const allEnemiesGone =
        game.gameType === "simple-shooter" &&
        state.enemies.length > 0 &&
        state.enemies.every((enemy) => !enemy.alive);
      const targetReached = game.scoring.target > 0 && state.score >= game.scoring.target;
      const timeLeft = game.timer.seconds - state.elapsed;

      if (allCollected || allEnemiesGone || targetReached) {
        state.status = "won";
        state.message = game.winCondition;
        setUiStatus("won");
      }
      if (game.gameType === "dodge" && game.timer.enabled && timeLeft <= 0 && state.status === "playing") {
        state.status = "won";
        state.message = game.winCondition;
        setUiStatus("won");
      } else if (
        game.timer.enabled &&
        game.timer.countsDown &&
        timeLeft <= 0 &&
        state.status === "playing"
      ) {
        state.status = "lost";
        state.message = game.loseCondition;
        setUiStatus("lost");
      }
    };

    const render = () => {
      const state = stateRef.current;
      drawBackground(ctx, game);

      for (const platform of game.platforms) {
        drawRoundRect(ctx, platform, platform.color, 6);
        drawLabel(ctx, platform.label, platform);
      }
      for (const obstacle of game.obstacles) {
        drawRoundRect(ctx, obstacle, obstacle.color, obstacle.kind === "hazard" ? 4 : 7);
        drawLabel(ctx, obstacle.label, obstacle);
      }
      for (const item of state.collectibles) {
        if (item.collected) continue;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
        ctx.fill();
        drawLabel(ctx, item.label, item);
      }
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        drawRoundRect(ctx, enemy, enemy.color, 999);
        drawLabel(ctx, enemy.label, enemy);
      }
      for (const shot of state.projectiles) {
        drawRoundRect(ctx, shot, shot.color, 999);
      }
      for (const particle of state.particles) {
        ctx.globalAlpha = clamp(particle.life / 0.45, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 4, 4);
      }
      ctx.globalAlpha = 1;

      drawRoundRect(ctx, state.player, state.player.color, 10);
      drawLabel(ctx, game.player.label, state.player);

      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      ctx.fillRect(0, 0, WORLD.width, 44);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "15px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      const timeText = game.timer.enabled
        ? ` · Time ${Math.max(0, Math.ceil(game.timer.seconds - state.elapsed))}`
        : "";
      ctx.fillText(`Score ${state.score} · Lives ${state.lives}${timeText}`, 18, 28);

      if (state.status !== "playing") {
        ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        const title = state.status === "won" ? "You win" : state.status === "lost" ? "Game over" : "Paused";
        ctx.fillText(title, WORLD.width / 2, WORLD.height / 2 - 24);
        ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(state.message, WORLD.width / 2, WORLD.height / 2 + 10);
        ctx.fillText("Press R to restart", WORLD.width / 2, WORLD.height / 2 + 40);
      }
    };

    const tick = (time: number) => {
      const last = lastTimeRef.current ?? time;
      lastTimeRef.current = time;
      const dt = Math.min(0.033, (time - last) / 1000);
      update(dt, time);
      render();
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [blockers, game, isPlatformer]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{game.title}</p>
          <p className="truncate text-slate-400">{game.controls.instructions}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8 text-slate-100" onClick={togglePause} title="Pause">
            {uiStatus === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="size-8 text-slate-100" onClick={reset} title="Restart">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <canvas
          ref={canvasRef}
          width={WORLD.width}
          height={WORLD.height}
          className="h-full w-full touch-none rounded-md border border-white/10 bg-slate-900"
          aria-label={`${game.title} game preview`}
        />
      </div>
    </div>
  );
}
