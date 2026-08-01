import Phaser from "phaser";

import type { AudioManager } from "../audio/AudioManager";
import { DIALOGUES, OBJECTIVES, QUESTIONS } from "./content";
import {
  NavigationGrid,
  type Point,
  type Rectangle,
} from "./NavigationGrid";
import { StoryEngine } from "./StoryEngine";
import type { ActorId, DialogueLine, MusicState } from "./types";
import type { GameUI } from "../ui/GameUI";

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 900;
const PLAYER_SPEED = 260;
const INTERACTION_DISTANCE = 125;

const OBSTACLES: readonly Rectangle[] = [
  { x: 150, y: 100, width: 520, height: 300 },
  { x: 800, y: 100, width: 320, height: 245 },
  { x: 1190, y: 135, width: 250, height: 220 },
  { x: 1790, y: 105, width: 380, height: 275 },
  { x: 2260, y: 620, width: 330, height: 210 },
  { x: 2790, y: 110, width: 360, height: 300 },
];

const NAVIGATION_OBSTACLES: readonly Rectangle[] = OBSTACLES.map(
  (obstacle) => ({
    x: obstacle.x - 36,
    y: obstacle.y - 36,
    width: obstacle.width + 72,
    height: obstacle.height + 72,
  }),
);

interface Actor {
  readonly id: ActorId;
  readonly name: string;
  readonly container: Phaser.GameObjects.Container;
  readonly marker: Phaser.GameObjects.Ellipse;
}

export class BethanyScene extends Phaser.Scene {
  private readonly story = new StoryEngine();
  private readonly actors = new Map<ActorId, Actor>();
  private readonly navigation = new NavigationGrid(
    WORLD_WIDTH,
    WORLD_HEIGHT,
    40,
    NAVIGATION_OBSTACLES,
  );
  private readonly completedJourneys = new Set<ActorId>();

