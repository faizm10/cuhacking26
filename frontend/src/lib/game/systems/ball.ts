import type { GameRect } from "@/types/game";

import { clamp, center, intersects } from "./geometry";

/**
 * Bouncing-ball physics shared by pong balls, meteors, and bumper balls.
 * Pure state-stepping: mutates the ball, reports what happened as events so
 * the renderer can apply scoring, lives, and game feel.
 */

export interface BallState extends GameRect {
  vx: number;
  vy: number;
}

export interface BallStepOptions {
  world: { width: number; height: number };
  /** The player rect — rebounds the ball like a paddle. */
  player: GameRect;
  /** Solid rects (platforms, walls, other enemies) the ball reflects off. */
  surfaces: GameRect[];
  /** Pong mode: left/right edges are goals instead of walls. */
  pong: boolean;
}

export interface BallStepEvents {
  hitPaddle: boolean;
  hitSurface: boolean;
  /** Pong only: ball crossed the left edge (player concedes). */
  missedLeft: boolean;
  /** Pong only: ball crossed the right edge (player scores). */
  scoredRight: boolean;
}

const MAX_VX = 640;
const MAX_VY = 520;
/** Each paddle hit speeds the rally up slightly. */
const PADDLE_SPEEDUP = 1.04;
/** How strongly the hit offset on the paddle angles the ball. */
const SPIN = 180;

export function stepBall(
  ball: BallState,
  dt: number,
  { world, player, surfaces, pong }: BallStepOptions
): BallStepEvents {
  const events: BallStepEvents = {
    hitPaddle: false,
    hitSurface: false,
    missedLeft: false,
    scoredRight: false,
  };

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Top/bottom walls always reflect.
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.y + ball.height >= world.height) {
    ball.y = world.height - ball.height;
    ball.vy = -Math.abs(ball.vy);
  }

  // Player paddle: rebound horizontally, hit offset adds angle (pong feel).
  if (intersects(ball, player)) {
    events.hitPaddle = true;
    const offset =
      (center(ball).y - center(player).y) / (player.height / 2 || 1);
    if (center(ball).x < center(player).x) {
      ball.x = player.x - ball.width - 1;
      ball.vx = -Math.abs(ball.vx) * PADDLE_SPEEDUP;
    } else {
      ball.x = player.x + player.width + 1;
      ball.vx = Math.abs(ball.vx) * PADDLE_SPEEDUP;
    }
    ball.vx = clamp(ball.vx, -MAX_VX, MAX_VX);
    ball.vy = clamp(ball.vy + offset * SPIN, -MAX_VY, MAX_VY);
  }

  // Solid surfaces (walls, platforms, an AI paddle): reflect on the axis of
  // least penetration and push the ball out of the overlap.
  for (const surface of surfaces) {
    if (!intersects(ball, surface)) continue;
    events.hitSurface = true;
    const overlapX = Math.min(
      ball.x + ball.width - surface.x,
      surface.x + surface.width - ball.x
    );
    const overlapY = Math.min(
      ball.y + ball.height - surface.y,
      surface.y + surface.height - ball.y
    );
    if (overlapX < overlapY) {
      ball.vx =
        center(ball).x < center(surface).x
          ? -Math.abs(ball.vx)
          : Math.abs(ball.vx);
      ball.x += ball.vx > 0 ? overlapX : -overlapX;
    } else {
      ball.vy =
        center(ball).y < center(surface).y
          ? -Math.abs(ball.vy)
          : Math.abs(ball.vy);
      ball.y += ball.vy > 0 ? overlapY : -overlapY;
    }
  }

  if (pong) {
    if (ball.x + ball.width < 0) events.missedLeft = true;
    else if (ball.x > world.width) events.scoredRight = true;
  } else {
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.width >= world.width) {
      ball.x = world.width - ball.width;
      ball.vx = -Math.abs(ball.vx);
    }
  }

  return events;
}

/** Re-serve from the center toward the side that conceded. */
export function resetBall(
  ball: BallState,
  world: { width: number; height: number },
  baseSpeed: number,
  towardLeft: boolean
): void {
  ball.x = world.width / 2 - ball.width / 2;
  ball.y = world.height / 2 - ball.height / 2;
  const speed = Math.max(160, baseSpeed);
  ball.vx = towardLeft ? -speed : speed;
  ball.vy = (Math.random() - 0.5) * speed;
}
