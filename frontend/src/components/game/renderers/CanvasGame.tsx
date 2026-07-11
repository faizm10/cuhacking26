"use client";

import { Pause, Play, RotateCcw, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  drawEntity,
  drawPlatform,
  drawScene,
  shade,
} from "@/components/game/renderers/cartoon";
import { resetBall, stepBall } from "@/lib/game/systems/ball";
import {
  center,
  clamp,
  contains,
  intersects,
} from "@/lib/game/systems/geometry";
import { stepPlatformerMotion } from "@/lib/game/platformer-physics";
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
  vx: number;
  vy: number;
  alive: boolean;
  phase: number;
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
  maxLife: number;
  size: number;
  color: string;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
}

type Status = "ready" | "playing" | "paused" | "won" | "lost";

interface RuntimeState {
  player: GameRect & {
    color: string;
    vx: number;
    vy: number;
    grounded: boolean;
    squash: number;
    facing: number;
    /** Remaining coyote-jump window (seconds). */
    coyote: number;
    /** Remaining jump-buffer window (seconds). */
    jumpBuffer: number;
  };
  enemies: RuntimeEnemy[];
  collectibles: (GameCollectible & { collected: boolean; phase: number })[];
  projectiles: RuntimeProjectile[];
  particles: Particle[];
  floaters: Floater[];
  score: number;
  lives: number;
  elapsed: number;
  lastShot: number;
  damageCooldown: number;
  shake: number;
  flash: number;
  status: Status;
}

interface CanvasGameProps {
  game: GameSpec;
  /** When true, skip the title screen and start playing immediately. */
  autoPlay?: boolean;
}

function createState(game: GameSpec, autoPlay = false): RuntimeState {
  return {
    player: {
      ...game.player,
      vx: 0,
      vy: 0,
      grounded: false,
      squash: 1,
      facing: 1,
      coyote: 0,
      jumpBuffer: 0,
    },
    enemies: game.enemies.map((enemy, index) => ({
      ...enemy,
      originX: enemy.x,
      originY: enemy.y,
      dir: 1,
      vx: enemy.speed * (index % 2 === 0 ? 1 : -1),
      vy: enemy.speed * 0.7,
      alive: true,
      phase: index * 1.7,
    })),
    collectibles: game.collectibles.map((item, index) => ({
      ...item,
      collected: false,
      phase: index * 1.3,
    })),
    projectiles: [],
    particles: [],
    floaters: [],
    score: game.scoring.start,
    lives: game.lives,
    elapsed: 0,
    lastShot: -9999,
    damageCooldown: 0,
    shake: 0,
    flash: 0,
    status: autoPlay ? "playing" : "ready",
  };
}

function spawnBurst(
  state: RuntimeState,
  rect: GameRect,
  color: string,
  count = 12
) {
  const c = center(rect);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 90 + Math.random() * 120;
    state.particles.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.55,
      maxLife: 0.55,
      size: 3 + Math.random() * 4,
      color,
    });
  }
}