  private ui!: GameUI;
  private audio!: AudioManager;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private movementPath: Point[] = [];
  private pendingActor?: ActorId;
  private started = false;
  private paused = false;
  private nearestActor?: ActorId;
  private stone!: Phaser.GameObjects.Ellipse;
  private lazarus!: Phaser.GameObjects.Container;
  private jesusAreaLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("bethany");
  }

  preload(): void {
    this.load.image("art-bethany", "assets/art/bethany-village.png");
    this.load.image("art-journey", "assets/art/journey-to-jesus.png");
    this.load.image("art-tomb", "assets/art/tomb-garden.png");
  }

  create(): void {
    this.ui = this.registry.get("ui") as GameUI;
    this.audio = this.registry.get("audio") as AudioManager;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#706348");

    this.drawWorld();
    this.createPlayer();
    this.createActors();
    this.createTombElements();
    this.configureInput();

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);
    this.game.events.on("start-story", this.startStory, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("start-story", this.startStory, this);
    });
  }

  update(): void {
    if (!this.started || this.paused || this.ui.isBlockingOpen()) {
      this.player.setVelocity(0);
      this.ui.setInteractionPrompt(false);
      return;
    }

    this.updateMovement();
    this.updateInteractionTarget();
    this.updateDepths();
  }

  private startStory(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.audio.setState("dialogue", 1200);
    this.ui.showGameHud();
    this.updateObjective();
    this.showDialogue(DIALOGUES.opening, () => {
      this.story.completeOpening();
      this.audio.setState("exploration", 2400);
      this.updateObjective();
      this.ui.showNotice("计分已经开始。请沿道路找到耶稣，并准确传达口信。");
    });
  }

  private drawWorld(): void {
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x74684c)
      .setDepth(-20);

    if (this.textures.exists("art-bethany")) {
      this.add
        .image(650, 450, "art-bethany")
        .setDisplaySize(1300, 900)
        .setAlpha(0.48)
        .setDepth(-19);
    }
    if (this.textures.exists("art-journey")) {
      this.add
        .image(1740, 450, "art-journey")
        .setDisplaySize(1300, 900)
        .setAlpha(0.4)
        .setDepth(-19);
    }
    if (this.textures.exists("art-tomb")) {
      this.add
        .image(2780, 450, "art-tomb")
        .setDisplaySize(1000, 900)
        .setAlpha(0.5)
        .setDepth(-19);
    }

    this.add
      .rectangle(WORLD_WIDTH / 2, 560, WORLD_WIDTH, 270, 0xb8a173)
      .setDepth(-18);
    this.add
      .rectangle(WORLD_WIDTH / 2, 560, WORLD_WIDTH, 115, 0xcbb98b)
      .setDepth(-17);

    const boundary = this.add.graphics().setDepth(-16);
    boundary.lineStyle(8, 0x554b37, 0.7);
    boundary.strokeRoundedRect(18, 18, WORLD_WIDTH - 36, WORLD_HEIGHT - 36, 24);

    const buildingColors = [0x8a704b, 0x927854, 0x806747, 0x8c7250];
    OBSTACLES.forEach((obstacle, index) => {
      this.add
        .rectangle(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2,
          obstacle.width,
          obstacle.height,
          buildingColors[index % buildingColors.length] ?? 0x8a704b,
        )
        .setStrokeStyle(8, 0x56432d)
        .setDepth(-10);
    });

    this.addZoneLabel(410, 82, "马大与马利亚的家");
    this.jesusAreaLabel = this.addZoneLabel(
      1510,
      425,
      "耶稣所在之处（旅程场景）",
    );
    this.addZoneLabel(2330, 425, "通往坟墓的路");
    this.addZoneLabel(2920, 425, "拉撒路的坟墓");

    for (let x = 80; x < WORLD_WIDTH; x += 170) {
      const upper = 70 + ((x * 17) % 70);
      const lower = 760 + ((x * 11) % 80);
      this.add.circle(x, upper, 22, 0x4d5d37).setDepth(-14);
      this.add.circle(x + 70, lower, 27, 0x53633b).setDepth(-14);
    }

    this.add
      .ellipse(2940, 430, 210, 145, 0x1c1b18)
      .setStrokeStyle(12, 0x514839)
      .setDepth(-9);
  }

  private addZoneLabel(
    x: number,
    y: number,
    text: string,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "24px",
        color: "#fff3d4",
        backgroundColor: "rgba(34,29,22,0.82)",
        padding: { x: 13, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(-8);
  }

  private createPlayer(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x2f77be);
    graphics.fillRect(8, 4, 40, 20);
    graphics.fillStyle(0xd6ad7b);
    graphics.fillRect(16, 0, 24, 20);
    graphics.fillStyle(0x2f77be);
    graphics.fillRect(8, 20, 40, 38);
    graphics.fillStyle(0x1e4f82);
    graphics.fillRect(8, 58, 16, 14);
    graphics.fillRect(32, 58, 16, 14);
    graphics.lineStyle(4, 0xcce8ff);
    graphics.strokeRect(8, 20, 40, 38);
    graphics.generateTexture("player", 56, 74);
    graphics.destroy();

    this.player = this.physics.add.sprite(560, 680, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(40, 30);
    this.player.setOffset(8, 40);

    for (const obstacle of OBSTACLES) {
      const collisionBody = this.add
        .rectangle(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2,
          obstacle.width,
          obstacle.height,
          0xffffff,
          0,
        )
        .setVisible(false);
      this.physics.add.existing(collisionBody, true);
      this.physics.add.collider(this.player, collisionBody);
    }
  }

  private createActors(): void {
    this.createActor("martha", "马大", 520, 525, 0x76508b);
    this.createActor("mary", "马利亚", 405, 565, 0xa44b59);
    this.createActor("mourner", "安慰者", 650, 575, 0x667079);
    this.createActor("jesus", "耶稣", 1510, 520, 0xf2e5bd);
    this.createActor("guide", "带路的人", 1600, 600, 0x76654e);
    this.setActorVisible("guide", false);
  }

  private createActor(
    id: ActorId,
    name: string,
    x: number,
    y: number,
    color: number,
  ): void {
    const marker = this.add
      .ellipse(0, 31, 88, 40)
      .setStrokeStyle(4, 0xf4c86a, 0.95)
      .setVisible(false);
    const shadow = this.add.rectangle(0, 35, 60, 18, 0x2b261e, 0.35);
    const legs = this.add.rectangle(0, 24, 42, 28, color).setStrokeStyle(3, 0x3d3429);
    const body = this.add.rectangle(0, -7, 56, 52, color).setStrokeStyle(
      4,
      id === "jesus" ? 0x8d7b4d : 0xf5ead2,
    );
    const head = this.add
      .rectangle(0, -42, 30, 28, 0xd5a574)
      .setStrokeStyle(3, 0x5a4030);
    const label = this.add
      .text(0, -68, name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "22px",
        color: id === "jesus" ? "#2d271b" : "#fffaf0",
        backgroundColor:
          id === "jesus" ? "rgba(255,244,208,0.92)" : "rgba(31,27,21,0.86)",
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [
      marker,
      shadow,
      legs,
      body,
      head,
      label,
    ]);
    container.setSize(92, 135);
    container.setInteractive({ useHandCursor: true });
    container.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.moveTowardActor(id);
      },
    );

    this.actors.set(id, { id, name, container, marker });
  }

  private createTombElements(): void {
    this.stone = this.add
      .ellipse(2885, 470, 145, 165, 0x736b5e)
      .setStrokeStyle(7, 0x403b34)
      .setDepth(470);

    const body = this.add
      .rectangle(0, 0, 54, 92, 0xe7dec8)
      .setStrokeStyle(5, 0xa59a82);
    const label = this.add
      .text(0, -68, "拉撒路", {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: "22px",
        color: "#fffaf0",
        backgroundColor: "rgba(31,27,21,0.86)",
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5);
    this.lazarus = this.add
      .container(2940, 480, [body, label])
      .setDepth(480)
      .setVisible(false);
  }

  private configureInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.movementKeys = keyboard.addKeys("W,A,S,D") as typeof this.movementKeys;

    keyboard.on("keydown-SPACE", (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (this.ui.advanceDialogue()) {
        return;
      }
      if (this.ui.isChoiceOpen()) {
        return;
      }
      this.interactWithNearestActor();
    });
    keyboard.on("keydown-ENTER", (event: KeyboardEvent) => {
      if (!event.repeat) {
        if (!this.ui.isChoiceOpen()) {
          this.ui.advanceDialogue();
        }
      }
    });
    keyboard.on("keydown-ESC", (event: KeyboardEvent) => {
      if (!event.repeat && this.started && !this.ui.isBlockingOpen()) {
        this.togglePause();
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (
        !this.started ||
        this.paused ||
        this.ui.isBlockingOpen() ||
        !pointer.leftButtonDown()
      ) {
        return;
      }

      this.pendingActor = undefined;
      this.setMovementPath({ x: pointer.worldX, y: pointer.worldY });
    });
  }

  private updateMovement(): void {
    const horizontal =
      Number(this.cursors.right.isDown || this.movementKeys.D.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.A.isDown);
    const vertical =
      Number(this.cursors.down.isDown || this.movementKeys.S.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.W.isDown);

    if (horizontal !== 0 || vertical !== 0) {
      this.movementPath = [];
      this.pendingActor = undefined;
      const direction = new Phaser.Math.Vector2(horizontal, vertical).normalize();
      this.player.setVelocity(
        direction.x * PLAYER_SPEED,
        direction.y * PLAYER_SPEED,
      );
      return;
    }

    if (this.movementPath.length > 0) {
      const waypoint = this.movementPath[0];
      if (!waypoint) {
        this.player.setVelocity(0);
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        waypoint.x,
        waypoint.y,
      );
      if (distance < 13) {
        this.movementPath.shift();
        this.player.setVelocity(0);
      } else {
        this.physics.moveTo(
          this.player,
          waypoint.x,
          waypoint.y,
          PLAYER_SPEED,
        );
      }
      return;
    }

    this.player.setVelocity(0);
    if (this.pendingActor) {
      const actor = this.actors.get(this.pendingActor);
      if (
        actor &&
        actor.container.visible &&
        this.distanceTo(actor) > INTERACTION_DISTANCE
      ) {
        this.setMovementPath({
          x: actor.container.x,
          y: actor.container.y + 78,
        });
      }
    }
  }

  private updateInteractionTarget(): void {
    let nearest: Actor | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const actor of this.actors.values()) {
      if (!actor.container.visible) {
        continue;
      }
      const distance = this.distanceTo(actor);
      if (distance < nearestDistance) {
        nearest = actor;
        nearestDistance = distance;
      }
    }

    this.nearestActor =
      nearest && nearestDistance <= INTERACTION_DISTANCE
        ? nearest.id
        : undefined;
    this.ui.setInteractionPrompt(
      this.nearestActor !== undefined,
      this.nearestActor
        ? `SPACE / 点击与${this.actors.get(this.nearestActor)?.name ?? "人物"}互动`
        : undefined,
    );

    if (
      this.pendingActor &&
      this.nearestActor === this.pendingActor &&
      this.movementPath.length === 0
    ) {
      const actor = this.pendingActor;
      this.pendingActor = undefined;
      this.handleActorInteraction(actor);
    }
  }

  private updateDepths(): void {
    this.player.setDepth(this.player.y);
    for (const actor of this.actors.values()) {
      actor.container.setDepth(actor.container.y);
    }
  }

  private moveTowardActor(id: ActorId): void {
    if (!this.started || this.paused || this.ui.isBlockingOpen()) {
      return;
    }

    const actor = this.actors.get(id);
    if (!actor?.container.visible) {
      return;
    }

    this.pendingActor = id;
    if (this.distanceTo(actor) <= INTERACTION_DISTANCE) {
      this.movementPath = [];
      this.pendingActor = undefined;
      this.handleActorInteraction(id);
      return;
    }

    this.setMovementPath({
      x: actor.container.x,
      y: actor.container.y + 78,
    });
  }

  private interactWithNearestActor(): void {
    if (
      !this.started ||
      this.paused ||
      this.ui.isBlockingOpen() ||
      !this.nearestActor
    ) {
      return;
    }
    this.handleActorInteraction(this.nearestActor);
  }

  private handleActorInteraction(id: ActorId): void {
    switch (this.story.stage) {
      case "deliverMessage":
        if (id !== "jesus") {
          const result = this.story.answerQuestion(
            "find-jesus",
            id,
            "jesus",
          );
          this.ui.setScore(this.story.score);
          this.ui.showNotice(
            `${result.message} 当前任务是找到耶稣。`,
          );
          return;
        }
        this.audio.setState("dialogue", 1800);
        this.askQuestion(QUESTIONS.message, () => {
          this.story.deliverMessage();
          this.updateObjective();
          this.showDialogue(DIALOGUES.messageJourney, () => {
            this.story.arriveAtBethany();
            this.resetAfterJourney();
            this.audio.setState("exploration", 2400);
            this.updateObjective();
            this.ui.showNotice(
              "耶稣来到伯大尼附近。现在请小组根据经文判断谁先出去迎接他。",
            );
          });
        });
        return;
      case "chooseMartha":
      case "chooseMary":
      case "chooseGuide":
        this.handleDecision(id);
        return;
      case "followMartha":
        if (id === "martha" && this.completedJourneys.has("martha")) {
          this.story.arriveAtMartha();
          this.audio.setState("dialogue", 1800);
          this.updateObjective();
          this.showDialogue(DIALOGUES.marthaBeforeQuestion, () => {
            this.askQuestion(QUESTIONS.marthaResurrection, () => {
              this.showDialogue(DIALOGUES.marthaCore, () => {
                this.showDialogue(DIALOGUES.marthaReturns, () => {
                  this.story.completeMarthaDialogue();
                  this.resetAtHomeForMary();
                  this.audio.setState("exploration", 2400);
                  this.updateObjective();
                });
              });
            });
          });
        } else {
          this.ui.showNotice("马大仍在前往村外。请跟随她，并在她停下后靠近。");
        }
        return;
      case "followMary":
        if (id === "mary" && this.completedJourneys.has("mary")) {
          this.story.arriveAtMary();
          this.audio.setState("dialogue", 1800);
          this.updateObjective();
          this.showDialogue(DIALOGUES.mary, () => {
            this.story.completeMaryDialogue();
            this.prepareGuideDecision();
            this.updateObjective();
          });
        } else {
          this.ui.showNotice("马利亚正在前往耶稣那里。请跟随她和安慰她的人。");
        }
        return;
      case "followGuide":
        if (id === "guide" && this.completedJourneys.has("guide")) {
          this.story.arriveAtTomb();
          this.audio.setState("dialogue", 2200);
          this.prepareTombScene();
          this.updateObjective();
          this.showDialogue(DIALOGUES.tomb, () => this.revealLazarus());
        } else {
          this.ui.showNotice("带路的人还在前往坟墓。请继续跟随。");
        }
        return;
      default:
        this.ui.showNotice("请按照画面上方的当前经文线索继续。");
    }
  }

  private handleDecision(id: ActorId): void {
    const result = this.story.interact(id);
    this.ui.setScore(this.story.score);
    const penaltyText =
      result.penalty > 0 ? `（经文观察分 -${result.penalty}）` : "";
    this.ui.showNotice(`${result.message}${penaltyText}`);

    if (result.revealHint) {
      this.highlightExpectedActor();
    }

    if (result.kind !== "correct") {
      return;
    }

    this.updateObjective();
    if (
      this.story.stage === "followMartha" ||
      this.story.stage === "followMary" ||
      this.story.stage === "followGuide"
    ) {
      this.audio.setState("exploration", 2200);
    }
    switch (this.story.stage) {
      case "followMartha":
        this.moveActorAlong(
          "martha",
          [
            { x: 880, y: 610 },
            { x: 1190, y: 630 },
            { x: 1400, y: 540 },
          ],
          () => this.completedJourneys.add("martha"),
        );
        break;
      case "followMary":
        this.moveActorAlong(
          "mary",
          [
            { x: 820, y: 620 },
            { x: 1160, y: 635 },
            { x: 1400, y: 555 },
          ],
          () => this.completedJourneys.add("mary"),
        );
        this.time.delayedCall(650, () => {
          this.moveActorAlong(
            "mourner",
            [
              { x: 810, y: 690 },
              { x: 1160, y: 690 },
              { x: 1450, y: 640 },
            ],
            () => undefined,
          );
        });
        break;
      case "followGuide":
        this.moveActorAlong(
          "guide",
          [
            { x: 1940, y: 540 },
            { x: 2260, y: 525 },
            { x: 2570, y: 510 },
            { x: 2770, y: 500 },
          ],
          () => this.completedJourneys.add("guide"),
        );
        break;
      default:
        break;
    }
  }

  private resetAtHomeForMary(): void {
    this.completedJourneys.delete("mary");
    this.player.setPosition(600, 685);
    this.player.setVelocity(0);
    this.movementPath = [];
    this.pendingActor = undefined;
    this.setActorPosition("martha", 515, 525);
    this.setActorPosition("mary", 405, 565);
    this.setActorPosition("mourner", 650, 575);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.flash(350, 242, 229, 189);
  }

  private resetAfterJourney(): void {
    this.player.setPosition(560, 680);
    this.player.setVelocity(0);
    this.movementPath = [];
    this.pendingActor = undefined;
    this.setActorPosition("martha", 520, 525);
    this.setActorPosition("mary", 405, 565);
    this.setActorPosition("mourner", 650, 575);
    this.setActorPosition("jesus", 1510, 520);
    this.jesusAreaLabel.setText("耶稣停留的村外地点");
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.flash(350, 242, 229, 189);
  }

  private prepareGuideDecision(): void {
    this.setActorVisible("guide", true);
    this.setActorPosition("guide", 1590, 620);
    this.setActorPosition("mourner", 1490, 655);
    this.setActorPosition("mary", 1410, 555);
    this.setActorPosition("martha", 1460, 500);
    this.completedJourneys.delete("guide");
  }

  private prepareTombScene(): void {
    this.setActorPosition("jesus", 2820, 520);
    this.setActorPosition("martha", 2740, 600);
    this.setActorPosition("mary", 2800, 650);
    this.setActorPosition("mourner", 2680, 670);
    this.player.setPosition(2640, 590);
    this.player.setVelocity(0);
    this.movementPath = [];
    this.pendingActor = undefined;
    this.cameras.main.pan(2820, 500, 650, "Sine.easeInOut");
  }

  private revealLazarus(): void {
    this.audio.setState("revelation", 3000);
    this.tweens.add({
      targets: this.stone,
      x: 2735,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.lazarus.setVisible(true);
        this.tweens.add({
          targets: this.lazarus,
          y: 525,
          duration: 800,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.story.completeTomb();
            this.updateObjective();
            this.showDialogue(DIALOGUES.epilogue, () => {
              this.audio.setState("dialogue", 1800);
              this.askQuestion(QUESTIONS.aftermath, () => {
                this.story.completeEpilogue();
                this.audio.setState("revelation", 3000);
                this.updateObjective();
                this.ui.showResult(
                  this.story.score,
                  this.story.resultLabel(),
                  () => window.location.reload(),
                  () => this.returnToStudy(),
                );
              });
            });
          },
        });
      },
    });
  }

  private askQuestion(
    question: (typeof QUESTIONS)[keyof typeof QUESTIONS],
    onCorrect: () => void,
  ): void {
    this.player.setVelocity(0);
    this.movementPath = [];
    this.pendingActor = undefined;
    this.ui.showChoice(
      question,
      (optionId) => {
        const result = this.story.answerQuestion(
          question.id,
          optionId,
          question.correctOption,
        );
        this.ui.setScore(this.story.score);
        return result;
      },
      onCorrect,
    );
  }

  private showDialogue(
    lines: readonly DialogueLine[],
    onComplete: () => void,
  ): void {
    this.ui.showDialogue(lines, onComplete, (line) => {
      if (line.music) {
        this.audio.setState(line.music, this.musicTransitionDuration(line.music));
      }
    });
  }

  private musicTransitionDuration(state: MusicState): number {
    switch (state) {
      case "revelation":
        return 3400;
      case "silence":
        return 1800;
      case "exploration":
        return 2400;
      case "dialogue":
        return 1800;
    }
  }

  private moveActorAlong(
    id: ActorId,
    points: readonly Point[],
    onComplete: () => void,
  ): void {
    const actor = this.actors.get(id);
    if (!actor) {
      return;
    }

    const moveNext = (index: number): void => {
      const point = points[index];
      if (!point) {
        onComplete();
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        actor.container.x,
        actor.container.y,
        point.x,
        point.y,
      );
      this.tweens.add({
        targets: actor.container,
        x: point.x,
        y: point.y,
        duration: Math.max(400, (distance / 185) * 1000),
        ease: "Linear",
        onComplete: () => moveNext(index + 1),
      });
    };

    moveNext(0);
  }

  private highlightExpectedActor(): void {
    const expected: Partial<Record<typeof this.story.stage, ActorId>> = {
      chooseMartha: "martha",
      chooseMary: "mary",
      chooseGuide: "guide",
    };
    const id = expected[this.story.stage];
    const actor = id ? this.actors.get(id) : undefined;
    if (!actor) {
      return;
    }

    actor.marker.setVisible(true).setAlpha(1).setScale(1);
    this.tweens.add({
      targets: actor.marker,
      alpha: 0.25,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 700,
      yoyo: true,
      repeat: 4,
      onComplete: () => actor.marker.setVisible(false),
    });
  }

  private setMovementPath(target: Point): void {
    const path = this.navigation.findPath(
      { x: this.player.x, y: this.player.y },
      target,
    );
    if (path.length === 0) {
      this.movementPath = [];
      this.ui.showNotice("那里无法到达，请点击道路上的位置。", 1800);
      return;
    }
    this.movementPath = path;
  }

  private distanceTo(actor: Actor): number {
    return Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      actor.container.x,
      actor.container.y,
    );
  }

  private setActorPosition(id: ActorId, x: number, y: number): void {
    this.actors.get(id)?.container.setPosition(x, y);
  }

  private setActorVisible(id: ActorId, visible: boolean): void {
    const actor = this.actors.get(id);
    actor?.container.setVisible(visible);
    actor?.container.setActive(visible);
  }

  private updateObjective(): void {
    this.ui.setObjective(OBJECTIVES[this.story.stage]);
    this.ui.setScore(this.story.score);
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeGame();
      return;
    }

    this.paused = true;
    this.player.setVelocity(0);
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.audio.pause("game");
    this.ui.showPause(
      () => this.resumeGame(),
      () => window.location.reload(),
      () => this.returnToStudy(),
    );
  }

  private resumeGame(): void {
    this.paused = false;
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.audio.resume("game");
    this.ui.hidePause();
    document.getElementById("game-root")?.focus();
  }

  private returnToStudy(): void {
    this.audio.stop();
    const returnPath = new URLSearchParams(window.location.search).get("return");
    if (returnPath) {
      const destination = new URL(returnPath, window.location.href);
      if (destination.origin === window.location.origin) {
        window.location.assign(destination.href);
        return;
      }
    }

    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin) {
        window.history.back();
        return;
      }
    }

    window.location.reload();
  }
}
