import Phaser from "phaser";

import {
  PLAYABLE_PLATFORMER_DEFAULTS,
  stepPlatformerMotion,
} from "@/lib/game/platformer-physics";
import type { Level, LevelHazard, LevelTheme } from "@/types";

/**
 * Collect-the-coins platformer that plays a sketch-derived Level verbatim:
 * platform / coin / hazard / goal positions come straight from the blueprint.
 * The engine layers cartoon rendering, HUD, particles, sound, and the
 * "collect every coin, then reach the flag" rule on top.
 */

interface ThemePalette {
  skyTop: number;
  skyBottom: number;
  sun: number;
  cloud: number;
  hillFar: number;
  hillNear: number;
  grass: number;
  grassDark: number;
  dirt: number;
  dirtDark: number;
  leaf: number;
  trunk: number;
}

const PALETTES: Record<LevelTheme, ThemePalette> = {
  grass: {
    skyTop: 0x7ec8f7,
    skyBottom: 0xcdeffd,
    sun: 0xffe9a3,
    cloud: 0xffffff,
    hillFar: 0xa9dba9,
    hillNear: 0x7fcf85,
    grass: 0x58c24f,
    grassDark: 0x3ea23a,
    dirt: 0xb07b45,
    dirtDark: 0x8a5c31,
    leaf: 0x46b04a,
    trunk: 0x8a5c31,
  },
  desert: {
    skyTop: 0x8fd0f5,
    skyBottom: 0xfde9c4,
    sun: 0xffd97a,
    cloud: 0xfff7e8,
    hillFar: 0xeacd93,
    hillNear: 0xdfb670,
    grass: 0xe8c26b,
    grassDark: 0xcfa04a,
    dirt: 0xc98d4e,
    dirtDark: 0xa06c34,
    leaf: 0x7bbf5e,
    trunk: 0x9c6b3a,
  },
  ice: {
    skyTop: 0x9fd4f2,
    skyBottom: 0xe6f6ff,
    sun: 0xfff3c9,
    cloud: 0xffffff,
    hillFar: 0xcfe8f7,
    hillNear: 0xaedcf2,
    grass: 0xbfe8fa,
    grassDark: 0x8ecbe8,
    dirt: 0x7aa8c9,
    dirtDark: 0x5b86a8,
    leaf: 0x9fd8c0,
    trunk: 0x6f8ba1,
  },
  lava: {
    skyTop: 0x5b3a56,
    skyBottom: 0xd98a5f,
    sun: 0xffc46b,
    cloud: 0xe8b39a,
    hillFar: 0x7a4d5f,
    hillNear: 0x8f5646,
    grass: 0x9c6b4f,
    grassDark: 0x7c4f36,
    dirt: 0x6e4434,
    dirtDark: 0x523025,
    leaf: 0xc9784a,
    trunk: 0x523025,
  },
  space: {
    skyTop: 0x1c2350,
    skyBottom: 0x45418c,
    sun: 0xfef6d8,
    cloud: 0x8f8ac9,
    hillFar: 0x3a3f7d,
    hillNear: 0x4c4f9c,
    grass: 0x8f7bff,
    grassDark: 0x6c58d9,
    dirt: 0x54488f,
    dirtDark: 0x3d3370,
    leaf: 0x7de3c3,
    trunk: 0x3d3370,
  },
  cave: {
    skyTop: 0x2e3a4a,
    skyBottom: 0x54687d,
    sun: 0xd8e6f2,
    cloud: 0x7d93a8,
    hillFar: 0x3f5266,
    hillNear: 0x4d6480,
    grass: 0x6fae8f,
    grassDark: 0x51876d,
    dirt: 0x5d6b7a,
    dirtDark: 0x46525f,
    leaf: 0x6fae8f,
    trunk: 0x46525f,
  },
};

const PLAYER = {
  bodyWidth: 28,
  bodyHeight: 30,
  color: 0xf97316,
  belly: 0xfdba74,
  outline: 0xc2570c,
} as const;

const COIN_RADIUS = 11;
const PICKUP_DISTANCE = 30;
const ENEMY_HIT_DISTANCE = 28;
const START_LIVES = 3;
const HIT_INVULN_MS = 1200;

const CONFETTI_TINTS = [
  0xf87171, 0xfbbf24, 0x34d399, 0x60a5fa, 0xc084fc, 0xf472b6,
];

/** Sky color used for the canvas behind the scene. */
export function skyColorFor(theme: LevelTheme): number {
  return PALETTES[theme].skyTop;
}

/** Deterministic PRNG so decorations don't shuffle on every restart. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tiny WebAudio synth — soft blips, no asset files. */
class Chiptune {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    slide = 0
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) {
      osc.frequency.linearRampToValueAtTime(freq + slide, t + duration);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  unlock() {
    this.ensure();
  }
  jump() {
    this.blip(320, 0.16, "sine", 0.1, 0, 240);
  }
  land() {
    this.blip(150, 0.08, "sine", 0.08, 0, -50);
  }
  coin() {
    this.blip(988, 0.08, "triangle", 0.11);
    this.blip(1319, 0.16, "triangle", 0.1, 0.06);
  }
  allCoins() {
    [523, 659, 784].forEach((f, i) =>
      this.blip(f, 0.14, "triangle", 0.1, i * 0.09)
    );
  }
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.blip(f, 0.22, "triangle", 0.11, i * 0.12)
    );
  }
  hurt() {
    this.blip(240, 0.2, "square", 0.05, 0, -120);
  }
  gameOver() {
    [392, 311, 233].forEach((f, i) =>
      this.blip(f, 0.26, "sine", 0.1, i * 0.16)
    );
  }
  click() {
    this.blip(520, 0.05, "sine", 0.08);
  }
}

