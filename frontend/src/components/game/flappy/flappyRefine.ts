import {
  clampLimit,
  DEFAULT_FLAPPY_SPEC,
  type FlappyBackground,
  type FlappyBirdColor,
  type FlappyPipeColor,
  type FlappySpec,
  type FlappyWeather,
} from "./flappyTypes";

/**
 * Deterministic chat edits for Flappy Bird. Handles the common requests
 * locally (fast, free, and impossible to derail); the model path covers the
 * rest. Only whitelisted CONFIG fields can ever change — never geometry,
 * physics code, or arcade mechanics.
 */

export interface FlappyRefineResult {
  spec: FlappySpec;
  assistantMessage: string;
  matched: boolean;
}

const BIRD_COLOR_WORDS: Record<string, FlappyBirdColor> = {
  yellow: "yellow",
  gold: "yellow",
  red: "red",
  blue: "blue",
  green: "green",
  orange: "orange",
  pink: "pink",
  white: "white",
  mint: "mint",
  teal: "mint",
};

const PIPE_COLOR_WORDS: Record<string, FlappyPipeColor> = {
  green: "green",
  emerald: "emerald",
  teal: "teal",
  red: "red",
  orange: "orange",
  purple: "purple",
  violet: "purple",
  blue: "blue",
  slate: "slate",
  gray: "slate",
  grey: "slate",
};

const BACKGROUND_WORDS: Record<string, FlappyBackground> = {
  day: "day",
  daytime: "day",
  morning: "dawn",
  dawn: "dawn",
  sunrise: "dawn",
  sunset: "sunset",
  dusk: "sunset",
  evening: "sunset",
  night: "night",
  dark: "night",
};

const WEATHER_WORDS: Record<string, FlappyWeather> = {
  snow: "snow",
  snowy: "snow",
  rain: "rain",
  rainy: "rain",
  storm: "rain",
};

const STEP = {
  pipeGap: 24,
  pipeSpacing: 44,
  scrollSpeed: 36,
  gravity: 130,
  flapStrength: 32,
} as const;

