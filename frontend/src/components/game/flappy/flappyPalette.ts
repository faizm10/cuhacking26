import type {
  FlappyBackground,
  FlappyBirdColor,
  FlappyPipeColor,
} from "./flappyTypes";

/**
 * Named config enums → concrete colors. Kept out of the schema so the model
 * can only ever pick from this fixed, cheerful, readable palette.
 */

export interface BirdPalette {
  body: string;
  bodyDark: string;
  belly: string;
  wing: string;
  beak: string;
}

export const BIRD_PALETTES: Record<FlappyBirdColor, BirdPalette> = {
  yellow: {
    body: "#ffd33d",
    bodyDark: "#f5a623",
    belly: "#fff3c4",
    wing: "#f7b733",
    beak: "#ff7a1a",
  },
  red: {
    body: "#ff5a5f",
    bodyDark: "#e23b40",
    belly: "#ffd3d4",
    wing: "#ff787c",
    beak: "#ffb020",
  },
  blue: {
    body: "#4aa8ff",
    bodyDark: "#2b7fe0",
    belly: "#d6ecff",
    wing: "#69b8ff",
    beak: "#ff9f1a",
  },
  green: {
    body: "#54d17a",
    bodyDark: "#33ac5b",
    belly: "#d6f7e0",
    wing: "#6fe093",
    beak: "#ff9f1a",
  },
  orange: {
    body: "#ff9f43",
    bodyDark: "#f07b16",
    belly: "#ffe4c4",
    wing: "#ffb265",
    beak: "#ff5722",
  },
  pink: {
    body: "#ff8fc7",
    bodyDark: "#f062a8",
    belly: "#ffe0f0",
    wing: "#ffa6d3",
    beak: "#ff7a1a",
  },
  white: {
    body: "#f4f6fb",
    bodyDark: "#cfd6e6",
    belly: "#ffffff",
    wing: "#e2e8f5",
    beak: "#ff9f1a",
  },
  mint: {
    body: "#6be0c8",
    bodyDark: "#38bda2",
    belly: "#d6fbf2",
    wing: "#88ecd7",
    beak: "#ff9f1a",
  },
};

export interface PipePalette {
  body: string;
  bodyLight: string;
  bodyDark: string;
  highlight: string;
  rim: string;
}

export const PIPE_PALETTES: Record<FlappyPipeColor, PipePalette> = {
  green: {
    body: "#5bc94a",
    bodyLight: "#8be37a",
    bodyDark: "#3f9b31",
    highlight: "#c7f5bd",
    rim: "#2f7a24",
  },
  emerald: {
    body: "#10b981",
    bodyLight: "#4fd6a8",
    bodyDark: "#0b8a61",
    highlight: "#a7f3d8",
    rim: "#086b4b",
  },
  teal: {
    body: "#22b8c4",
    bodyLight: "#5cd6df",
    bodyDark: "#158e98",
    highlight: "#b0eef2",
    rim: "#0f6f77",
  },
  red: {
    body: "#ef5350",
    bodyLight: "#ff8683",
    bodyDark: "#c53a37",
    highlight: "#ffc9c8",
    rim: "#9c2b28",
  },
  orange: {
    body: "#ff9f43",
    bodyLight: "#ffbd7a",
    bodyDark: "#e07a17",
    highlight: "#ffe0c2",
    rim: "#b45f10",
  },
  purple: {
    body: "#a367e0",
    bodyLight: "#c199ee",
    bodyDark: "#8043c2",
    highlight: "#e7d4fb",
    rim: "#62309a",
  },
  blue: {
    body: "#4a90e2",
    bodyLight: "#7db2ee",
    bodyDark: "#2f6fc0",
    highlight: "#cfe3fb",
    rim: "#24568f",
  },
  slate: {
    body: "#64748b",
    bodyLight: "#93a1b5",
    bodyDark: "#47546a",
    highlight: "#d3dae6",
    rim: "#333d4f",
  },
};

export interface SkyPalette {
  /** CSS gradient for the sky (top → horizon). */
  skyTop: string;
  skyBottom: string;
  /** Sun/moon disc + its glow. */
  disc: string;
  discGlow: string;
  cloud: string;
  hillBack: string;
  hillFront: string;
  groundGrass: string;
  groundGrassDark: string;
  groundDirt: string;
  groundDirtDark: string;
  isNight: boolean;
}

export const SKY_PALETTES: Record<FlappyBackground, SkyPalette> = {
  day: {
    skyTop: "#4ec0f0",
    skyBottom: "#b3e7ff",
    disc: "#fff3b0",
    discGlow: "rgba(255,243,176,0.55)",
    cloud: "#ffffff",
    hillBack: "#8fd98a",
    hillFront: "#6cc167",
    groundGrass: "#8ed36a",
    groundGrassDark: "#6fb64d",
    groundDirt: "#e0c48c",
    groundDirtDark: "#c9a86a",
    isNight: false,
  },
  sunset: {
    skyTop: "#ff9a6b",
    skyBottom: "#ffd9a0",
    disc: "#ffec8b",
    discGlow: "rgba(255,180,120,0.6)",
    cloud: "#ffe9d6",
    hillBack: "#c9736b",
    hillFront: "#a85850",
    groundGrass: "#d98b57",
    groundGrassDark: "#bd7243",
    groundDirt: "#8a5a3c",
    groundDirtDark: "#6f472e",
    isNight: false,
  },
  dawn: {
    skyTop: "#8ea2e6",
    skyBottom: "#ffc9d6",
    disc: "#fff0c2",
    discGlow: "rgba(255,224,196,0.5)",
    cloud: "#f4f0ff",
    hillBack: "#9c93cf",
    hillFront: "#7d74b5",
    groundGrass: "#a7b06a",
    groundGrassDark: "#8b9552",
    groundDirt: "#b79a78",
    groundDirtDark: "#9c8060",
    isNight: false,
  },
  night: {
    skyTop: "#111c3d",
    skyBottom: "#2a3d6e",
    disc: "#eef2ff",
    discGlow: "rgba(210,224,255,0.4)",
    cloud: "#39456e",
    hillBack: "#20305c",
    hillFront: "#182548",
    groundGrass: "#26406a",
    groundGrassDark: "#1c3050",
    groundDirt: "#182a45",
    groundDirtDark: "#111f33",
    isNight: true,
  },
};
