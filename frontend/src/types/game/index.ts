export type SupportedGameType =
  | "dodge"
  | "collect"
  | "pong"
  | "snake"
  | "maze"
  | "clicker"
  | "simple-shooter"
  | "platform-jumper";

export interface GameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameControls {
  keyboard: ("arrows" | "wasd" | "space")[];
  mouse: ("click" | "move" | "drag")[];
  touch: ("tap" | "drag" | "swipe")[];
  instructions: string;
}

export interface GamePlayer extends GameRect {
  label: string;
  color: string;
  speed: number;
  jumpStrength: number;
  canShoot: boolean;
}

export interface GameEnemy extends GameRect {
  id: string;
  label: string;
  color: string;
  movement:
    | "none"
    | "patrol-horizontal"
    | "patrol-vertical"
    | "chase-player"
    | "bounce"
    | "fall"
    | "snake-grid";
  speed: number;
  patrolDistance: number;
  damage: number;
}

export interface GameObstacle extends GameRect {
  id: string;
  label: string;
  color: string;
  kind: "wall" | "hazard" | "bumper";
  solid: boolean;
  damage: number;
}

export interface GameCollectible extends GameRect {
  id: string;
  label: string;
  color: string;
  points: number;
}

export interface GameProjectileSettings {
  enabled: boolean;
  label: string;
  color: string;
  width: number;
  height: number;
  speed: number;
  cooldownMs: number;
  direction: "up" | "down" | "left" | "right" | "toward-pointer";
}

export interface GamePlatform extends GameRect {
  id: string;
  label: string;
  color: string;
  kind: "static" | "moving";
  movement: "none" | "patrol-horizontal" | "patrol-vertical";
  patrolDistance: number;
}

export interface GameSpec {
  title: string;
  gameType: SupportedGameType;
  objective: string;
  controls: GameControls;
  movementRules: string;
  player: GamePlayer;
  enemies: GameEnemy[];
  obstacles: GameObstacle[];
  collectibles: GameCollectible[];
  projectiles: GameProjectileSettings;
  platforms: GamePlatform[];
  collisionRules: {
    playerHitsEnemy: "lose-life" | "lose-game" | "bounce" | "ignore";
    playerHitsObstacle: "block" | "lose-life" | "lose-game" | "bounce" | "ignore";
    playerCollectsCollectible: "score" | "score-and-remove" | "win" | "ignore";
    projectileHitsEnemy: "remove-enemy" | "score-and-remove" | "ignore";
    outOfBounds: "wrap" | "block" | "lose-life" | "lose-game";
  };
  scoring: {
    start: number;
    perCollectible: number;
    perEnemy: number;
    target: number;
  };
  lives: number;
  timer: {
    enabled: boolean;
    seconds: number;
    countsDown: boolean;
  };
  winCondition: string;
  loseCondition: string;
  visualTheme: {
    style: "arcade" | "neon" | "pastel" | "paper" | "space" | "garden" | "dungeon" | "beach";
    background: {
      color: string;
      pattern: "solid" | "grid" | "stars" | "dots" | "stripes";
    };
    accentColor: string;
  };
  soundSettings: {
    enabled: boolean;
    music: "none" | "chiptune" | "ambient";
    effects: boolean;
  };
  difficulty: "easy" | "medium" | "hard";
  entityPositionsAndSizes: string;
}