function findWord<T extends string>(
  text: string,
  table: Record<string, T>
): T | null {
  for (const [word, value] of Object.entries(table)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

/** Apply a chat message locally. matched:false means "let the model try". */
export function applyFlappyRefine(
  source: FlappySpec,
  message: string
): FlappyRefineResult {
  const spec = structuredClone(source);
  const text = message.toLowerCase();
  const changes: string[] = [];

  const wantsLess = /\b(less|lower|reduce|weaker|softer|smaller|slow)\b/.test(
    text
  );

  // Difficulty / gap
  if (/\b(easier|easy|more room|bigger gap|wider gap|wider pipe|open)\b/.test(text)) {
    spec.pipeGap = clampLimit(spec.pipeGap + STEP.pipeGap, "pipeGap");
    changes.push("the gaps are more forgiving");
  } else if (/\b(harder|tighter|smaller gap|narrow|tough)\b/.test(text)) {
    spec.pipeGap = clampLimit(spec.pipeGap - STEP.pipeGap, "pipeGap");
    changes.push("the gaps are tighter");
  }

  // "make the pipes wider" — body width is engine-owned; treat as easier gap.
  if (/\bpipes?\b.*\bwider\b|\bwider\b.*\bpipes?\b/.test(text)) {
    spec.pipeGap = clampLimit(spec.pipeGap + STEP.pipeGap, "pipeGap");
    if (!changes.some((c) => c.includes("gap"))) {
      changes.push("pipe openings are wider (pipe width is automatic)");
    }
  }

  // Pipe spacing
  if (/\b(more|bigger|wider)\s+(space|spacing|distance|gap between)\b/.test(text) || /\bspace out\b/.test(text)) {
    spec.pipeSpacing = clampLimit(spec.pipeSpacing + STEP.pipeSpacing, "pipeSpacing");
    changes.push("pipes are farther apart");
  } else if (/\b(closer|less space|tighter spacing)\b/.test(text)) {
    spec.pipeSpacing = clampLimit(spec.pipeSpacing - STEP.pipeSpacing, "pipeSpacing");
    changes.push("pipes are closer together");
  }

  // Flap strength (more negative = stronger/higher)
  if (/\bflap\b.*\b(higher|stronger|harder|more)\b|\b(higher|stronger)\b.*\bflap\b|jump higher/.test(text)) {
    spec.flapStrength = clampLimit(spec.flapStrength - STEP.flapStrength, "flapStrength");
    changes.push("the bird flaps higher");
  } else if (/\bflap\b.*\b(weaker|lower|less|gentler)\b/.test(text)) {
    spec.flapStrength = clampLimit(spec.flapStrength + STEP.flapStrength, "flapStrength");
    changes.push("the bird flaps more gently");
  }

  // Speed
  if (/\b(speed up|faster|quicker|speed it up)\b/.test(text)) {
    spec.scrollSpeed = clampLimit(spec.scrollSpeed + STEP.scrollSpeed, "scrollSpeed");
    changes.push("the game is faster");
  } else if (/\b(slow down|slower|slow everything|slow it down|calmer)\b/.test(text)) {
    spec.scrollSpeed = clampLimit(spec.scrollSpeed - STEP.scrollSpeed, "scrollSpeed");
    if (/everything|all/.test(text)) {
      spec.gravity = clampLimit(spec.gravity - STEP.gravity, "gravity");
    }
    changes.push("everything is slower");
  }

  // Gravity / floatiness
  if (/\b(floaty|floatier|less gravity|lighter)\b/.test(text)) {
    spec.gravity = clampLimit(spec.gravity - STEP.gravity, "gravity");
    changes.push("gravity is lighter");
  } else if (/\b(more gravity|heavier|heavy|drops? faster)\b/.test(text)) {
    spec.gravity = clampLimit(spec.gravity + STEP.gravity, "gravity");
    changes.push("gravity is heavier");
  }

  // Bird color
  const birdMatch = /\bbird\b/.test(text);
  if (birdMatch) {
    const clause = text.slice(text.search(/\bbird\b/));
    const color = findWord(clause, BIRD_COLOR_WORDS);
    if (color) {
      spec.birdColor = color;
      changes.push(`the bird is ${color}`);
    }
  }

  // Pipe color
  if (/\bpipes?\b/.test(text)) {
    const clause = text.slice(text.search(/\bpipes?\b/));
    const color = findWord(clause, PIPE_COLOR_WORDS);
    if (color) {
      spec.pipeColor = color;
      changes.push(`pipes are ${color}`);
    }
  }

  // Background time of day
  if (/background|sky|scene|make it|change to|theme/.test(text)) {
    const bg = findWord(text, BACKGROUND_WORDS);
    if (bg) {
      spec.background = bg;
      changes.push(`the background is now ${bg}`);
    }
  } else {
    // Bare "night" / "sunset" without a lead-in still reads as a background ask.
    const bg = findWord(text, BACKGROUND_WORDS);
    if (bg && /\b(night|sunset|dawn|daytime|dusk|dark)\b/.test(text)) {
      spec.background = bg;
      changes.push(`the background is now ${bg}`);
    }
  }

  // Weather
  const wantsRemoveWeather = /\b(no|remove|stop|clear|without)\b/.test(text);
  const weather = findWord(text, WEATHER_WORDS);
  if (weather) {
    spec.weather = wantsRemoveWeather ? "none" : weather;
    changes.push(
      spec.weather === "none" ? "weather cleared" : `${weather} added`
    );
  } else if (/\b(clear|no)\s+(weather|snow|rain)\b/.test(text)) {
    spec.weather = "none";
    changes.push("weather cleared");
  }

  // Feature toggles
  if (/moving pipes|bobbing pipes|pipes move/.test(text)) {
    spec.features.movingPipes = !wantsLess && !wantsRemoveWeather;
    changes.push(`moving pipes ${spec.features.movingPipes ? "on" : "off"}`);
  }
  if (/\bsound|audio|sfx|music\b/.test(text)) {
    spec.features.sound = !wantsRemoveWeather && !/\boff|mute\b/.test(text);
    changes.push(`sound is ${spec.features.sound ? "on" : "off"}`);
  }
  if (/\bclouds?\b/.test(text)) {
    spec.features.clouds = !wantsRemoveWeather;
    changes.push(`clouds ${spec.features.clouds ? "on" : "off"}`);
  }

  if (changes.length === 0) {
    return { spec: source, assistantMessage: "", matched: false };
  }
  return {
    spec,
    assistantMessage: `Done — ${changes.join(", ")}.`,
    matched: true,
  };
}

/** Fallback reply listing what chat can change, for unsupported asks. */
export const FLAPPY_UNSUPPORTED_MESSAGE =
  "For Flappy Bird I can tweak: gap size (easier/harder), pipe spacing, flap strength, speed, gravity, bird & pipe colors, background (day/night/sunset/dawn), snow/rain, and moving pipes.";

/** Convenience for tests / mock mode. */
export function refineFromDefault(message: string): FlappyRefineResult {
  return applyFlappyRefine(DEFAULT_FLAPPY_SPEC, message);
}
