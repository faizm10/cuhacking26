/**
 * Coerce model-produced color strings into #RRGGBB so Zod accepts them.
 * Structured output strips regex patterns, so models often return #fff, names,
 * rgba(), or 8-digit hex — normalize before validation instead of failing.
 */

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#9ca3af",
  grey: "#9ca3af",
  cyan: "#22d3ee",
  skyblue: "#38bdf8",
  gold: "#fbbf24",
  brown: "#a16207",
};

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

/** Returns a six-digit hex color, or null if it cannot be salvaged. */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  if (NAMED_COLORS[raw]) return NAMED_COLORS[raw]!;

  const rgb = raw.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i
  );
  if (rgb) {
    return `#${channelToHex(Number(rgb[1]))}${channelToHex(Number(rgb[2]))}${channelToHex(Number(rgb[3]))}`;
  }

  let hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    hex = hex
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
  }
  if (/^[0-9a-f]{8}$/i.test(hex)) {
    hex = hex.slice(0, 6);
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return `#${hex.toLowerCase()}`;
  }
  return null;
}

/**
 * Walk a raw game JSON tree and rewrite every color-like field in place.
 * Falls back to `fallback` when a value cannot be normalized.
 */
export function normalizeColorsInPlace(
  node: unknown,
  fallback = "#38bdf8"
): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) normalizeColorsInPlace(item, fallback);
    return;
  }

  const obj = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (
      (key === "color" || key === "accentColor") &&
      (typeof value === "string" || value == null)
    ) {
      obj[key] = normalizeHexColor(value) ?? fallback;
      continue;
    }
    if (key === "background" && value && typeof value === "object") {
      const bg = value as Record<string, unknown>;
      if ("color" in bg) {
        bg.color = normalizeHexColor(bg.color) ?? fallback;
      }
      continue;
    }
    if (value && typeof value === "object") {
      normalizeColorsInPlace(value, fallback);
    }
  }
}