const sfx = new Chiptune();

interface CoinSprite {
  root: Phaser.GameObjects.Container;
  x: number;
  y: number;
  taken: boolean;
}

interface EnemySprite {
  root: Phaser.GameObjects.Container;
}

/**
 * Builds the Phaser scene class for a level. The returned class is passed
 * straight into the Phaser.Game config by PhaserGame.
 */
export function createPlatformerScene(level: Level) {
  const palette = PALETTES[level.theme] ?? PALETTES.grass;
  const feel = PLAYABLE_PLATFORMER_DEFAULTS;

  return class PlatformerScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: Record<"up" | "left" | "right", Phaser.Input.Keyboard.Key>;

    private playerBody!: Phaser.GameObjects.Rectangle;
    private skin!: Phaser.GameObjects.Container;
    private pupils!: Phaser.GameObjects.Arc[];
    private eyelids!: Phaser.GameObjects.Rectangle[];
    private feet!: Phaser.GameObjects.Ellipse[];

    private coins: CoinSprite[] = [];
    private enemies: EnemySprite[] = [];
    private hazardRects: LevelHazard[] = [];

    private flagCloth!: Phaser.GameObjects.Triangle;
    private flagPole!: Phaser.GameObjects.Rectangle;
    private flagGlow!: Phaser.GameObjects.Arc;

    private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
    private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;

    private hud!: Phaser.GameObjects.Container;
    private coinText!: Phaser.GameObjects.Text;
    private heartsText!: Phaser.GameObjects.Text;
    private pauseButton!: Phaser.GameObjects.Container;
    private toast: Phaser.GameObjects.Container | null = null;

    private collected = 0;
    private lives = START_LIVES;
    private allCollected = false;
    private ended = false;
    private isPaused = false;
    private invulnUntil = 0;
    private lastFlagNag = 0;

    private wasGrounded = true;
    private coyote = 0;
    private jumpBuffer = 0;
    private jumpWasDown = false;
    private runDustAt = 0;

    private touch = { left: false, right: false, jump: false };

    constructor() {
      super({ key: "PlatformerScene" });
    }

    create() {
      const { world } = level;
      this.collected = 0;
      this.lives = START_LIVES;
      this.allCollected = level.coins.length === 0;
      this.ended = false;
      this.isPaused = false;
      this.physics.world.resume();
      this.time.paused = false;

      this.physics.world.setBounds(0, 0, world.width, world.height);
      this.physics.world.gravity.y = 0; // motion is fully driven by stepPlatformerMotion

      this.makeTextures();
      this.buildBackdrop();

      const platforms = this.buildPlatforms();
      this.buildHazards();
      this.buildCoins();
      this.buildEnemies();
      this.buildFlag();
      this.buildPlayer(platforms);
      this.buildParticles();
      this.buildHud();
      this.buildInput();

      const cam = this.cameras.main;
      cam.setBounds(0, 0, world.width, world.height);
      cam.startFollow(this.playerBody, true, 0.1, 0.1);
      cam.setFollowOffset(-cam.width / 6, 20);
      cam.setBackgroundColor(palette.skyTop);
      this.scale.on("resize", this.layoutHud, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scale.off("resize", this.layoutHud, this);
      });

      if (this.allCollected) this.activateFlag(false);
    }

    // ------------------------------------------------------------- textures

    private makeTextures() {
      if (!this.textures.exists("pb-dot")) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture("pb-dot", 8, 8);
        g.destroy();
      }
      if (!this.textures.exists("pb-cloud")) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(26, 30, 20);
        g.fillCircle(52, 22, 26);
        g.fillCircle(82, 30, 20);
        g.fillRect(24, 30, 60, 18);
        g.generateTexture("pb-cloud", 108, 52);
        g.destroy();
      }
    }

    // ------------------------------------------------------------- backdrop

    private buildBackdrop() {
      const { world } = level;
      const rand = mulberry32(1337);

      const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
      sky.fillGradientStyle(
        palette.skyTop,
        palette.skyTop,
        palette.skyBottom,
        palette.skyBottom,
        1
      );
      sky.fillRect(-40, -40, 4200, 2400);

      const sun = this.add
        .circle(140, 110, 42, palette.sun, 1)
        .setScrollFactor(0.12)
        .setDepth(-90);
      this.add
        .circle(140, 110, 58, palette.sun, 0.28)
        .setScrollFactor(0.12)
        .setDepth(-91);
      this.tweens.add({
        targets: sun,
        scale: 1.06,
        duration: 2400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Parallax hill bands
      const far = this.add.graphics().setScrollFactor(0.3).setDepth(-80);
      far.fillStyle(palette.hillFar, 1);
      const near = this.add.graphics().setScrollFactor(0.55).setDepth(-70);
      near.fillStyle(palette.hillNear, 1);
      for (let x = -200; x < world.width + 400; x += 260) {
        far.fillEllipse(x, world.height - 30, 520, 340);
      }
      for (let x = -100; x < world.width + 400; x += 320) {
        near.fillEllipse(x + 120, world.height + 30, 460, 300);
      }

      // Drifting clouds
      const cloudCount = Math.max(4, Math.round(world.width / 380));
      for (let i = 0; i < cloudCount; i += 1) {
        const cloud = this.add
          .image(
            rand() * world.width,
            40 + rand() * world.height * 0.3,
            "pb-cloud"
          )
          .setTint(palette.cloud)
          .setAlpha(0.9)
          .setScale(0.7 + rand() * 0.8)
          .setScrollFactor(0.2 + rand() * 0.15)
          .setDepth(-85);
        this.tweens.add({
          targets: cloud,
          x: cloud.x + 40 + rand() * 60,
          duration: 9000 + rand() * 8000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Occasional tiny birds gliding across the view
      this.time.addEvent({
        delay: 7000 + rand() * 5000,
        loop: true,
        callback: () => this.spawnBird(),
      });
    }

    private spawnBird() {
      if (this.ended) return;
      const cam = this.cameras.main;
      const y = cam.scrollY + 50 + Math.random() * 130;
      const fromLeft = Math.random() > 0.4;
      const startX = fromLeft ? cam.scrollX - 40 : cam.scrollX + cam.width + 40;
      const endX = fromLeft ? cam.scrollX + cam.width + 80 : cam.scrollX - 80;

      const bird = this.add.container(startX, y).setDepth(-60);
      const wingL = this.add
        .triangle(0, 0, -10, 0, 0, 0, -4, -6, 0x475569)
        .setOrigin(0, 0);
      const wingR = this.add
        .triangle(0, 0, 10, 0, 0, 0, 4, -6, 0x475569)
        .setOrigin(0, 0);
      bird.add([wingL, wingR]);
      this.tweens.add({
        targets: [wingL, wingR],
        scaleY: 0.2,
        duration: 260,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: bird,
        x: endX,
        y: y + (Math.random() * 60 - 30),
        duration: 9000,
        onComplete: () => bird.destroy(),
      });
    }

    // ------------------------------------------------------------ platforms

    private buildPlatforms(): Phaser.Physics.Arcade.StaticGroup {
      const group = this.physics.add.staticGroup();
      const rand = mulberry32(4242);
      const grassDepth = 12;

      level.platforms.forEach((platform, index) => {
        const { x, y, width, height } = platform;
        const g = this.add.graphics().setDepth(0);

        // Dirt body with rounded corners and speckles
        g.fillStyle(palette.dirt, 1);
        g.fillRoundedRect(x, y, width, height, Math.min(10, height / 3));
        g.fillStyle(palette.dirtDark, 0.55);
        const speckles = Math.max(3, Math.floor((width * height) / 5200));
        const speckleRand = mulberry32(index * 97 + 5);
        for (let i = 0; i < speckles; i += 1) {
          g.fillCircle(
            x + 10 + speckleRand() * (width - 20),
            y + grassDepth + 8 + speckleRand() * Math.max(4, height - grassDepth - 16),
            2 + speckleRand() * 3
          );
        }

        // Grass cap with a soft scalloped lip
        g.fillStyle(palette.grass, 1);
        g.fillRoundedRect(x, y, width, grassDepth + 6, {
          tl: Math.min(10, height / 3),
          tr: Math.min(10, height / 3),
          bl: 0,
          br: 0,
        });
        g.fillStyle(palette.grassDark, 1);
        for (let bx = x + 8; bx < x + width - 6; bx += 22) {
          g.fillCircle(bx, y + grassDepth + 4, 5);
        }

        // Soft shadow under the platform
        this.add
          .ellipse(x + width / 2, y + height + 6, width * 0.92, 12, 0x000000, 0.1)
          .setDepth(-5);

        const body = this.add
          .rectangle(x + width / 2, y + height / 2, width, height)
          .setVisible(false);
        this.physics.add.existing(body, true);
        group.add(body);

        this.decoratePlatform(platform, rand);
      });

      return group;
    }

    private decoratePlatform(
      platform: Level["platforms"][number],
      rand: () => number
    ) {
      const top = platform.y;

      // Swaying grass tufts
      for (
        let tx = platform.x + 14;
        tx < platform.x + platform.width - 10;
        tx += 40 + rand() * 26
      ) {
        const tuft = this.add
          .triangle(tx, top + 1, 0, 0, 5, -11, 10, 0, palette.grassDark)
          .setOrigin(0.5, 1)
          .setDepth(6);
        this.tweens.add({
          targets: tuft,
          angle: rand() > 0.5 ? 7 : -7,
          duration: 1400 + rand() * 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: rand() * 800,
        });
      }

      // Flowers on medium platforms
      if (platform.width > 120 && rand() > 0.35) {
        const fx = platform.x + 20 + rand() * (platform.width - 40);
        const petalColor = rand() > 0.5 ? 0xf9a8d4 : 0xfef08a;
        this.add.rectangle(fx, top - 5, 2, 10, 0x3f9142).setDepth(5);
        for (let p = 0; p < 5; p += 1) {
          const a = (p / 5) * Math.PI * 2;
          this.add
            .circle(fx + Math.cos(a) * 4, top - 11 + Math.sin(a) * 4, 3, petalColor)
            .setDepth(5);
        }
        this.add.circle(fx, top - 11, 2.5, 0xfbbf24).setDepth(6);
      }

      // Bushes and trees only on wide ground platforms
      if (platform.width > 300) {
        const bx = platform.x + 40 + rand() * (platform.width - 80);
        const bush = this.add.container(bx, top).setDepth(-30);
        bush.add([
          this.add.ellipse(-14, -8, 34, 24, palette.leaf),
          this.add.ellipse(12, -10, 40, 30, palette.grass),
          this.add.ellipse(0, -6, 30, 20, palette.grassDark),
        ]);
        this.tweens.add({
          targets: bush,
          scaleX: 1.04,
          duration: 1900 + rand() * 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        if (platform.width > 420 && rand() > 0.3) {
          const txx = platform.x + 60 + rand() * (platform.width - 120);
          const tree = this.add.container(txx, top).setDepth(-35);
          tree.add([
            this.add.rectangle(0, -22, 12, 46, palette.trunk),
            this.add.circle(-16, -52, 22, palette.leaf),
            this.add.circle(16, -54, 24, palette.grass),
            this.add.circle(0, -68, 24, palette.grassDark),
          ]);
          this.tweens.add({
            targets: tree,
            angle: 1.4,
            duration: 2600 + rand() * 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
      }
    }

    // -------------------------------------------------------------- hazards

    private buildHazards() {
      this.hazardRects = level.hazards.map((hazard) => ({ ...hazard }));

      for (const hazard of level.hazards) {
        if (hazard.type === "spikes") {
          const teeth = Math.max(1, Math.round(hazard.width / 22));
          const toothWidth = hazard.width / teeth;
          for (let i = 0; i < teeth; i += 1) {
            const sx = hazard.x + i * toothWidth;
            const spike = this.add
              .triangle(
                sx + toothWidth / 2,
                hazard.y + hazard.height,
                0,
                0,
                toothWidth / 2,
                -hazard.height,
                toothWidth,
                0,
                0xcbd5e1
              )
              .setOrigin(0.5, 1)
              .setDepth(5);
            spike.setStrokeStyle(1.5, 0x64748b);
            this.tweens.add({
              targets: spike,
              scaleY: 1.06,
              duration: 900,
              yoyo: true,
              repeat: -1,
              delay: i * 120,
              ease: "Sine.easeInOut",
            });
          }
        } else if (hazard.type === "lava") {
          const g = this.add.graphics().setDepth(5);
          g.fillGradientStyle(0xfb923c, 0xfb923c, 0xdc2626, 0xdc2626, 1);
          g.fillRoundedRect(hazard.x, hazard.y, hazard.width, hazard.height, 6);
          const glow = this.add
            .rectangle(
              hazard.x + hazard.width / 2,
              hazard.y + 3,
              hazard.width,
              6,
              0xfde68a,
              0.9
            )
            .setDepth(6);
          this.tweens.add({
            targets: glow,
            alpha: 0.45,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          this.add.particles(0, 0, "pb-dot", {
            x: { min: hazard.x + 6, max: hazard.x + hazard.width - 6 },
            y: hazard.y + 4,
            speedY: { min: -60, max: -25 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xfbbf24, 0xfb923c, 0xfde68a],
            lifespan: 700,
            frequency: 170,
            quantity: 1,
          });
        } else {
          // water
          this.add
            .rectangle(
              hazard.x + hazard.width / 2,
              hazard.y + hazard.height / 2,
              hazard.width,
              hazard.height,
              0x38bdf8,
              0.65
            )
            .setDepth(5);
          const wave = this.add
            .rectangle(
              hazard.x + hazard.width / 2,
              hazard.y + 2,
              hazard.width,
              4,
              0xbae6fd,
              0.9
            )
            .setDepth(6);
          this.tweens.add({
            targets: wave,
            y: hazard.y + 6,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
      }
    }

    // ---------------------------------------------------------------- coins

    private buildCoins() {
      this.coins = level.coins.map((coin, index) => {
        const root = this.add.container(coin.x, coin.y).setDepth(10);
        const disc = this.add.circle(0, 0, COIN_RADIUS, 0xfbbf24);
        disc.setStrokeStyle(2.5, 0xd97706);
        const inner = this.add.circle(0, 0, COIN_RADIUS - 5, 0xfde68a);
        const slot = this.add.rectangle(0, 0, 3, COIN_RADIUS - 4, 0xd97706);
        root.add([disc, inner, slot]);

        // Continuous spin (scaleX flip reads as rotation for a flat coin)
        this.tweens.add({
          targets: root,
          scaleX: 0.12,
          duration: 480,
          yoyo: true,
          repeat: -1,
          delay: index * 90,
          ease: "Sine.easeInOut",
        });
        // Gentle float
        this.tweens.add({
          targets: root,
          y: coin.y - 7,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          delay: index * 130,
          ease: "Sine.easeInOut",
        });

        return { root, x: coin.x, y: coin.y, taken: false };
      });
    }

    private collectCoin(coin: CoinSprite) {
      coin.taken = true;
      this.collected += 1;
      sfx.coin();
      this.sparkles.explode(14, coin.root.x, coin.root.y);
      this.tweens.killTweensOf(coin.root);
      this.tweens.add({
        targets: coin.root,
        scaleX: 1.6,
        scaleY: 1.6,
        alpha: 0,
        y: coin.root.y - 18,
        duration: 240,
        ease: "Back.easeIn",
        onComplete: () => coin.root.destroy(),
      });

      const pop = this.add
        .text(coin.x, coin.y - 20, "+1", {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#fbbf24",
          stroke: "#92400e",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(30);
      this.tweens.add({
        targets: pop,
        y: pop.y - 26,
        alpha: 0,
        duration: 600,
        onComplete: () => pop.destroy(),
      });

      this.updateHud();
      if (this.collected >= level.coins.length && !this.allCollected) {
        this.allCollected = true;
        sfx.allCoins();
        this.activateFlag(true);
        this.showToast("Return to the flag!");
      }
    }

    // -------------------------------------------------------------- enemies

    private buildEnemies() {
      this.enemies = level.enemies.map((enemy) => {
        const root = this.add.container(enemy.x, enemy.y).setDepth(12);
        const body = this.add.circle(0, 0, 14, 0xa855f7);
        body.setStrokeStyle(2, 0x7e22ce);
        const eyeL = this.add.circle(-5, -3, 4, 0xffffff);
        const eyeR = this.add.circle(5, -3, 4, 0xffffff);
        const pupilL = this.add.circle(-4, -3, 1.8, 0x1e1b4b);
        const pupilR = this.add.circle(6, -3, 1.8, 0x1e1b4b);
        root.add([body, eyeL, eyeR, pupilL, pupilR]);

        if (enemy.type === "flyer") {
          const wingL = this.add.ellipse(-13, -8, 12, 7, 0xd8b4fe);
          const wingR = this.add.ellipse(13, -8, 12, 7, 0xd8b4fe);
          root.add([wingL, wingR]);
          this.tweens.add({
            targets: [wingL, wingR],
            scaleY: 0.3,
            duration: 200,
            yoyo: true,
            repeat: -1,
          });
          this.tweens.add({
            targets: root,
            y: enemy.y - 16,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        } else {
          this.tweens.add({
            targets: root,
            angle: 6,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }

        const half = Math.max(40, enemy.patrolDistance / 2);
        this.tweens.add({
          targets: root,
          x: { from: enemy.x - half, to: enemy.x + half },
          duration: Math.max(1400, 1800 + enemy.patrolDistance * 2),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        return { root };
      });
    }

    // ----------------------------------------------------------------- flag

    private buildFlag() {
      const { goal } = level;
      this.flagGlow = this.add
        .circle(goal.x, goal.y - 52, 30, 0xfde68a, 0.35)
        .setDepth(7)
        .setVisible(false);
      this.flagPole = this.add
        .rectangle(goal.x, goal.y - 32, 5, 64, 0x94a3b8)
        .setDepth(8);
      this.add.circle(goal.x, goal.y - 64, 4.5, 0x94a3b8).setDepth(8);
      this.flagCloth = this.add
        .triangle(goal.x + 2, goal.y - 62, 0, 0, 34, 11, 0, 22, 0x9ca3af)
        .setOrigin(0, 0)
        .setDepth(8);
      this.add
        .ellipse(goal.x, goal.y + 2, 44, 9, 0x000000, 0.12)
        .setDepth(7);
      this.tweens.add({
        targets: this.flagCloth,
        scaleX: 0.82,
        angle: 5,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    private activateFlag(celebrate: boolean) {
      this.flagCloth.setFillStyle(0xef4444);
      this.flagPole.setFillStyle(0xe2e8f0);
      this.flagGlow.setVisible(true);
      this.tweens.add({
        targets: this.flagGlow,
        alpha: { from: 0.15, to: 0.5 },
        scale: { from: 0.9, to: 1.2 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      if (celebrate) {
        this.sparkles.explode(24, level.goal.x, level.goal.y - 52);
      }
    }

    // --------------------------------------------------------------- player

    private buildPlayer(platforms: Phaser.Physics.Arcade.StaticGroup) {
      const spawn = level.player;
      this.playerBody = this.add
        .rectangle(spawn.x, spawn.y, PLAYER.bodyWidth, PLAYER.bodyHeight)
        .setVisible(false);
      this.physics.add.existing(this.playerBody);
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setCollideWorldBounds(false);
      this.physics.add.collider(this.playerBody, platforms);

      // Cartoon skin — synced to the physics body every frame
      const skin = this.add.container(spawn.x, spawn.y).setDepth(20);
      const shadow = this.add.ellipse(0, 17, 28, 7, 0x000000, 0.14);
      const torso = this.add.circle(0, 0, 15, PLAYER.color);
      torso.setStrokeStyle(2.5, PLAYER.outline);
      const belly = this.add.circle(0, 5, 9, PLAYER.belly);
      const footL = this.add.ellipse(-7, 14, 10, 6, PLAYER.outline);
      const footR = this.add.ellipse(7, 14, 10, 6, PLAYER.outline);
      const eyeL = this.add.circle(-6, -4, 4.5, 0xffffff);
      const eyeR = this.add.circle(6, -4, 4.5, 0xffffff);
      const pupilL = this.add.circle(-5, -4, 2, 0x1f2937);
      const pupilR = this.add.circle(7, -4, 2, 0x1f2937);
      const lidL = this.add
        .rectangle(-6, -4, 10, 10, PLAYER.color)
        .setScale(1, 0);
      const lidR = this.add
        .rectangle(6, -4, 10, 10, PLAYER.color)
        .setScale(1, 0);
      const cheekL = this.add.circle(-10, 2, 2.5, 0xfda4af, 0.85);
      const cheekR = this.add.circle(10, 2, 2.5, 0xfda4af, 0.85);
      const mouth = this.add.arc(0, 3, 4, 20, 160, false, 0x7c2d12);
      mouth.setClosePath(false).setStrokeStyle(1.8, 0x7c2d12);
      mouth.setFillStyle();

      skin.add([
        shadow,
        footL,
        footR,
        torso,
        belly,
        cheekL,
        cheekR,
        eyeL,
        eyeR,
        pupilL,
        pupilR,
        lidL,
        lidR,
        mouth,
      ]);
      this.skin = skin;
      this.pupils = [pupilL, pupilR];
      this.eyelids = [lidL, lidR];
      this.feet = [footL, footR];

      // Occasional blink
      const blink = () => {
        if (this.ended) return;
        this.tweens.add({
          targets: this.eyelids,
          scaleY: 1,
          duration: 70,
          yoyo: true,
          onComplete: () => {
            this.time.delayedCall(1800 + Math.random() * 2600, blink);
          },
        });
      };
      this.time.delayedCall(1500, blink);
    }

    // ------------------------------------------------------------ particles

    private buildParticles() {
      this.sparkles = this.add.particles(0, 0, "pb-dot", {
        speed: { min: 50, max: 160 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfde68a, 0xfbbf24, 0xffffff],
        lifespan: 500,
        gravityY: 220,
        emitting: false,
      });
      this.sparkles.setDepth(26);

      this.dust = this.add.particles(0, 0, "pb-dot", {
        speed: { min: 15, max: 70 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.75, end: 0 },
        alpha: { start: 0.65, end: 0 },
        tint: 0xe7e5e4,
        lifespan: 380,
        emitting: false,
      });
      this.dust.setDepth(19);

      this.confetti = this.add.particles(0, 0, "pb-dot", {
        speed: { min: 160, max: 340 },
        angle: { min: 220, max: 320 },
        scale: { start: 1.1, end: 0.3 },
        tint: CONFETTI_TINTS,
        lifespan: 1500,
        gravityY: 520,
        rotate: { min: 0, max: 360 },
        emitting: false,
      });
      this.confetti.setDepth(260);
    }

    // ------------------------------------------------------------------ HUD

    private buildHud() {
      this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

      const coinChip = this.add.container(16, 14);
      const chipFrame = this.add.graphics();
      chipFrame.fillStyle(0x0f172a, 0.45);
      chipFrame.fillRoundedRect(0, 0, 116, 34, 17);
      const coinIcon = this.add.circle(20, 17, 9, 0xfbbf24);
      coinIcon.setStrokeStyle(2, 0xd97706);
      this.coinText = this.add
        .text(36, 17, "", {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);
      coinChip.add([chipFrame, coinIcon, this.coinText]);

      this.heartsText = this.add
        .text(20, 56, "", {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "17px",
          color: "#f87171",
          stroke: "#7f1d1d",
          strokeThickness: 2,
        })
        .setOrigin(0, 0.5);

      this.pauseButton = this.makeRoundButton("⏸", () => this.togglePause());
      const restartButton = this.makeRoundButton("↻", () => {
        sfx.click();
        this.scene.restart();
      });
      this.hud.add([coinChip, this.heartsText, this.pauseButton, restartButton]);
      this.hud.setData("restartButton", restartButton);

      if (this.sys.game.device.input.touch) this.buildTouchControls();

      this.updateHud();
      this.layoutHud();
    }

    private makeRoundButton(
      icon: string,
      onClick: () => void
    ): Phaser.GameObjects.Container {
      const root = this.add.container(0, 0);
      const bg = this.add.circle(0, 0, 17, 0x0f172a, 0.45);
      bg.setStrokeStyle(1.5, 0xffffff, 0.5);
      const label = this.add
        .text(0, 0, icon, { fontSize: "16px", color: "#ffffff" })
        .setOrigin(0.5);
      root.add([bg, label]);
      bg.setInteractive({ useHandCursor: true })
        .on("pointerover", () => bg.setFillStyle(0x334155, 0.7))
        .on("pointerout", () => bg.setFillStyle(0x0f172a, 0.45))
        .on("pointerdown", onClick);
      root.setData("label", label);
      return root;
    }

    private buildTouchControls() {
      const mk = (
        icon: string,
        key: "left" | "right" | "jump"
      ): Phaser.GameObjects.Container => {
        const root = this.add
          .container(0, 0)
          .setScrollFactor(0)
          .setDepth(150);
        const bg = this.add.circle(0, 0, 30, 0x0f172a, 0.3);
        bg.setStrokeStyle(2, 0xffffff, 0.4);
        const label = this.add
          .text(0, 0, icon, { fontSize: "22px", color: "#ffffff" })
          .setOrigin(0.5);
        root.add([bg, label]);
        bg.setInteractive()
          .on("pointerdown", () => {
            this.touch[key] = true;
          })
          .on("pointerup", () => {
            this.touch[key] = false;
          })
          .on("pointerout", () => {
            this.touch[key] = false;
          });
        root.setData("touchKey", key);
        this.hud.setData(`touch-${key}`, root);
        return root;
      };
      mk("◀", "left");
      mk("▶", "right");
      mk("⤒", "jump");
      this.input.addPointer(2);
    }

    private layoutHud = () => {
      if (!this.hud?.active) return;
      const cam = this.cameras.main;
      const pause = this.pauseButton;
      const restart = this.hud.getData("restartButton") as
        | Phaser.GameObjects.Container
        | undefined;
      pause?.setPosition(cam.width - 66, 30);
      restart?.setPosition(cam.width - 28, 30);
      cam.setFollowOffset(-cam.width / 6, 20);

      (["left", "right", "jump"] as const).forEach((key) => {
        const btn = this.hud.getData(`touch-${key}`) as
          | Phaser.GameObjects.Container
          | undefined;
        if (!btn) return;
        if (key === "left") btn.setPosition(48, cam.height - 52);
        if (key === "right") btn.setPosition(124, cam.height - 52);
        if (key === "jump") btn.setPosition(cam.width - 52, cam.height - 52);
      });
    };

    private updateHud() {
      this.coinText.setText(`${this.collected} / ${level.coins.length}`);
      this.heartsText.setText("♥ ".repeat(this.lives).trim() || "—");
    }

    private showToast(message: string) {
      this.toast?.destroy();
      const cam = this.cameras.main;
      const root = this.add
        .container(cam.width / 2, 84)
        .setScrollFactor(0)
        .setDepth(200)
        .setAlpha(0);
      const text = this.add
        .text(0, 0, message, {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      const bg = this.add.graphics();
      const w = text.width + 36;
      bg.fillStyle(0x0f172a, 0.72);
      bg.fillRoundedRect(-w / 2, -19, w, 38, 19);
      root.add([bg, text]);
      this.toast = root;

      this.tweens.add({
        targets: root,
        alpha: 1,
        y: 92,
        duration: 220,
        ease: "Back.easeOut",
      });
      this.time.delayedCall(1900, () => {
        if (root.active) {
          this.tweens.add({
            targets: root,
            alpha: 0,
            duration: 320,
            onComplete: () => root.destroy(),
          });
        }
      });
    }

    // ---------------------------------------------------------------- input

    private buildInput() {
      this.cursors = this.input.keyboard!.createCursorKeys();
      this.wasd = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as typeof this.wasd;
      this.input.keyboard!.on("keydown-R", () => this.scene.restart());
      this.input.keyboard!.on("keydown-P", () => this.togglePause());
      this.input.keyboard!.once("keydown", () => sfx.unlock());
      this.input.once("pointerdown", () => sfx.unlock());
    }

    // ----------------------------------------------------------- game state

    private togglePause() {
      if (this.ended) return;
      sfx.click();
      this.isPaused = !this.isPaused;
      const label = this.pauseButton.getData("label") as
        | Phaser.GameObjects.Text
        | undefined;
      if (this.isPaused) {
        this.physics.world.pause();
        this.tweens.pauseAll();
        this.time.paused = true;
        label?.setText("▶");
        this.showPauseOverlay();
      } else {
        this.physics.world.resume();
        this.tweens.resumeAll();
        this.time.paused = false;
        label?.setText("⏸");
        this.hidePauseOverlay();
      }
    }

    private pauseOverlay: Phaser.GameObjects.Container | null = null;

    private showPauseOverlay() {
      const cam = this.cameras.main;
      const root = this.add
        .container(cam.width / 2, cam.height / 2)
        .setScrollFactor(0)
        .setDepth(250);
      const dim = this.add
        .rectangle(0, 0, cam.width * 2, cam.height * 2, 0x0f172a, 0.4)
        .setInteractive();
      const title = this.add
        .text(0, -14, "Paused", {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#0f172a",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      const hint = this.add
        .text(0, 24, "Press P or tap ▶ to resume", {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
          color: "#e2e8f0",
        })
        .setOrigin(0.5);
      root.add([dim, title, hint]);
      this.pauseOverlay = root;
    }

    private hidePauseOverlay() {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    }

    private buildEndOverlay(options: {
      title: string;
      titleColor: string;
      lines: string[];
      buttonLabel: string;
    }) {
      const cam = this.cameras.main;
      const root = this.add
        .container(cam.width / 2, cam.height / 2)
        .setScrollFactor(0)
        .setDepth(255)
        .setAlpha(0);
      const dim = this.add
        .rectangle(0, 0, cam.width * 2, cam.height * 2, 0x0f172a, 0.45)
        .setInteractive();
      const panel = this.add.graphics();
      panel.fillStyle(0xffffff, 0.96);
      panel.fillRoundedRect(-150, -104, 300, 208, 22);
      panel.lineStyle(3, 0xfbbf24, 1);
      panel.strokeRoundedRect(-150, -104, 300, 208, 22);
      const title = this.add
        .text(0, -62, options.title, {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "27px",
          fontStyle: "bold",
          color: options.titleColor,
        })
        .setOrigin(0.5);
      root.add([dim, panel, title]);

      options.lines.forEach((line, index) => {
        root.add(
          this.add
            .text(0, -22 + index * 26, line, {
              fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
              fontSize: "16px",
              color: "#475569",
            })
            .setOrigin(0.5)
        );
      });

      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x22c55e, 1);
      buttonBg.fillRoundedRect(-84, 44, 168, 44, 22);
      const buttonHit = this.add
        .rectangle(0, 66, 168, 44, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      const buttonText = this.add
        .text(0, 66, options.buttonLabel, {
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      buttonHit.on("pointerdown", () => {
        sfx.click();
        this.scene.restart();
      });
      root.add([buttonBg, buttonHit, buttonText]);

      this.tweens.add({
        targets: root,
        alpha: 1,
        duration: 350,
        ease: "Sine.easeOut",
      });
      root.setScale(0.9);
      this.tweens.add({
        targets: root,
        scale: 1,
        duration: 420,
        ease: "Back.easeOut",
      });
    }

    private win() {
      if (this.ended) return;
      this.ended = true;
      sfx.win();
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.moves = false;

      // Victory hop
      this.tweens.add({
        targets: this.skin,
        y: this.skin.y - 26,
        duration: 260,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeOut",
      });

      const cam = this.cameras.main;
      for (let i = 0; i < 3; i += 1) {
        this.time.delayedCall(i * 260, () => {
          this.confetti.explode(
            50,
            cam.scrollX + cam.width * (0.25 + 0.25 * i),
            cam.scrollY + cam.height * 0.22
          );
        });
      }

      this.time.delayedCall(700, () => {
        this.buildEndOverlay({
          title: "Level Complete!",
          titleColor: "#16a34a",
          lines: [
            `Coins: ${this.collected} / ${level.coins.length}`,
            `Lives left: ${this.lives}`,
          ],
          buttonLabel: "Play Again",
        });
      });
    }

    private gameOver() {
      this.ended = true;
      sfx.gameOver();
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.moves = false;
      this.tweens.add({ targets: this.skin, alpha: 0.35, duration: 300 });
      this.time.delayedCall(500, () => {
        this.buildEndOverlay({
          title: "Game Over",
          titleColor: "#dc2626",
          lines: [`Coins: ${this.collected} / ${level.coins.length}`],
          buttonLabel: "Restart",
        });
      });
    }

    private loseLife() {
      if (this.ended || this.time.now < this.invulnUntil) return;
      this.lives -= 1;
      this.updateHud();
      sfx.hurt();
      this.cameras.main.shake(140, 0.004);
      this.cameras.main.flash(120, 255, 120, 120);

      if (this.lives <= 0) {
        this.gameOver();
        return;
      }

      // Respawn at the start with a short invulnerability window
      this.invulnUntil = this.time.now + HIT_INVULN_MS;
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      body.reset(level.player.x, level.player.y);
      this.tweens.add({
        targets: this.skin,
        alpha: 0.3,
        duration: 130,
        yoyo: true,
        repeat: 4,
        onComplete: () => this.skin.setAlpha(1),
      });
    }

    // --------------------------------------------------------------- update

    update(time: number, delta: number) {
      if (process.env.NODE_ENV === "development" && this.playerBody?.body) {
        const b = this.playerBody.body as Phaser.Physics.Arcade.Body;
        this.registry.set("pb-debug", {
          coins: this.collected,
          lives: this.lives,
          all: this.allCollected,
          ended: this.ended,
          x: Math.round(b.center.x),
          y: Math.round(b.center.y),
        });
      }
      if (this.ended || this.isPaused || !this.playerBody?.body) {
        this.syncSkin(false, 0);
        return;
      }

      if (!Number.isFinite(delta)) return;

      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      if (!Number.isFinite(body.velocity.x) || !Number.isFinite(body.velocity.y)) {
        body.setVelocity(0, 0);
      }
      const grounded = body.blocked.down || body.touching.down;

      const left =
        this.cursors.left.isDown || this.wasd.left.isDown || this.touch.left;
      const right =
        this.cursors.right.isDown || this.wasd.right.isDown || this.touch.right;
      const jumpHeld =
        this.cursors.up.isDown ||
        this.cursors.space.isDown ||
        this.wasd.up.isDown ||
        this.touch.jump;
      const jumpPressed = jumpHeld && !this.jumpWasDown;
      const jumpReleased = !jumpHeld && this.jumpWasDown;
      this.jumpWasDown = jumpHeld;

      const step = stepPlatformerMotion({
        dt: delta / 1000,
        left,
        right,
        jumpHeld,
        jumpPressed,
        jumpReleased,
        grounded,
        vx: body.velocity.x,
        vy: body.blocked.up && body.velocity.y < 0 ? 0 : body.velocity.y,
        coyote: this.coyote,
        jumpBuffer: this.jumpBuffer,
        speed: feel.speed,
        jumpStrength: feel.jumpStrength,
      });
      this.coyote = step.coyote;
      this.jumpBuffer = step.jumpBuffer;
      body.setVelocity(step.vx, step.vy);

      if (step.didJump) {
        sfx.jump();
        this.dust.explode(6, body.center.x, body.bottom);
        this.tweens.add({
          targets: this.skin,
          scaleX: 0.82,
          scaleY: 1.18,
          duration: 130,
          yoyo: true,
          ease: "Sine.easeOut",
        });
      }

      // Landing squash + dust
      if (grounded && !this.wasGrounded) {
        const impact = Math.abs(body.deltaY()) * 60;
        this.dust.explode(8, body.center.x, body.bottom);
        if (impact > 140) sfx.land();
        this.tweens.add({
          targets: this.skin,
          scaleX: 1.22,
          scaleY: 0.76,
          duration: 110,
          yoyo: true,
          ease: "Sine.easeOut",
        });
      }
      this.wasGrounded = grounded;

      // Run dust puffs
      if (grounded && Math.abs(step.vx) > 170 && time > this.runDustAt) {
        this.runDustAt = time + 200;
        this.dust.explode(2, body.center.x - Math.sign(step.vx) * 10, body.bottom);
      }

      this.syncSkin(grounded, step.vx);
      this.checkPickupsAndDanger(body);

      // Fell out of the level
      if (body.top > level.world.height + 100) {
        this.loseLife();
      }
    }

    private syncSkin(grounded: boolean, vx: number) {
      if (!this.skin?.active || !this.playerBody?.body) return;
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
      // Keep victory-hop tweens in charge of y while the run has ended
      if (!this.ended) {
        this.skin.setPosition(body.center.x, body.center.y);
      } else {
        this.skin.x = body.center.x;
      }
      this.skin.rotation = Phaser.Math.Clamp(vx / feel.speed, -1, 1) * 0.1;

      const facing = Math.abs(vx) > 20 ? Math.sign(vx) : 0;
      this.pupils[0]?.setX(-5 + facing * 1.6);
      this.pupils[1]?.setX(7 + facing * 1.6);

      const walking = grounded && Math.abs(vx) > 40;
      const t = this.time.now * 0.02;
      this.feet[0]?.setY(walking ? 14 + Math.sin(t) * 2.4 : 14);
      this.feet[1]?.setY(walking ? 14 + Math.sin(t + Math.PI) * 2.4 : 14);
    }

    private checkPickupsAndDanger(body: Phaser.Physics.Arcade.Body) {
      const px = body.center.x;
      const py = body.center.y;

      for (const coin of this.coins) {
        if (coin.taken) continue;
        const dx = coin.root.x - px;
        const dy = coin.root.y - py;
        if (dx * dx + dy * dy < PICKUP_DISTANCE * PICKUP_DISTANCE) {
          this.collectCoin(coin);
        }
      }

      for (const enemy of this.enemies) {
        const dx = enemy.root.x - px;
        const dy = enemy.root.y - py;
        if (dx * dx + dy * dy < ENEMY_HIT_DISTANCE * ENEMY_HIT_DISTANCE) {
          this.loseLife();
          return;
        }
      }

      // Forgiving hazard hitboxes — trimmed a few px on every side
      for (const hazard of this.hazardRects) {
        const pad = hazard.type === "spikes" ? 7 : 4;
        if (
          body.right > hazard.x + pad &&
          body.left < hazard.x + hazard.width - pad &&
          body.bottom > hazard.y + pad &&
          body.top < hazard.y + hazard.height
        ) {
          this.loseLife();
          return;
        }
      }

      // Flag zone
      const goal = level.goal;
      if (
        Math.abs(px - goal.x) < 30 &&
        py > goal.y - 84 &&
        py < goal.y + 24
      ) {
        if (this.allCollected) {
          this.win();
        } else if (this.time.now > this.lastFlagNag) {
          this.lastFlagNag = this.time.now + 2200;
          this.showToast("Collect every coin before finishing!");
        }
      }
    }
  };
}