function blockAgainst(
  player: RuntimeState["player"],
  previous: GameRect,
  blockers: GameRect[]
) {
  for (const blocker of blockers) {
    if (!intersects(player, blocker)) continue;
    const fromLeft = previous.x + previous.width <= blocker.x;
    const fromRight = previous.x >= blocker.x + blocker.width;
    const fromTop = previous.y + previous.height <= blocker.y;
    const fromBottom = previous.y >= blocker.y + blocker.height;

    if (fromLeft) player.x = blocker.x - player.width;
    else if (fromRight) player.x = blocker.x + blocker.width;
    else if (fromTop) {
      if (player.vy > 260) player.squash = 0.55; // landing squash
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


const START_KEYS = new Set([
  "enter",
  " ",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "w",
  "a",
  "s",
  "d",
]);

export function CanvasGame({ game, autoPlay = false }: CanvasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RuntimeState>(createState(game, autoPlay));
  const keysRef = useRef(new Set<string>());
  const jumpHeldRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number; down: boolean } | null>(
    null
  );
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [uiStatus, setUiStatus] = useState<Status>(
    autoPlay ? "playing" : "ready"
  );
  const [uiScore, setUiScore] = useState(game.scoring.start);

  const blockers = useMemo(() => solidRects(game), [game]);
  const isPlatformer = game.gameType === "platform-jumper";
  const isClicker = game.gameType === "clicker";
  const isPong = game.gameType === "pong";

  // Dev-only layout overlay: bounding boxes + ids for every entity.
  // Enable with ?debug in the URL or localStorage.setItem("playbox-debug","1").
  const debugOverlay = useMemo(() => {
    if (process.env.NODE_ENV === "production") return false;
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).has("debug") ||
      window.localStorage.getItem("playbox-debug") === "1"
    );
  }, []);

  const setStatus = useCallback((state: RuntimeState, status: Status) => {
    state.status = status;
    setUiStatus(status);
  }, []);

  const start = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "ready" || state.status === "paused") {
      setStatus(state, "playing");
    }
  }, [setStatus]);

  const reset = useCallback(
    (autoStart = false) => {
      stateRef.current = createState(game, autoStart);
      lastTimeRef.current = null;
      jumpHeldRef.current = false;
      setUiScore(game.scoring.start);
      setUiStatus(stateRef.current.status);
    },
    [game]
  );

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "playing") setStatus(state, "paused");
    else if (state.status === "paused") setStatus(state, "playing");
  }, [setStatus]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const state = stateRef.current;
      if (state.status === "ready" && START_KEYS.has(key)) {
        event.preventDefault();
        start();
        return;
      }
      if (key === "p") {
        togglePause();
        return;
      }
      if (key === "r") {
        reset(true);
        return;
      }
      if (key === " ") event.preventDefault();
      keysRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [reset, start, togglePause]);

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
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // A fast tap can release the pointer before we capture it — the
        // drag still works without capture, so keep going.
      }
      pointerRef.current = { ...toWorld(event), down: true };
      const state = stateRef.current;
      if (state.status === "ready") {
        start();
        return;
      }
      if (isClicker && state.status === "playing") {
        for (const item of state.collectibles) {
          if (
            !item.collected &&
            contains(item, pointerRef.current.x, pointerRef.current.y)
          ) {
            item.collected = true;
            state.score += item.points;
            setUiScore(state.score);
            if (game.feel.particles) spawnBurst(state, item, item.color);
            if (game.feel.collectAnimation) {
              state.floaters.push({
                x: item.x + item.width / 2,
                y: item.y,
                text: `+${item.points}`,
                life: 0.8,
              });
            }
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
  }, [game, isClicker, start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const damagePlayer = (state: RuntimeState) => {
      if (state.damageCooldown > 0) return;
      if (game.collisionRules.playerHitsEnemy === "ignore") return;
      state.damageCooldown = 1.1;
      state.lives -= 1;
      if (game.feel.particles) spawnBurst(state, state.player, "#ffffff", 14);
      if (game.feel.screenShake) state.shake = 0.35;
      if (game.feel.hitFlash) state.flash = 0.4;
      state.player.x = game.player.x;
      state.player.y = game.player.y;
      state.player.vx = 0;
      state.player.vy = 0;
      if (
        state.lives <= 0 ||
        game.collisionRules.playerHitsEnemy === "lose-game"
      ) {
        setStatus(state, "lost");
      }
    };

    const shoot = (state: RuntimeState, now: number) => {
      if (
        !game.projectiles.enabled ||
        now - state.lastShot < game.projectiles.cooldownMs
      )
        return;
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
      state.shake = Math.max(0, state.shake - dt);
      state.flash = Math.max(0, state.flash - dt);
      state.player.squash += (1 - state.player.squash) * Math.min(1, dt * 10);
      if (state.status !== "playing") return;

      state.elapsed += dt;
      state.damageCooldown = Math.max(0, state.damageCooldown - dt);

      const previous = { ...state.player };
      const keys = keysRef.current;
      const left = keys.has("arrowleft") || keys.has("a");
      const right = keys.has("arrowright") || keys.has("d");
      const up = keys.has("arrowup") || keys.has("w");
      const down = keys.has("arrowdown") || keys.has("s");
      const space = keys.has(" ") || keys.has("spacebar");
      const jumpHeld = isPlatformer ? up || space : false;
      const jumpPressed = jumpHeld && !jumpHeldRef.current;
      const jumpReleased = !jumpHeld && jumpHeldRef.current;
      jumpHeldRef.current = jumpHeld;
      const fire =
        (!isPlatformer && (space || pointerRef.current?.down)) ||
        (isPlatformer &&
          game.player.canShoot &&
          Boolean(pointerRef.current?.down));

      if (left) state.player.facing = -1;
      if (right) state.player.facing = 1;

      if (pointerRef.current?.down && game.controls.touch.includes("drag")) {
        state.player.x = pointerRef.current.x - state.player.width / 2;
        state.player.y = pointerRef.current.y - state.player.height / 2;
      } else if (isPlatformer) {
        const wasGrounded = state.player.grounded;
        const motion = stepPlatformerMotion({
          dt,
          left,
          right,
          jumpHeld,
          jumpPressed,
          jumpReleased,
          grounded: wasGrounded,
          vx: state.player.vx,
          vy: state.player.vy,
          coyote: state.player.coyote,
          jumpBuffer: state.player.jumpBuffer,
          speed: game.player.speed,
          jumpStrength: game.player.jumpStrength,
        });
        state.player.vx = motion.vx;
        state.player.vy = motion.vy;
        state.player.coyote = motion.coyote;
        state.player.jumpBuffer = motion.jumpBuffer;
        if (motion.didJump) {
          state.player.grounded = false;
          state.player.squash = 1.35;
          if (game.feel.particles)
            spawnBurst(
              state,
              { ...state.player, y: state.player.y + state.player.height - 4 },
              "#ffffff",
              5
            );
        }
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

      if (fire) shoot(state, now);

      state.player.grounded = false;
      blockAgainst(state.player, previous, blockers);

      if (game.collisionRules.outOfBounds === "wrap") {
        if (state.player.x > WORLD.width) state.player.x = -state.player.width;
        if (state.player.x + state.player.width < 0)
          state.player.x = WORLD.width;
        if (state.player.y > WORLD.height) state.player.y = -state.player.height;
        if (state.player.y + state.player.height < 0)
          state.player.y = WORLD.height;
      } else {
        state.player.x = clamp(state.player.x, 0, WORLD.width - state.player.width);
        state.player.y = clamp(
          state.player.y,
          0,
          WORLD.height - state.player.height
        );
        if (state.player.y >= WORLD.height - state.player.height)
          state.player.grounded = true;
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (enemy.movement === "patrol-horizontal") {
          enemy.x += enemy.dir * enemy.speed * dt;
          if (Math.abs(enemy.x - enemy.originX) > enemy.patrolDistance / 2)
            enemy.dir *= -1;
        } else if (enemy.movement === "patrol-vertical") {
          enemy.y += enemy.dir * enemy.speed * dt;
          if (Math.abs(enemy.y - enemy.originY) > enemy.patrolDistance / 2)
            enemy.dir *= -1;
        } else if (enemy.movement === "bounce") {
          // Ball physics: rebounds off walls, the player paddle, solid
          // blocks, and other enemies (e.g. an AI paddle).
          const events = stepBall(enemy, dt, {
            world: WORLD,
            player: state.player,
            surfaces: [
              ...blockers,
              ...state.enemies.filter(
                (other) =>
                  other !== enemy && other.alive && other.movement !== "bounce"
              ),
            ],
            pong: isPong,
          });

          if (events.hitPaddle) {
            if (game.feel.particles) spawnBurst(state, enemy, enemy.color, 6);
            if (game.feel.bounce) state.player.squash = 0.75;
          }
          if (events.missedLeft) {
            // Past your paddle: lose a life, re-serve toward you.
            state.lives -= 1;
            if (game.feel.screenShake) state.shake = 0.3;
            if (game.feel.hitFlash) state.flash = 0.35;
            resetBall(enemy, WORLD, enemy.speed, true);
            if (state.lives <= 0) setStatus(state, "lost");
          } else if (events.scoredRight) {
            state.score += 1;
            setUiScore(state.score);
            if (game.feel.collectAnimation) {
              state.floaters.push({
                x: WORLD.width - 70,
                y: 80,
                text: "+1",
                life: 0.8,
              });
            }
            if (game.feel.particles) spawnBurst(state, enemy, enemy.color, 8);
            resetBall(enemy, WORLD, enemy.speed, false);
          }
        } else if (enemy.movement === "fall") {
          // Rain from the top, wrap around — classic dodge weather.
          enemy.y += enemy.speed * dt;
          if (enemy.y > WORLD.height) {
            enemy.y = -enemy.height;
            enemy.x = (enemy.x + 173) % (WORLD.width - enemy.width);
          }
        } else if (enemy.movement === "chase-player") {
          const enemyCenter = center(enemy);
          const playerCenter = center(state.player);
          const dx = playerCenter.x - enemyCenter.x;
          const dy = playerCenter.y - enemyCenter.y;
          const length = Math.hypot(dx, dy) || 1;
          enemy.x += (dx / length) * enemy.speed * dt;
          enemy.y += (dy / length) * enemy.speed * dt;
        }
        if (enemy.movement !== "fall" && enemy.movement !== "bounce") {
          enemy.x = clamp(enemy.x, 0, WORLD.width - enemy.width);
          enemy.y = clamp(enemy.y, 0, WORLD.height - enemy.height);
        }
        if (state.damageCooldown <= 0 && intersects(state.player, enemy)) {
          if (game.collisionRules.playerHitsEnemy === "bounce") {
            // Paddles and bumpers rebound (handled above for balls); patrol
            // enemies just turn around instead of hurting the player.
            if (enemy.movement !== "bounce") enemy.dir *= -1;
          } else {
            damagePlayer(state);
          }
        }
      }

      for (const obstacle of game.obstacles) {
        if (!intersects(state.player, obstacle)) continue;
        if (
          obstacle.kind === "hazard" ||
          game.collisionRules.playerHitsObstacle === "lose-life"
        ) {
          damagePlayer(state);
        }
      }

      for (const item of state.collectibles) {
        if (item.collected || !intersects(state.player, item)) continue;
        if (game.collisionRules.playerCollectsCollectible === "ignore") continue;
        item.collected =
          game.collisionRules.playerCollectsCollectible !== "score";
        state.score += item.points || game.scoring.perCollectible;
        setUiScore(state.score);
        if (game.feel.particles) spawnBurst(state, item, item.color);
        if (game.feel.collectAnimation) {
          state.floaters.push({
            x: item.x + item.width / 2,
            y: item.y,
            text: `+${item.points || game.scoring.perCollectible}`,
            life: 0.8,
          });
        }
        if (game.collisionRules.playerCollectsCollectible === "win") {
          setStatus(state, "won");
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
          setUiScore(state.score);
          if (game.feel.particles) spawnBurst(state, enemy, enemy.color);
          if (game.feel.screenShake) state.shake = Math.max(state.shake, 0.18);
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
        particle.vy += 260 * dt;
        particle.life -= dt;
      }
      state.particles = state.particles.filter((particle) => particle.life > 0);

      for (const floater of state.floaters) {
        floater.y -= 46 * dt;
        floater.life -= dt;
      }
      state.floaters = state.floaters.filter((floater) => floater.life > 0);

      const allCollected =
        state.collectibles.length > 0 &&
        state.collectibles.every((item) => item.collected);
      const allEnemiesGone =
        game.gameType === "simple-shooter" &&
        state.enemies.length > 0 &&
        state.enemies.every((enemy) => !enemy.alive);
      const targetReached =
        game.scoring.target > 0 && state.score >= game.scoring.target;
      const timeLeft = game.timer.seconds - state.elapsed;

      if (allCollected || allEnemiesGone || targetReached) {
        setStatus(state, "won");
      }
      if (
        game.gameType === "dodge" &&
        game.timer.enabled &&
        timeLeft <= 0 &&
        state.status === "playing"
      ) {
        setStatus(state, "won");
      } else if (
        game.timer.enabled &&
        game.timer.countsDown &&
        timeLeft <= 0 &&
        state.status === "playing"
      ) {
        setStatus(state, allCollected || targetReached ? "won" : "lost");
      }
    };

    const drawHudChip = (
      x: number,
      text: string,
      accent: string
    ): number => {
      ctx.font = "bold 14px ui-sans-serif, system-ui, sans-serif";
      const width = ctx.measureText(text).width + 26;
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.beginPath();
      ctx.roundRect(x, 10, width, 28, 999);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x + 14, 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 24, 25);
      ctx.textBaseline = "alphabetic";
      return x + width + 8;
    };

    const render = (time: number) => {
      const state = stateRef.current;
      const t = time / 1000;

      ctx.save();
      if (state.shake > 0 && game.feel.screenShake) {
        const magnitude = state.shake * 14;
        ctx.translate(
          (Math.random() - 0.5) * magnitude,
          (Math.random() - 0.5) * magnitude
        );
      }

      drawScene(ctx, game, WORLD, t);

      for (const platform of game.platforms) {
        drawPlatform(ctx, platform, platform.color);
      }
      for (const obstacle of game.obstacles) {
        drawEntity(
          ctx,
          obstacle,
          obstacle.color,
          obstacle.kind === "hazard" ? "spiky" : "block",
          { time: t, still: obstacle.kind !== "hazard", shadow: false }
        );
      }
      for (const item of state.collectibles) {
        if (item.collected) continue;
        drawEntity(ctx, item, item.color, item.appearance, {
          time: t,
          phase: item.phase,
        });
      }
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        drawEntity(ctx, enemy, enemy.color, enemy.appearance, {
          time: t,
          phase: enemy.phase,
          face: { mood: "angry", lookX: Math.sign(state.player.x - enemy.x) },
        });
      }
      for (const shot of state.projectiles) {
        ctx.fillStyle = shot.color;
        ctx.beginPath();
        ctx.roundRect(shot.x, shot.y, shot.width, shot.height, 999);
        ctx.fill();
      }

      // Player (blinks while invulnerable after a hit)
      const blinking =
        state.damageCooldown > 0 && Math.floor(t * 10) % 2 === 0;
      if (!blinking) {
        drawEntity(ctx, state.player, state.player.color, game.player.appearance, {
          time: t,
          scaleY: state.player.squash,
          face: { mood: "happy", lookX: state.player.facing * 0.8 },
        });
      }

      for (const particle of state.particles) {
        ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const floater of state.floaters) {
        ctx.globalAlpha = clamp(floater.life / 0.8, 0, 1);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(15,23,42,0.7)";
        ctx.lineWidth = 3;
        ctx.font = "bold 18px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.strokeText(floater.text, floater.x, floater.y);
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.globalAlpha = 1;

      // HUD chips
      let chipX = 12;
      chipX = drawHudChip(chipX, `Score ${state.score}`, game.visualTheme.accentColor);
      chipX = drawHudChip(chipX, `${"♥".repeat(Math.max(0, state.lives))}`, "#f87171");
      if (game.timer.enabled) {
        const timeLeft = Math.max(0, Math.ceil(game.timer.seconds - state.elapsed));
        drawHudChip(chipX, `${timeLeft}s`, "#facc15");
      }

      if (debugOverlay) {
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.lineWidth = 1.5;
        const box = (
          rect: GameRect,
          id: string,
          stroke: string
        ) => {
          ctx.strokeStyle = stroke;
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = stroke;
          ctx.fillText(
            `${id} ${Math.round(rect.x)},${Math.round(rect.y)}`,
            rect.x + 2,
            Math.max(10, rect.y - 3)
          );
        };
        game.platforms.forEach((p) => box(p, p.id, "#22d3ee"));
        game.obstacles.forEach((o) => box(o, o.id, "#f97316"));
        state.collectibles.forEach((c) => {
          if (!c.collected) box(c, c.id, "#facc15");
        });
        state.enemies.forEach((e) => {
          if (e.alive) box(e, e.id, "#f87171");
        });
        box(state.player, "player", "#a3e635");
      }

      ctx.restore();

      if (state.flash > 0 && game.feel.hitFlash) {
        ctx.fillStyle = `rgba(248, 113, 113, ${state.flash * 0.5})`;
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      }
    };

    const tick = (time: number) => {
      const last = lastTimeRef.current ?? time;
      lastTimeRef.current = time;
      const dt = Math.min(0.033, (time - last) / 1000);
      update(dt, time);
      render(time);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [blockers, debugOverlay, game, isPlatformer, isPong, setStatus]);

  const overlay = (() => {
    const state = stateRef.current;
    if (uiStatus === "ready") {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-slate-950/70 p-6 text-center backdrop-blur-[2px]">
          <h3 className="font-heading text-2xl font-bold text-white">
            {game.title}
          </h3>
          <p className="max-w-sm text-sm text-slate-200">
            {game.shortDescription}
          </p>
          <p className="max-w-sm text-xs text-slate-300">{game.objective}</p>
          <Button size="lg" onClick={start} className="mt-2">
            <Play data-icon="inline-start" className="size-4" />
            Play
          </Button>
          <p className="text-xs text-slate-400">{game.controls.instructions}</p>
        </div>
      );
    }
    if (uiStatus === "won" || uiStatus === "lost") {
      const won = uiStatus === "won";
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-slate-950/75 p-6 text-center backdrop-blur-[2px]">
          {won && <Trophy className="size-10 text-yellow-400" />}
          <h3 className="font-heading text-3xl font-bold text-white">
            {won ? "You win!" : "Game over"}
          </h3>
          <p className="max-w-sm text-sm text-slate-200">
            {won ? game.winCondition : game.loseCondition}
          </p>
          <p className="text-sm font-medium text-slate-100">
            Final score: {uiScore}
          </p>
          <Button size="lg" onClick={() => reset(true)} className="mt-1">
            <RotateCcw data-icon="inline-start" className="size-4" />
            Play again
          </Button>
        </div>
      );
    }
    if (uiStatus === "paused") {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-slate-950/60 p-6 text-center">
          <h3 className="font-heading text-2xl font-bold text-white">Paused</h3>
          <Button size="lg" onClick={togglePause}>
            <Play data-icon="inline-start" className="size-4" />
            Resume
          </Button>
        </div>
      );
    }
    void state;
    return null;
  })();

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ backgroundColor: shade(game.visualTheme.background.color, -0.75) }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs text-slate-200">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{game.title}</p>
          <p className="truncate text-slate-400">
            {game.controls.instructions} · P pause · R restart
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-slate-100"
            onClick={togglePause}
            title="Pause"
          >
            {uiStatus === "paused" ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-slate-100"
            onClick={() => reset(false)}
            title="Restart"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div className="relative max-h-full w-full max-w-full" style={{ aspectRatio: "16 / 9" }}>
          <canvas
            ref={canvasRef}
            width={WORLD.width}
            height={WORLD.height}
            className="h-full w-full touch-none rounded-md border border-white/10"
            aria-label={`${game.title} game preview`}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
