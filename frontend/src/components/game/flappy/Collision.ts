import type { Pipe } from "./PipeGenerator";

/**
 * Collision detection. The bird's hitbox is a slightly shrunk axis-aligned
 * box (classic Flappy Bird uses a forgiving hitbox so near-misses feel fair).
 * Pipes are two rectangles; the ground and ceiling are horizontal limits.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BirdCollisionInfo {
  /** Fixed horizontal center of the bird. */
  birdX: number;
  birdWidth: number;
  birdHeight: number;
  pipeWidth: number;
  /** Bottom of the playable area (top of the ground). */
  playableHeight: number;
}

/** Fraction of the bird box trimmed on each axis for a forgiving hitbox. */
const HITBOX_INSET = 0.16;

/** The bird's world-space hitbox for a given vertical center `y`. */
export function birdHitbox(y: number, info: BirdCollisionInfo): Rect {
  const insetX = info.birdWidth * HITBOX_INSET;
  const insetY = info.birdHeight * HITBOX_INSET;
  const width = info.birdWidth - insetX * 2;
  const height = info.birdHeight - insetY * 2;
  return {
    x: info.birdX - width / 2,
    y: y - height / 2,
    width,
    height,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** The top and bottom rectangles a pipe occupies in the playable area. */
export function pipeRects(pipe: Pipe, info: BirdCollisionInfo): [Rect, Rect] {
  const gapTop = pipe.gapCenter - pipe.gapHalf;
  const gapBottom = pipe.gapCenter + pipe.gapHalf;
  const top: Rect = {
    x: pipe.x,
    y: 0,
    width: info.pipeWidth,
    height: Math.max(0, gapTop),
  };
  const bottom: Rect = {
    x: pipe.x,
    y: gapBottom,
    width: info.pipeWidth,
    height: Math.max(0, info.playableHeight - gapBottom),
  };
  return [top, bottom];
}

/** True if the bird at vertical center `y` overlaps either half of `pipe`. */
export function birdHitsPipe(
  y: number,
  pipe: Pipe,
  info: BirdCollisionInfo
): boolean {
  const box = birdHitbox(y, info);
  // Cheap horizontal reject: skip pipes the bird can't be touching.
  if (box.x > pipe.x + info.pipeWidth || box.x + box.width < pipe.x) {
    return false;
  }
  const [top, bottom] = pipeRects(pipe, info);
  return rectsOverlap(box, top) || rectsOverlap(box, bottom);
}

/** Bird has landed on (or sunk into) the ground. */
export function birdHitsGround(y: number, info: BirdCollisionInfo): boolean {
  return y + info.birdHeight / 2 >= info.playableHeight;
}

/**
 * Bird has flown off the top of the screen. A little slack above y=0 is
 * allowed so brushing the ceiling isn't an instant death.
 */
export function birdOffTop(y: number, info: BirdCollisionInfo): boolean {
  return y + info.birdHeight / 2 <= 0;
}

/** Any fatal collision for the bird at vertical center `y`. */
export function birdCollides(
  y: number,
  pipes: Pipe[],
  info: BirdCollisionInfo
): boolean {
  if (birdHitsGround(y, info) || birdOffTop(y, info)) return true;
  for (const pipe of pipes) {
    if (birdHitsPipe(y, pipe, info)) return true;
  }
  return false;
}
