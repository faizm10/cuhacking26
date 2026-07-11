import Phaser from "phaser";

import type { Level } from "@/types";

/** Minimal prototype palette — readability over polish. */
export const GAME_COLORS = {
  background: 0x1a1a2e,
  platform: 0x8b6914,
  player: 0x3b82f6,
  enemy: 0xef4444,
  coin: 0xfbbf24,
  goal: 0xfbbf24,
  goalPole: 0xd1d5db,
  spikes: 0xef4444,
  lava: 0xdc2626,
  water: 0x3b82f6,
} as const;

/**
 * Builds a Phaser scene that plays the given level with geometric shapes and
 * light motion (coin spin, enemy patrol, idle bob, flag wave).
 */
export function createPlatformerScene(level: Level) {
  return class PlatformerScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
      up: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
    };
    private player!: Phaser.Physics.Arcade.Image;
    private statusText!: Phaser.GameObjects.Text;
    private ended = false;

    constructor() {
      super({ key: "PlatformerScene" });
    }

    create() {
      const { world } = level;
      this.cameras.main.setBackgroundColor(GAME_COLORS.background);
      this.cameras.main.setBounds(0, 0, world.width, world.height);
      this.physics.world.setBounds(0, 0, world.width, world.height);
      this.physics.world.gravity.y = world.gravity;

      const platforms = this.physics.add.staticGroup();
      for (const platform of level.platforms) {
        const rect = this.add.rectangle(
          platform.x + platform.width / 2,
          platform.y + platform.height / 2,
          platform.width,
          platform.height,
          GAME_COLORS.platform
        );
        this.physics.add.existing(rect, true);
        platforms.add(rect);
      }

      const hazards = this.physics.add.staticGroup();
      for (const hazard of level.hazards) {
        if (hazard.type === "spikes") {
          const spikes = this.add.triangle(
            hazard.x + hazard.width / 2,
            hazard.y + hazard.height / 2,
            0,
            hazard.height,
            hazard.width / 2,
            0,
            hazard.width,
            hazard.height,
            GAME_COLORS.spikes
          );
          spikes.setDisplaySize(hazard.width, hazard.height);
          this.physics.add.existing(spikes, true);
          hazards.add(spikes);
        } else {
          const color =
            hazard.type === "lava" ? GAME_COLORS.lava : GAME_COLORS.water;
          const rect = this.add.rectangle(
            hazard.x + hazard.width / 2,
            hazard.y + hazard.height / 2,
            hazard.width,
            hazard.height,
            color,
            hazard.type === "water" ? 0.7 : 1
          );
          this.physics.add.existing(rect, true);
          hazards.add(rect);
        }
      }

      // Player — blue circle
      const playerVisual = this.add.circle(
        level.player.x,
        level.player.y,
        16,
        GAME_COLORS.player
      );
      this.physics.add.existing(playerVisual);
      const playerBody = playerVisual.body as Phaser.Physics.Arcade.Body;
      playerBody.setCircle(16);
      playerBody.setCollideWorldBounds(true);
      playerBody.setBounce(0.05);
      playerBody.setDragX(900);
      this.player = playerVisual as unknown as Phaser.Physics.Arcade.Image;

      this.tweens.add({
        targets: playerVisual,
        scaleY: 0.92,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.physics.add.collider(this.player, platforms);

      const coins = this.physics.add.group({ allowGravity: false });
      for (const coin of level.coins) {
        const dot = this.add.circle(coin.x, coin.y, 10, GAME_COLORS.coin);
        this.physics.add.existing(dot);
        const coinBody = dot.body as Phaser.Physics.Arcade.Body;
        coinBody.setAllowGravity(false);
        this.tweens.add({
          targets: dot,
          scaleX: 0.35,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        coins.add(dot);
      }
      this.physics.add.overlap(this.player, coins, (_player, coin) => {
        (coin as Phaser.GameObjects.GameObject).destroy();
      });

      for (const enemy of level.enemies) {
        const body = this.add.circle(enemy.x, enemy.y, 14, GAME_COLORS.enemy);
        this.physics.add.existing(body);
        const enemyBody = body.body as Phaser.Physics.Arcade.Body;
        enemyBody.setAllowGravity(enemy.type === "walker");
        enemyBody.setCircle(14);
        enemyBody.setCollideWorldBounds(true);
        enemyBody.setImmovable(true);
        this.physics.add.collider(body, platforms);

        const half = Math.max(40, enemy.patrolDistance / 2);
        this.tweens.add({
          targets: body,
          x: { from: enemy.x - half, to: enemy.x + half },
          duration: Math.max(1200, 1600 + enemy.patrolDistance),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          onUpdate: () => {
            enemyBody.x = body.x - enemyBody.halfWidth;
            enemyBody.y = body.y - enemyBody.halfHeight;
          },
        });

        if (enemy.type === "flyer") {
          this.tweens.add({
            targets: body,
            y: enemy.y - 18,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            onUpdate: () => {
              enemyBody.y = body.y - enemyBody.halfHeight;
            },
          });
        }

        this.physics.add.overlap(this.player, body, () => this.fail());
      }

      // Goal — pole + waving yellow flag
      this.add.rectangle(
        level.goal.x,
        level.goal.y - 28,
        6,
        56,
        GAME_COLORS.goalPole
      );
      const flag = this.add.triangle(
        level.goal.x + 18,
        level.goal.y - 48,
        0,
        0,
        36,
        12,
        0,
        24,
        GAME_COLORS.goal
      );
      this.tweens.add({
        targets: flag,
        scaleX: 0.85,
        angle: 6,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      const goalZone = this.add.zone(level.goal.x + 10, level.goal.y - 28, 48, 64);
      this.physics.add.existing(goalZone, true);
      this.physics.add.overlap(this.player, goalZone, () => this.win());

      this.physics.add.overlap(this.player, hazards, () => this.fail());

      this.cursors = this.input.keyboard!.createCursorKeys();
      this.wasd = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as typeof this.wasd;

      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setZoom(
        Math.min(
          1.15,
          Math.max(0.5, (1000 / Math.max(world.width, world.height)) * 1.5)
        )
      );

      this.statusText = this.add
        .text(12, 12, "Arrow keys / WASD · reach the yellow flag", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "13px",
          color: "#e5e7eb",
        })
        .setScrollFactor(0)
        .setDepth(100);
    }

    update() {
      if (this.ended || !this.player?.body) return;

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const speed = 280;
      const left = this.cursors.left.isDown || this.wasd.left.isDown;
      const right = this.cursors.right.isDown || this.wasd.right.isDown;
      const jump =
        this.cursors.up.isDown ||
        this.cursors.space.isDown ||
        this.wasd.up.isDown;

      if (left) body.setVelocityX(-speed);
      else if (right) body.setVelocityX(speed);

      if (jump && (body.blocked.down || body.touching.down)) {
        body.setVelocityY(-Math.min(540, level.world.gravity * 0.45));
      }
    }

    private win() {
      if (this.ended) return;
      this.ended = true;
      this.statusText.setText("You win — flag reached!");
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    private fail() {
      if (this.ended) return;
      this.ended = true;
      this.statusText.setText("Ouch — try again");
      this.player.setPosition(level.player.x, level.player.y);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.time.delayedCall(500, () => {
        this.ended = false;
        this.statusText.setText("Arrow keys / WASD · reach the yellow flag");
      });
    }
  };
}
