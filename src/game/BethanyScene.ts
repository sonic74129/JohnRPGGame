import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { GameUI } from "../ui/GameUI";
import { ActorRegistry } from "./ActorRegistry";
import {
  AreaRuntime,
  type AreaConfig,
  type AreaHost,
  type AreaId,
  type AreaResource,
} from "./AreaRuntime";
import { Character } from "./Character";
import { CutsceneDirector } from "./CutsceneDirector";
import { DIALOGUES, OBJECTIVES, QUESTIONS } from "./content";
import { Interaction, type InteractionRules } from "./Interaction";
import {
  NavigationGrid,
  type Point,
  type Rectangle,
} from "./NavigationGrid";
import { NpcPathController, type NpcPathAdapter } from "./NpcPathController";
import { PlayerController } from "./PlayerController";
import { StoryEngine } from "./StoryEngine";
import { Trigger } from "./Trigger";
import type { ActorId, DialogueLine, MusicState, StoryStage } from "./types";

const PLAYER_SPEED = 260;
const INTERACTION_DISTANCE = 125;

const ACTORS: Readonly<Record<ActorId, { readonly name: string; readonly color: number }>> = {
  martha: { name: "马大", color: 0x76508b },
  mary: { name: "马利亚", color: 0xa44b59 },
  mourner: { name: "安慰者", color: 0x667079 },
  jesus: { name: "耶稣", color: 0xf2e5bd },
  guide: { name: "带路的人", color: 0x76654e },
};

const ACTOR_IDS: readonly ActorId[] = [
  "martha",
  "mary",
  "mourner",
  "jesus",
  "guide",
];

const AREAS: Readonly<Record<AreaId, AreaConfig>> = {
  "lazarus-house": {
    id: "lazarus-house",
    width: 1100,
    height: 800,
    backgroundKey: "art-house",
    backgroundColor: 0x706348,
    obstacles: [
      { x: 0, y: 0, width: 1100, height: 65 },
      { x: 0, y: 0, width: 65, height: 800 },
      { x: 1035, y: 0, width: 65, height: 800 },
      { x: 0, y: 735, width: 870, height: 65 },
    ],
    playerSpawn: { x: 530, y: 665 },
    actors: [
      { id: "martha", position: { x: 430, y: 390 } },
      { id: "mary", position: { x: 610, y: 420 } },
      { id: "mourner", position: { x: 760, y: 520 } },
    ],
  },
  "road-to-jesus": {
    id: "road-to-jesus",
    width: 1700,
    height: 900,
    backgroundKey: "art-journey",
    backgroundColor: 0x74684c,
    obstacles: [
      { x: 0, y: 0, width: 1700, height: 85 },
      { x: 0, y: 0, width: 75, height: 900 },
      { x: 1625, y: 0, width: 75, height: 900 },
      { x: 250, y: 140, width: 270, height: 180 },
      { x: 1120, y: 120, width: 300, height: 190 },
    ],
    playerSpawn: { x: 170, y: 680 },
    actors: [{ id: "jesus", position: { x: 1280, y: 540 } }],
  },
  "bethany-village": {
    id: "bethany-village",
    width: 1900,
    height: 900,
    backgroundKey: "art-bethany",
    backgroundColor: 0x74684c,
    obstacles: [
      { x: 0, y: 0, width: 1900, height: 85 },
      { x: 0, y: 0, width: 75, height: 900 },
      { x: 1825, y: 0, width: 75, height: 900 },
      { x: 150, y: 110, width: 420, height: 260 },
      { x: 840, y: 115, width: 260, height: 220 },
    ],
    playerSpawn: { x: 560, y: 680 },
    actors: [
      { id: "martha", position: { x: 520, y: 525 } },
      { id: "mary", position: { x: 405, y: 565 } },
      { id: "mourner", position: { x: 650, y: 575 } },
      { id: "jesus", position: { x: 1510, y: 520 } },
      { id: "guide", position: { x: 1600, y: 600 }, visible: false },
    ],
  },
  "tomb-garden": {
    id: "tomb-garden",
    width: 1100,
    height: 780,
    backgroundKey: "art-tomb",
    backgroundColor: 0x625b4a,
    obstacles: [
      { x: 0, y: 0, width: 1100, height: 70 },
      { x: 0, y: 0, width: 65, height: 780 },
      { x: 1035, y: 0, width: 65, height: 780 },
    ],
    playerSpawn: { x: 470, y: 610 },
    actors: [
      { id: "jesus", position: { x: 760, y: 430 } },
      { id: "martha", position: { x: 680, y: 520 } },
      { id: "mary", position: { x: 780, y: 570 } },
      { id: "mourner", position: { x: 620, y: 600 } },
    ],
  },
};

