import { describe, expect, it } from "vitest";

import { resetBall, stepBall, type BallState } from "../systems/ball";

const WORLD = { width: 960, height: 540 };
const PADDLE = { x: 30, y: 220, width: 18, height: 110 };

const makeBall = (overrides: Partial<BallState> = {}): BallState => ({
  x: 470,
  y: 260,
  width: 22,
  height: 22,
  vx: -300,
  vy: 0,
  ...overrides,
});

const options = (overrides: Partial<Parameters<typeof stepBall>[2]> = {}) => ({
  world: WORLD,
  player: PADDLE,
  surfaces: [],
  pong: true,
  ...overrides,
});

/** Run the sim until a predicate or a frame budget is hit. */
function simulate(
  ball: BallState,
  opts: Parameters<typeof stepBall>[2],
  frames: number,
  until?: (events: ReturnType<typeof stepBall>) => boolean
) {
  for (let i = 0; i < frames; i += 1) {
    const events = stepBall(ball, 1 / 60, opts);
    if (until?.(events)) return events;
  }
  return null;
}

describe("stepBall", () => {
  it("rebounds off the player paddle instead of passing through", () => {
    const ball = makeBall({ y: PADDLE.y + 40, vx: -300 });
    const events = simulate(ball, options(), 240, (e) => e.hitPaddle);

    expect(events?.hitPaddle).toBe(true);
    expect(ball.vx).toBeGreaterThan(0); // heading right again
    expect(ball.x).toBeGreaterThanOrEqual(PADDLE.x + PADDLE.width); // in front
  });

  it("adds angle based on where the ball hits the paddle", () => {
    const highHit = makeBall({ y: PADDLE.y + 5, vx: -300, vy: 0 });
    simulate(highHit, options(), 240, (e) => e.hitPaddle);
    expect(highHit.vy).toBeLessThan(0); // top of paddle sends it upward

    const lowHit = makeBall({ y: PADDLE.y + PADDLE.height - 25, vx: -300, vy: 0 });
    simulate(lowHit, options(), 240, (e) => e.hitPaddle);
    expect(lowHit.vy).toBeGreaterThan(0); // bottom of paddle sends it down
  });

  it("speeds the rally up slightly on each paddle hit", () => {
    const ball = makeBall({ y: PADDLE.y + 40, vx: -300 });
    simulate(ball, options(), 240, (e) => e.hitPaddle);
    expect(Math.abs(ball.vx)).toBeGreaterThan(300);
  });

  it("rebounds off solid surfaces such as an AI paddle", () => {
    const aiPaddle = { x: 912, y: 200, width: 18, height: 140 };
    const ball = makeBall({ x: 800, y: 250, vx: 300 });
    const events = simulate(
      ball,
      options({ surfaces: [aiPaddle] }),
      240,
      (e) => e.hitSurface
    );

    expect(events?.hitSurface).toBe(true);
    expect(ball.vx).toBeLessThan(0); // reflected back toward the player
    expect(ball.x + ball.width).toBeLessThanOrEqual(aiPaddle.x + 1);
  });

  it("reports a miss when the ball passes the left edge in pong", () => {
    const ball = makeBall({ x: 40, y: 60, vx: -400 }); // above the paddle
    const events = simulate(ball, options(), 240, (e) => e.missedLeft);
    expect(events?.missedLeft).toBe(true);
  });

  it("reports a score when the ball passes the right edge in pong", () => {
    const ball = makeBall({ x: 900, vx: 400 });
    const events = simulate(ball, options(), 240, (e) => e.scoredRight);
    expect(events?.scoredRight).toBe(true);
  });

  it("treats left/right edges as walls outside pong", () => {
    const ball = makeBall({ x: 900, y: 60, vx: 400 });
    simulate(ball, options({ pong: false }), 240);
    expect(ball.x + ball.width).toBeLessThanOrEqual(WORLD.width);

    const leftBall = makeBall({ x: 5, y: 60, vx: -400 });
    simulate(leftBall, options({ pong: false }), 240);
    expect(leftBall.x).toBeGreaterThanOrEqual(0);
  });

  it("reflects off the top and bottom walls", () => {
    const ball = makeBall({ x: 500, y: 4, vx: 0, vy: -300 });
    stepBall(ball, 1 / 60, options());
    expect(ball.vy).toBeGreaterThan(0);
    expect(ball.y).toBe(0);
  });
});

describe("resetBall", () => {
  it("re-serves from the center toward the conceding side", () => {
    const ball = makeBall({ x: -50, vx: -300 });
    resetBall(ball, WORLD, 300, true);
    expect(ball.x).toBeCloseTo(WORLD.width / 2 - ball.width / 2);
    expect(ball.vx).toBeLessThan(0);

    resetBall(ball, WORLD, 300, false);
    expect(ball.vx).toBeGreaterThan(0);
  });
});
