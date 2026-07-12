/**
 * A fixed-timestep game loop. Physics advances in constant `step` increments
 * (default 1/60s) regardless of the display refresh rate, so gameplay is
 * deterministic and identical on 60Hz, 120Hz, or a throttled tab. Render runs
 * once per animation frame with an interpolation factor for smoothness.
 *
 * The time source and scheduler are injectable so the loop can be driven
 * synthetically in tests with no browser.
 */

export interface GameLoopOptions {
  /** Advance the simulation by exactly `dt` seconds. */
  update: (dt: number) => void;
  /** Draw the current state. `alpha` ∈ [0,1) interpolates within a step. */
  render: (alpha: number) => void;
  /** Fixed simulation step in seconds. Default 1/60. */
  step?: number;
  /** Max real seconds consumed per frame — prevents spiral-of-death after a
   * long stall (e.g. background tab). Default 0.25s. */
  maxFrameTime?: number;
  now?: () => number;
  requestFrame?: (cb: (t: number) => void) => number;
  cancelFrame?: (handle: number) => void;
}

export interface GameLoopHandle {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

function defaultNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function createGameLoop(options: GameLoopOptions): GameLoopHandle {
  const step = options.step ?? 1 / 60;
  const maxFrameTime = options.maxFrameTime ?? 0.25;
  const now = options.now ?? defaultNow;
  const requestFrame =
    options.requestFrame ??
    ((cb) => requestAnimationFrame(cb));
  const cancelFrame =
    options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));

  let running = false;
  let handle = 0;
  let previous = 0;
  let accumulator = 0;

  const frame = (): void => {
    if (!running) return;
    const current = now();
    let frameTime = (current - previous) / 1000;
    previous = current;
    if (frameTime > maxFrameTime) frameTime = maxFrameTime;
    accumulator += frameTime;

    while (accumulator >= step) {
      options.update(step);
      accumulator -= step;
    }

    options.render(accumulator / step);
    handle = requestFrame(frame);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      previous = now();
      accumulator = 0;
      handle = requestFrame(frame);
    },
    stop(): void {
      running = false;
      if (handle) cancelFrame(handle);
      handle = 0;
    },
    isRunning(): boolean {
      return running;
    },
  };
}