const INTERACTION_RULES: InteractionRules = {
  jesus: {
    areas: ["road-to-jesus", "bethany-village"],
    stages: ["deliverMessage", "chooseGuide"],
  },
  martha: {
    areas: ["bethany-village"],
    stages: ["chooseMartha", "chooseMary", "followMartha", "chooseGuide"],
  },
  mary: {
    areas: ["bethany-village"],
    stages: ["chooseMartha", "chooseMary", "followMary", "chooseGuide"],
  },
  mourner: {
    areas: ["bethany-village"],
    stages: ["chooseMartha", "chooseMary", "chooseGuide"],
  },
  guide: {
    areas: ["bethany-village"],
    stages: ["chooseGuide", "followGuide"],
  },
};

interface ActorVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly marker: Phaser.GameObjects.Ellipse;
}

export class BethanyScene extends Phaser.Scene {
  private story = new StoryEngine();
  private actorRegistry = new ActorRegistry();
  private playerController = new PlayerController();
  private cutscenes = new CutsceneDirector(this.playerController);
  private npcPaths = new NpcPathController();
  private readonly visuals = new Map<ActorId, ActorVisual>();
  private readonly completedJourneys = new Set<ActorId>();

  private ui!: GameUI;
  private audio!: AudioManager;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys!: {
    readonly W: Phaser.Input.Keyboard.Key;
    readonly A: Phaser.Input.Keyboard.Key;
    readonly S: Phaser.Input.Keyboard.Key;
    readonly D: Phaser.Input.Keyboard.Key;
  };
  private areaRuntime?: AreaRuntime;
  private interaction?: Interaction;
  private navigation?: NavigationGrid;
  private movementPath: Point[] = [];
  private pendingActor?: ActorId;
  private nearestActor?: ActorId;
  private houseDoor?: Trigger<StoryStage>;
  private started = false;
  private paused = false;
  private stone?: Phaser.GameObjects.Ellipse;
  private lazarus?: Phaser.GameObjects.Container;
  private decorations: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("bethany");
  }

  preload(): void {
    this.load.image("art-house", "assets/art/map-house-interior-clean.png");
    this.load.image("art-bethany", "assets/art/bethany-village.png");
    this.load.image("art-journey", "assets/art/journey-to-jesus.png");
    this.load.image("art-tomb", "assets/art/tomb-garden.png");
  }

  create(): void {
    const ui = this.registry.get("ui");
    const audio = this.registry.get("audio");
    if (!(ui instanceof GameUI) || !(audio instanceof AudioManager)) {
      throw new Error("Bethany scene requires initialized UI and audio services.");
    }
    this.ui = ui;
    this.audio = audio;
    this.resetRuntimeState();
    this.cameras.main.setBackgroundColor("#706348");
    this.createPlayer();
    this.registerActors();
    this.areaRuntime = new AreaRuntime(this.createAreaHost(), AREAS);
    this.interaction = new Interaction(
      this.actorRegistry,
      INTERACTION_RULES,
      INTERACTION_DISTANCE,
    );
    this.enterArea("lazarus-house");
    this.configureInput();
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.game.events.on("start-story", this.startStory, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("start-story", this.startStory, this);
      this.areaRuntime?.cleanup();
      this.clearDecorations();
    });
  }

  update(): void {
    if (!this.canAcceptPlayerInput()) {
      this.player.setVelocity(0);
      this.ui.setInteractionPrompt(false);
      return;
    }

    this.updateMovement();
    this.updateInteractionTarget();
    this.tryHouseDoor();
    this.updateDepths();
  }

  private createAreaHost(): AreaHost {
    return {
      setBounds: (width, height) => {
        this.physics.world.setBounds(0, 0, width, height);
        this.cameras.main.setBounds(0, 0, width, height);
      },
      createBackground: (config) => this.createAreaBackground(config),
      createObstacle: (obstacle) => this.createObstacle(obstacle),
      clearActors: () => this.clearActorVisuals(),
      rebuildNavigation: (config) => {
        const paddedObstacles = config.obstacles.map((obstacle) => ({
          x: obstacle.x - 36,
          y: obstacle.y - 36,
          width: obstacle.width + 72,
          height: obstacle.height + 72,
        }));
        this.navigation = new NavigationGrid(
          config.width,
          config.height,
          40,
          paddedObstacles,
        );
      },
    };
  }

  private createAreaBackground(config: AreaConfig): AreaResource {
    const background = this.add
      .rectangle(
        config.width / 2,
        config.height / 2,
        config.width,
        config.height,
        config.backgroundColor,
      )
      .setDepth(-30);
    const route = this.add
      .rectangle(config.width / 2, config.height * 0.68, config.width, 150, 0xcbb98b, 0.5)
      .setDepth(-29);
    const art = this.textures.exists(config.backgroundKey)
      ? this.add
          .image(config.width / 2, config.height / 2, config.backgroundKey)
          .setDisplaySize(config.width, config.height)
          .setAlpha(config.id === "lazarus-house" ? 0.82 : 0.48)
          .setDepth(-28)
      : undefined;
    return {
      destroy: () => {
        background.destroy();
        route.destroy();
        art?.destroy();
      },
    };
  }

  private createObstacle(obstacle: Rectangle): AreaResource {
    const collisionBody = this.add
      .rectangle(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width,
        obstacle.height,
        0x3d3429,
        0.12,
      )
      .setDepth(-20);
    this.physics.add.existing(collisionBody, true);
    const collider = this.physics.add.collider(this.player, collisionBody);
    return {
      destroy: () => {
        collider.destroy();
        collisionBody.destroy();
      },
    };
  }

  private createPlayer(): void {
    if (!this.textures.exists("player")) {
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
    }
    this.player = this.physics.add.sprite(0, 0, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(40, 30);
    this.player.setOffset(8, 40);
  }

  private registerActors(): void {
    for (const id of ACTOR_IDS) {
      const actor = ACTORS[id];
      this.actorRegistry.register(
        new Character(id, actor.name, "lazarus-house", { x: 0, y: 0 }, false),
      );
    }
  }

  private resetRuntimeState(): void {
    this.story = new StoryEngine();
    this.actorRegistry = new ActorRegistry();
    this.playerController = new PlayerController();
    this.cutscenes = new CutsceneDirector(this.playerController);
    this.npcPaths = new NpcPathController();
    this.visuals.clear();
    this.completedJourneys.clear();
    this.areaRuntime = undefined;
    this.interaction = undefined;
    this.navigation = undefined;
    this.movementPath = [];
    this.pendingActor = undefined;
    this.nearestActor = undefined;
    this.houseDoor = undefined;
    this.started = false;
    this.paused = false;
    this.stone = undefined;
    this.lazarus = undefined;
    this.decorations = [];
  }

  private enterArea(area: AreaId): void {
    this.clearDecorations();
    const config = this.areaRuntime?.enter(area);
    if (!config) {
      throw new Error(`Area runtime is not available for ${area}.`);
    }
    this.actorRegistry.hideAll();
    for (const placement of config.actors) {
      this.actorRegistry.move(placement.id, area, placement.position);
      this.actorRegistry.setVisible(placement.id, placement.visible ?? true);
      if (placement.visible ?? true) {
        this.createActorVisual(placement.id);
      }
    }
    this.player.setPosition(config.playerSpawn.x, config.playerSpawn.y);
    this.stopPlayerMovement();
    this.nearestActor = undefined;
    if (area === "tomb-garden") {
      this.createTombElements();
    }
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  private createActorVisual(id: ActorId): void {
    const actor = this.actorRegistry.require(id).state;
    const details = ACTORS[id];
    const marker = this.add
      .ellipse(0, 31, 88, 40)
      .setStrokeStyle(4, 0xf4c86a, 0.95)
      .setVisible(false);
    const shadow = this.add.rectangle(0, 35, 60, 18, 0x2b261e, 0.35);
    const legs = this.add
      .rectangle(0, 24, 42, 28, details.color)
      .setStrokeStyle(3, 0x3d3429);
    const body = this.add
      .rectangle(0, -7, 56, 52, details.color)
      .setStrokeStyle(4, id === "jesus" ? 0x8d7b4d : 0xf5ead2);
    const head = this.add
      .rectangle(0, -42, 30, 28, 0xd5a574)
      .setStrokeStyle(3, 0x5a4030);
    const container = this.add.container(actor.position.x, actor.position.y, [
      marker,
      shadow,
      legs,
      body,
      head,
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
    this.visuals.set(id, { container, marker });
  }

  private clearActorVisuals(): void {
    for (const visual of this.visuals.values()) {
      visual.container.destroy();
    }
    this.visuals.clear();
  }

  private createTombElements(): void {
    const entrance = this.add
      .ellipse(865, 365, 210, 145, 0x1c1b18)
      .setStrokeStyle(12, 0x514839)
      .setDepth(-10);
    this.stone = this.add
      .ellipse(825, 405, 145, 165, 0x736b5e)
      .setStrokeStyle(7, 0x403b34)
      .setDepth(405);
    const body = this.add
      .rectangle(0, 0, 54, 92, 0xe7dec8)
      .setStrokeStyle(5, 0xa59a82);
    this.lazarus = this.add
      .container(880, 480, [body])
      .setDepth(480)
      .setVisible(false);
    this.decorations = [entrance, this.stone, this.lazarus];
  }

  private clearDecorations(): void {
    for (const decoration of this.decorations) {
      decoration.destroy();
    }
    this.decorations = [];
    this.stone = undefined;
    this.lazarus = undefined;
  }

  private configureInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }
    this.cursors = keyboard.createCursorKeys();
    this.movementKeys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    keyboard.on("keydown-SPACE", (event: KeyboardEvent) => {
      if (event.repeat || this.ui.advanceDialogue() || this.ui.isChoiceOpen()) {
        return;
      }
      this.interactWithNearestActor();
    });
    keyboard.on("keydown-ENTER", (event: KeyboardEvent) => {
      if (!event.repeat && !this.ui.isChoiceOpen()) {
        this.ui.advanceDialogue();
      }
    });
    keyboard.on("keydown-ESC", (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        this.started &&
        !this.ui.isBlockingOpen() &&
        !this.playerController.isLocked
      ) {
        this.togglePause();
      }
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.canAcceptPlayerInput() || !pointer.leftButtonDown()) {
        return;
      }
      this.pendingActor = undefined;
      this.setMovementPath({ x: pointer.worldX, y: pointer.worldY });
    });
  }

  private startStory(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.ui.showGameHud();
    this.updateObjective();
    void this.cutscenes.run(async () => {
      this.audio.setState("dialogue", 1200);
      this.cameras.main.fadeIn(500, 20, 18, 14);
      await this.tweenPlayer(10, -8, 550);
      await this.showDialogue(DIALOGUES.opening);
      this.story.completeOpening();
      this.audio.setState("exploration", 2400);
      this.updateObjective();
      this.ui.showNotice("计分已经开始。走到门口，沿道路找到耶稣，并准确传达口信。");
    });
  }

  private canAcceptPlayerInput(): boolean {
    return (
      this.started &&
      !this.paused &&
      !this.ui.isBlockingOpen() &&
      !this.playerController.isLocked
    );
  }

  private updateMovement(): void {
    const horizontal =
      Number(this.cursors.right.isDown || this.movementKeys.D.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.A.isDown);
    const vertical =
      Number(this.cursors.down.isDown || this.movementKeys.S.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.W.isDown);
    const direction = this.playerController.resolveMovement(horizontal, vertical);
    if (direction.x !== 0 || direction.y !== 0) {
      this.movementPath = [];
      this.pendingActor = undefined;
      this.player.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
      return;
    }
    const waypoint = this.movementPath[0];
    if (waypoint) {
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
        this.physics.moveTo(this.player, waypoint.x, waypoint.y, PLAYER_SPEED);
      }
      return;
    }
    this.player.setVelocity(0);
    if (this.pendingActor) {
      const context = this.interactionContext();
      if (!this.interaction?.canApproach(this.pendingActor, context)) {
        this.pendingActor = undefined;
        return;
      }
      const target = this.interaction.targetPosition(this.pendingActor);
      if (target && !this.interaction.canInteract(this.pendingActor, context)) {
        this.setMovementPath(target);
      }
    }
  }

  private updateInteractionTarget(): void {
    this.nearestActor = this.interaction?.nearest(this.interactionContext());
    const actor = this.nearestActor
      ? this.actorRegistry.get(this.nearestActor)?.state
      : undefined;
    this.ui.setInteractionPrompt(
      actor !== undefined,
      actor ? `SPACE / 点击与${actor.name}互动` : undefined,
    );
    if (
      this.pendingActor &&
      this.pendingActor === this.nearestActor &&
      this.movementPath.length === 0
    ) {
      const actorId = this.pendingActor;
      this.pendingActor = undefined;
      this.handleActorInteraction(actorId);
    }
  }

  private interactionContext() {
    const area = this.areaRuntime?.currentArea;
    if (!area) {
      throw new Error("Cannot interact before entering an area.");
    }
    return {
      area,
      playerPosition: { x: this.player.x, y: this.player.y },
      stage: this.story.stage,
      inputLocked: !this.canAcceptPlayerInput(),
    };
  }

  private tryHouseDoor(): void {
    if (this.areaRuntime?.currentArea !== "lazarus-house") {
      return;
    }
    if (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, 970, 680) >
      82
    ) {
      return;
    }
    if (!this.houseDoor) {
      this.houseDoor = new Trigger<StoryStage>({
        stage: "deliverMessage",
        handler: () =>
          this.cutscenes.run(async () => {
            this.enterArea("road-to-jesus");
            this.cameras.main.fadeIn(350, 20, 18, 14);
            this.ui.showNotice("沿道路前进，找到耶稣。");
          }),
      });
    }
    const houseDoor = this.houseDoor;
    void houseDoor.tryActivate(this.story.stage).catch(() => {
      this.ui.showNotice("转场未完成，请再次靠近门口。");
    });
  }

  private setMovementPath(target: Point): void {
    const path = this.navigation?.findPath(
      { x: this.player.x, y: this.player.y },
      target,
    );
    if (!path || path.length === 0) {
      this.movementPath = [];
      this.ui.showNotice("那里无法到达，请点击道路上的位置。", 1800);
      return;
    }
    this.movementPath = path;
  }

  private moveTowardActor(id: ActorId): void {
    if (!this.canAcceptPlayerInput()) {
      return;
    }
    const context = this.interactionContext();
    if (!this.interaction?.canApproach(id, context)) {
      return;
    }
    this.pendingActor = id;
    if (this.nearestActor === id) {
      this.pendingActor = undefined;
      this.handleActorInteraction(id);
      return;
    }
    const target = this.interaction.targetPosition(id);
    if (target) {
      this.setMovementPath(target);
    }
  }

  private interactWithNearestActor(): void {
    if (!this.canAcceptPlayerInput() || !this.nearestActor) {
      return;
    }
    this.handleActorInteraction(this.nearestActor);
  }

  private handleActorInteraction(id: ActorId): void {
    this.stopPlayerMovement();
    switch (this.story.stage) {
      case "deliverMessage":
        if (id === "jesus") {
          void this.deliverMessage();
        }
        return;
      case "chooseMartha":
      case "chooseMary":
      case "chooseGuide":
        this.handleDecision(id);
        return;
      case "followMartha":
        if (id === "martha" && this.completedJourneys.has("martha")) {
          void this.runMarthaSequence();
        }
        return;
      case "followMary":
        if (id === "mary" && this.completedJourneys.has("mary")) {
          void this.runMarySequence();
        }
        return;
      case "followGuide":
        if (id === "guide" && this.completedJourneys.has("guide")) {
          void this.runTombSequence();
        }
        return;
      default:
        return;
    }
  }

  private async deliverMessage(): Promise<void> {
    await this.cutscenes.run(async () => {
      this.audio.setState("dialogue", 1800);
      await this.askQuestion(QUESTIONS.message);
      this.story.deliverMessage();
      this.updateObjective();
      await this.showDialogue(DIALOGUES.messageJourney);
      this.enterArea("bethany-village");
      this.story.arriveAtBethany();
      this.audio.setState("exploration", 2400);
      this.updateObjective();
      this.ui.showNotice("耶稣来到伯大尼附近。根据经文判断谁先出去迎接他。");
    });
  }

  private handleDecision(id: ActorId): void {
    const result = this.story.interact(id);
    this.ui.setScore(this.story.score);
    const penaltyText = result.penalty > 0 ? `（经文观察分 -${result.penalty}）` : "";
    this.ui.showNotice(`${result.message}${penaltyText}`);
    if (result.revealHint) {
      this.highlightExpectedActor();
    }
    if (result.kind !== "correct") {
      return;
    }
    this.updateObjective();
    this.audio.setState("exploration", 2200);
    switch (this.story.stage) {
      case "followMartha":
        void this.moveActorAlong(
          "martha",
          [
            { x: 880, y: 610 },
            { x: 1190, y: 630 },
            { x: 1400, y: 540 },
          ],
          () => this.completedJourneys.add("martha"),
        );
        return;
      case "followMary":
        void this.moveActorAlong(
          "mary",
          [
            { x: 820, y: 620 },
            { x: 1160, y: 635 },
            { x: 1400, y: 555 },
          ],
          () => this.completedJourneys.add("mary"),
        );
        this.time.delayedCall(650, () => {
          void this.moveActorAlong(
            "mourner",
            [
              { x: 810, y: 690 },
              { x: 1160, y: 690 },
              { x: 1450, y: 640 },
            ],
            () => undefined,
          );
        });
        return;
      case "followGuide":
        void this.moveActorAlong(
          "guide",
          [
            { x: 1640, y: 590 },
            { x: 1710, y: 545 },
            { x: 1770, y: 510 },
          ],
          () => this.completedJourneys.add("guide"),
        );
        return;
      default:
        return;
    }
  }

  private async moveActorAlong(
    id: ActorId,
    points: readonly Point[],
    onComplete: () => void,
  ): Promise<void> {
    const completed = await this.npcPaths.follow(id, points, this.npcPathAdapter());
    if (completed) {
      onComplete();
    }
  }

  private npcPathAdapter(): NpcPathAdapter {
    return {
      positionOf: (id) => this.actorRegistry.get(id)?.state.position,
      moveTo: (id, target, durationMs) =>
        new Promise((resolve) => {
          const visual = this.visuals.get(id);
          const area = this.areaRuntime?.currentArea;
          if (!visual || !area) {
            resolve();
            return;
          }
          this.tweens.add({
            targets: visual.container,
            x: target.x,
            y: target.y,
            duration: durationMs,
            ease: "Linear",
            onUpdate: () => {
              this.actorRegistry.move(id, area, {
                x: visual.container.x,
                y: visual.container.y,
              });
            },
            onComplete: () => {
              this.actorRegistry.move(id, area, target);
              resolve();
            },
          });
        }),
    };
  }

  private async runMarthaSequence(): Promise<void> {
    await this.cutscenes.run(async () => {
      this.story.arriveAtMartha();
      this.audio.setState("dialogue", 1800);
      this.updateObjective();
      await this.showDialogue(DIALOGUES.marthaBeforeQuestion);
      await this.askQuestion(QUESTIONS.marthaResurrection);
      await this.showDialogue(DIALOGUES.marthaCore);
      await this.showDialogue(DIALOGUES.marthaReturns);
      this.story.completeMarthaDialogue();
      this.resetForMary();
      this.audio.setState("exploration", 2400);
      this.updateObjective();
    });
  }

  private async runMarySequence(): Promise<void> {
    await this.cutscenes.run(async () => {
      this.story.arriveAtMary();
      this.audio.setState("dialogue", 1800);
      this.updateObjective();
      await this.showDialogue(DIALOGUES.mary);
      this.story.completeMaryDialogue();
      this.prepareGuideDecision();
      this.updateObjective();
    });
  }

  private async runTombSequence(): Promise<void> {
    await this.cutscenes.run(async () => {
      this.story.arriveAtTomb();
      this.enterArea("tomb-garden");
      this.audio.setState("dialogue", 2200);
      this.updateObjective();
      await this.showDialogue(DIALOGUES.tomb);
      await this.revealLazarus();
    });
  }

  private resetForMary(): void {
    this.completedJourneys.delete("mary");
    this.stopPlayerMovement();
    this.setActorPosition("martha", 515, 525);
    this.setActorPosition("mary", 405, 565);
    this.setActorPosition("mourner", 650, 575);
    this.player.setPosition(600, 685);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.flash(350, 242, 229, 189);
  }

  private stopPlayerMovement(): void {
    this.player.setVelocity(0);
    this.movementPath = [];
    this.pendingActor = undefined;
  }

  private prepareGuideDecision(): void {
    this.setActorVisible("guide", true);
    this.setActorPosition("guide", 1590, 620);
    this.setActorPosition("mourner", 1490, 655);
    this.setActorPosition("mary", 1410, 555);
    this.setActorPosition("martha", 1460, 500);
    this.completedJourneys.delete("guide");
  }

  private setActorPosition(id: ActorId, x: number, y: number): void {
    const area = this.areaRuntime?.currentArea;
    const visual = this.visuals.get(id);
    if (!area || !visual) {
      return;
    }
    this.actorRegistry.move(id, area, { x, y });
    visual.container.setPosition(x, y);
  }

  private setActorVisible(id: ActorId, visible: boolean): void {
    this.actorRegistry.setVisible(id, visible);
    if (visible && !this.visuals.has(id)) {
      this.createActorVisual(id);
      return;
    }
    const visual = this.visuals.get(id);
    visual?.container.setVisible(visible).setActive(visible);
  }

  private async revealLazarus(): Promise<void> {
    const stone = this.stone;
    const lazarus = this.lazarus;
    if (!stone || !lazarus) {
      throw new Error("The tomb scene is incomplete.");
    }
    this.audio.setState("revelation", 3000);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: stone,
        x: 660,
        duration: 900,
        ease: "Sine.easeInOut",
        onComplete: () => resolve(),
      });
    });
    lazarus.setVisible(true);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: lazarus,
        y: 430,
        duration: 800,
        ease: "Sine.easeOut",
        onComplete: () => resolve(),
      });
    });
    this.story.completeTomb();
    this.updateObjective();
    await this.showDialogue(DIALOGUES.epilogue);
    this.audio.setState("dialogue", 1800);
    await this.askQuestion(QUESTIONS.aftermath);
    this.story.completeEpilogue();
    this.audio.setState("revelation", 3000);
    this.updateObjective();
    this.ui.showResult(
      this.story.score,
      this.story.resultLabel(),
      () => window.location.reload(),
      () => this.returnToStudy(),
    );
  }

  private askQuestion(
    question: (typeof QUESTIONS)[keyof typeof QUESTIONS],
  ): Promise<void> {
    return new Promise((resolve) => {
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
        resolve,
      );
    });
  }

  private showDialogue(lines: readonly DialogueLine[]): Promise<void> {
    return new Promise((resolve) => {
      this.ui.showDialogue(lines, resolve, (line) => {
        if (line.music) {
          this.audio.setState(line.music, this.musicTransitionDuration(line.music));
        }
      });
    });
  }

  private tweenPlayer(offsetX: number, offsetY: number, duration: number): Promise<void> {
    const x = this.player.x;
    const y = this.player.y;
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.player,
        x: x + offsetX,
        y: y + offsetY,
        duration,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: () => resolve(),
      });
    });
  }

  private highlightExpectedActor(): void {
    const expected: Partial<Record<StoryStage, ActorId>> = {
      chooseMartha: "martha",
      chooseMary: "mary",
      chooseGuide: "guide",
    };
    const id = expected[this.story.stage];
    const visual = id ? this.visuals.get(id) : undefined;
    if (!visual) {
      return;
    }
    visual.marker.setVisible(true).setAlpha(1).setScale(1);
    this.tweens.add({
      targets: visual.marker,
      alpha: 0.25,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 700,
      yoyo: true,
      repeat: 4,
      onComplete: () => visual.marker.setVisible(false),
    });
  }

  private updateDepths(): void {
    this.player.setDepth(this.player.y);
    for (const visual of this.visuals.values()) {
      visual.container.setDepth(visual.container.y);
    }
  }

  private updateObjective(): void {
    this.ui.setObjective(OBJECTIVES[this.story.stage]);
    this.ui.setScore(this.story.score);
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
