import type { GameAppearance, GameRect, GameSpec } from "@/types/game";

/**
 * Cartoon drawing helpers for the game renderer: rounded shapes, thick
 * outlines, simple faces, soft shadows. Pure functions of (ctx, geometry,
 * time) — no game state.
 */

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb color. */
export function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  if (Number.isNaN(value)) return hex;
  const channel = (offset: number) => {
    const raw = (value >> offset) & 0xff;
    const next = Math.round(raw + (amount > 0 ? (255 - raw) : raw) * amount);
    return Math.min(255, Math.max(0, next));
  };
  return `#${[16, 8, 0]
    .map((offset) => channel(offset).toString(16).padStart(2, "0"))
    .join("")}`;
}

function outline(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.strokeStyle = shade(color, -0.45);
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function drawSoftShadow(
  ctx: CanvasRenderingContext2D,
  rect: GameRect
): void {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.14)";
  ctx.beginPath();
  ctx.ellipse(
    rect.x + rect.width / 2,
    rect.y + rect.height + 4,
    rect.width * 0.42,
    Math.max(3, rect.height * 0.1),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

interface FaceOptions {
  mood: "happy" | "angry" | "neutral";
  /** -1..1 — which way the pupils look. */
  lookX?: number;
}

export function drawFace(
  ctx: CanvasRenderingContext2D,
  rect: GameRect,
  { mood, lookX = 0 }: FaceOptions
): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height * 0.42;
  const eyeGap = rect.width * 0.18;
  const eyeR = Math.max(2.5, rect.width * 0.09);

  for (const side of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx + side * eyeGap, cy, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(
      cx + side * eyeGap + lookX * eyeR * 0.4,
      cy,
      eyeR * 0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  if (mood === "angry") {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * (eyeGap + eyeR), cy - eyeR * 1.6);
      ctx.lineTo(cx + side * (eyeGap - eyeR * 0.6), cy - eyeR * 0.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy + rect.height * 0.3, rect.width * 0.12, Math.PI * 1.15, Math.PI * 1.85, true);
    ctx.stroke();
  } else if (mood === "happy") {
    ctx.beginPath();
    ctx.arc(cx, cy + rect.height * 0.12, rect.width * 0.16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
}

function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  rotation: number
): void {
  const inner = outer * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export interface DrawEntityOptions {
  /** Seconds since the game started — drives idle animation. */
  time: number;
  /** Stable per-entity phase so idle bobbing isn't synchronized. */
  phase?: number;
  face?: FaceOptions;
  /** Extra squash/stretch: 1 = none, <1 squashed, >1 stretched. */
  scaleY?: number;
  shadow?: boolean;
  /** Skip idle bobbing (platforms, walls). */
  still?: boolean;
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  rect: GameRect,
  color: string,
  appearance: GameAppearance,
  options: DrawEntityOptions
): void {
  const { time, phase = 0, face, scaleY = 1, shadow = true, still } = options;
  const bob = still ? 0 : Math.sin(time * 2.2 + phase) * 2;

  const cx = rect.x + rect.width / 2;
  const bottom = rect.y + rect.height;
  const height = rect.height * scaleY;
  const width = rect.width * (2 - scaleY);
  const drawn: GameRect = {
    x: cx - width / 2,
    y: bottom - height + bob,
    width,
    height,
  };
  const dcx = drawn.x + drawn.width / 2;
  const dcy = drawn.y + drawn.height / 2;
  const r = Math.min(drawn.width, drawn.height) / 2;

  if (shadow) drawSoftShadow(ctx, rect);

  ctx.fillStyle = color;

  switch (appearance) {
    case "ball": {
      ctx.beginPath();
      ctx.arc(dcx, dcy, r, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, color);
      // Glossy highlight
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(dcx - r * 0.3, dcy - r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "star": {
      starPath(ctx, dcx, dcy, r, still ? 0 : Math.sin(time * 1.6 + phase) * 0.2);
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "gem": {
      ctx.beginPath();
      ctx.moveTo(dcx, drawn.y);
      ctx.lineTo(drawn.x + drawn.width, dcy);
      ctx.lineTo(dcx, drawn.y + drawn.height);
      ctx.lineTo(drawn.x, dcy);
      ctx.closePath();
      ctx.fill();
      outline(ctx, color);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(dcx, drawn.y + 3);
      ctx.lineTo(dcx + drawn.width * 0.2, dcy);
      ctx.lineTo(dcx, dcy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "heart": {
      const w = drawn.width;
      const h = drawn.height;
      ctx.beginPath();
      ctx.moveTo(dcx, drawn.y + h * 0.32);
      ctx.bezierCurveTo(dcx + w * 0.5, drawn.y - h * 0.18, dcx + w * 0.55, dcy + h * 0.1, dcx, drawn.y + h * 0.95);
      ctx.bezierCurveTo(dcx - w * 0.55, dcy + h * 0.1, dcx - w * 0.5, drawn.y - h * 0.18, dcx, drawn.y + h * 0.32);
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "spiky": {
      const spikes = 10;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const radius = i % 2 === 0 ? r : r * 0.62;
        const angle = (i * Math.PI) / spikes + (still ? 0 : time * 0.8 + phase);
        const x = dcx + Math.cos(angle) * radius;
        const y = dcy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "cloud": {
      ctx.beginPath();
      ctx.arc(dcx - drawn.width * 0.22, dcy + drawn.height * 0.08, r * 0.62, 0, Math.PI * 2);
      ctx.arc(dcx + drawn.width * 0.05, dcy - drawn.height * 0.12, r * 0.7, 0, Math.PI * 2);
      ctx.arc(dcx + drawn.width * 0.26, dcy + drawn.height * 0.1, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "flag": {
      ctx.strokeStyle = shade(color, -0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(drawn.x + 4, drawn.y);
      ctx.lineTo(drawn.x + 4, drawn.y + drawn.height);
      ctx.stroke();
      ctx.beginPath();
      const wave = still ? 0 : Math.sin(time * 3 + phase) * 3;
      ctx.moveTo(drawn.x + 4, drawn.y + 2);
      ctx.lineTo(drawn.x + drawn.width, drawn.y + drawn.height * 0.22 + wave);
      ctx.lineTo(drawn.x + 4, drawn.y + drawn.height * 0.48);
      ctx.closePath();
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "creature": {
      ctx.beginPath();
      ctx.roundRect(drawn.x, drawn.y, drawn.width, drawn.height, Math.min(12, r));
      ctx.fill();
      outline(ctx, color);
      break;
    }
    case "block":
    default: {
      ctx.beginPath();
      ctx.roundRect(drawn.x, drawn.y, drawn.width, drawn.height, 8);
      ctx.fill();
      outline(ctx, color);
      break;
    }
  }

  if (face && (appearance === "creature" || appearance === "ball" || appearance === "block")) {
    drawFace(ctx, drawn, face);
  }
}

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  rect: GameRect,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 10);
  ctx.fill();
  outline(ctx, color);
  // Grassy top highlight
  ctx.fillStyle = shade(color, 0.3);
  ctx.beginPath();
  ctx.roundRect(rect.x + 3, rect.y + 3, rect.width - 6, Math.min(7, rect.height * 0.3), 5);
  ctx.fill();
}

/** Layered scenery background: sky wash, pattern, distant hills. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  game: GameSpec,
  world: { width: number; height: number },
  time: number
): void {
  const { color, pattern } = game.visualTheme.background;

  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, shade(color, 0.12));
  gradient.addColorStop(1, shade(color, -0.08));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = game.visualTheme.accentColor;
  ctx.fillStyle = game.visualTheme.accentColor;

  if (pattern === "grid") {
    for (let x = 0; x <= world.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = 0; y <= world.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }
  } else if (pattern === "stars") {
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 137) % world.width;
      const y = (i * 71) % world.height;
      const twinkle = 0.5 + Math.sin(time * 1.5 + i) * 0.5;
      ctx.globalAlpha = 0.1 + twinkle * 0.18;
      ctx.beginPath();
      ctx.arc(x, y, i % 3 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === "dots") {
    for (let x = 24; x < world.width; x += 56) {
      for (let y = 24; y < world.height; y += 56) {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "stripes") {
    ctx.lineWidth = 24;
    ctx.globalAlpha = 0.07;
    for (let x = -world.height; x < world.width; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, world.height);
      ctx.lineTo(x + world.height, 0);
      ctx.stroke();
    }
  } else if (pattern === "hills") {
    ctx.globalAlpha = 0.2;
    for (const [offset, height, step] of [
      [0, 0.22, 340],
      [170, 0.16, 300],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(0, world.height);
      for (let x = 0; x <= world.width + step; x += step) {
        const peak = world.height - Math.abs(Math.sin((x + offset) * 0.01)) * world.height * height;
        ctx.quadraticCurveTo(x - step / 2, peak, x, world.height * 0.92);
      }
      ctx.lineTo(world.width, world.height);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}
