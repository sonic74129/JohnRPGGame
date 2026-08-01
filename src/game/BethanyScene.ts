import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import {
  createActorLabel,
  type ActorLabelController,
} from "../ui/ActorLabel";
import { GameUI } from "../ui/GameUI";
import { ActorRegistry } from "./ActorRegistry";
import type { AreaResource } from "./AreaRuntime";
import { getLatestActorVerseEcho } from "./ActorVerseEcho";
import { Character } from "./Character";
import {
  CORE_POSE_SHEETS,
  LAZARUS_SHEET,
  SUPPORTING_ACTION_SHEET,
} from "./CharacterAssets";
import {
  allCharacterSheets,
  actorSpriteCharacter,
  characterOriginY,
  lazarusFrame,
  lazarusScaleToFit,
  lazarusTextureKey,
  resolveFacing,
  spriteFrame,
  spriteSheet,
  spriteTextureKey,
  walkAnimationKey,
  walkFrames,
  type Facing,
  type SpriteCharacter,
} from "./CharacterSprites";
import {
  DEFAULT_DISPLAY_SCALE,
  applyLinearTextureFiltering,
  resolveDisplayMetrics,
} from "./DisplayScale";
import {
  HOUSE_ART,
  HOUSE_EXIT,
  HOUSE_FOREGROUND_PLACEMENTS,
  HOUSE_OBSTACLES,
  HOUSE_PLAYER_SPAWN,
  HOUSE_PROP_PLACEMENTS,
  HOUSE_SICK_LAZARUS_POSITION,
  HOUSE_SICK_LAZARUS_SIZE,
  HOUSE_STORY_FOCUS,
  type HouseArtPlacement,
} from "./EnvironmentAssets";
import {
  MapSequence,
  type MapSequenceDefinition,
  type MapSequenceOperation,
  type MapSequenceSchema,
  type MapSequenceStep,
} from "./MapSequence";
import { NavigationGrid, type Point, type Rectangle } from "./NavigationGrid";
import {
  createPhaserMapSequenceAdapters,
  type PhaserSequenceHost,
} from "./PhaserMapSequenceAdapter";
import { PlayerController } from "./PlayerController";
import {
  ACTOR_LABELS,
  FIND_JESUS_CONTRACT,
  JOHN_11_VERSES,
  RECALL_QUESTIONS,
  type RecallQuestion,
  type StoryActorId,
} from "./ScriptureContent";
import { StoryEngine } from "./StoryEngine";
import { TOMB_PROP_ASSETS } from "./TombAssets";
import type { ActorId, DialogueLine, MusicState } from "./types";
import {
  VERSE_BEATS,
  type VerseBeat,
  type VerseBeatId,
} from "./VerseBeats";
import { WorldRuntime, type WorldHost } from "./WorldRuntime";
import {
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_MAP_FALLBACK_URL,
  WORLD_MAP_SOURCE_KEY,
  WORLD_REGIONS,
  WORLD_ROUTES,
  WORLD_WIDTH,
} from "./WorldLayout";

const PLAYER_SPEED = 260;
const INTERACTION_DISTANCE = 125;
const EXTERIOR_CHARACTER_HEIGHT = DEFAULT_DISPLAY_SCALE.outdoorVisibleHeight;

const ACTOR_IDS = [
  "martha",
  "mary",
  "mourner",
  "mourner-woman",
  "jesus",
  "guide",
  "older-witness",
  "thomas",
  "older-disciple",
  "younger-disciple",
  "memory-carrier-bread",
  "memory-carrier-water",
  "memory-carrier-mud",
] as const satisfies readonly ActorId[];

const WORLD_ACTOR_POSITIONS: Readonly<Record<ActorId, Point>> = {
  martha: { x: 650, y: 1120 },
  mary: { x: 720, y: 1170 },
  mourner: { x: 900, y: 1020 },
  "mourner-woman": { x: 970, y: 1080 },
  guide: { x: 1030, y: 1040 },
  "older-witness": { x: 1100, y: 1080 },
  jesus: WORLD_LANDMARKS.jesusCamp,
  thomas: { x: 2360, y: 1270 },
  "older-disciple": { x: 2300, y: 1350 },
  "younger-disciple": { x: 2180, y: 1350 },
  "memory-carrier-bread": { x: 2100, y: 1160 },
  "memory-carrier-water": { x: 2260, y: 1130 },
  "memory-carrier-mud": { x: 2440, y: 1170 },
};

type SequenceActor = ActorId | "player" | "lazarus";
type EnvironmentState =
  | "none"
  | "wait-dusk"
  | "wait-day"
  | "stone-open"
  | "lazarus-emerge";
type CameraTarget = SequenceActor | Point;

interface BethanySequenceSchema extends MapSequenceSchema {
  readonly actor: SequenceActor;
  readonly point: Point;
  readonly facing: Facing;
  readonly ordinaryPose: "idle";
  readonly specialPose: "none";
  readonly cameraTarget: CameraTarget;
  readonly environment: EnvironmentState;
  readonly dialogue: readonly DialogueLine[];
  readonly choice: RecallQuestion;
  readonly music: MusicState;
  readonly finalState: VerseBeat["finalState"];
  readonly handoff: VerseBeat["handoff"];
  readonly finalize: VerseBeatId;
}

interface ActorVisual {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly character: SpriteCharacter;
  readonly label: ActorLabelController;
  facing: Facing;
}

const completedOperation = (): MapSequenceOperation => ({
  finished: Promise.resolve(),
  cancel: () => undefined,
});

const isPoint = (target: CameraTarget): target is Point =>
  typeof target === "object" && "x" in target && "y" in target;

const dialogueSpeaker = (verse: number): string => {
  if ([4, 7, 9, 10, 11, 14, 15, 23, 25, 26, 34, 35, 39, 40, 41, 42, 43].includes(verse)) {
    return "耶稣";
  }
  if ([21, 22, 24, 27, 39].includes(verse)) {
    return "马大";
  }
  if ([28].includes(verse)) {
    return "马大";
  }
  if ([32].includes(verse)) {
    return "马利亚";
  }
  if (verse === 16) {
    return "多马";
  }
  if ([8, 12].includes(verse)) {
    return "门徒";
  }
  if ([34, 36, 37].includes(verse)) {
    return "众人";
  }
  if (verse === 3) {
    return "姐妹二人";
  }
  return "经文";
};

export class BethanyScene extends Phaser.Scene {
  private story = new StoryEngine();
  private actorRegistry = new ActorRegistry();
  private playerController = new PlayerController();
  private readonly visuals = new Map<ActorId, ActorVisual>();
  private readonly labelTexts = new Map<ActorId, string | null>();

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
  private worldRuntime?: WorldRuntime;
  private sequence?: MapSequence<BethanySequenceSchema>;
  private navigation?: NavigationGrid;
  private movementPath: Point[] = [];
  private pendingActor?: ActorId;
  private nearestActor?: ActorId;
  private started = false;
  private inWorld = false;
  private paused = false;
  private sequenceStarting = false;
  private playerFacing: Facing = "front";
  private resources: AreaResource[] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private daylightOverlay?: Phaser.GameObjects.Rectangle;
  private stone?: Phaser.GameObjects.Image;
  private lazarus?: Phaser.GameObjects.Sprite;
  private lazarusLabel?: ActorLabelController;

  constructor() {
    super("bethany");
  }

  preload(): void {
    this.load.image(HOUSE_ART.base.key, HOUSE_ART.base.path);
    this.load.spritesheet(HOUSE_ART.foreground.key, HOUSE_ART.foreground.path, {
      frameWidth: HOUSE_ART.foreground.frameWidth,
      frameHeight: HOUSE_ART.foreground.frameHeight,
    });
    this.load.spritesheet(HOUSE_ART.props.key, HOUSE_ART.props.path, {
      frameWidth: HOUSE_ART.props.frameWidth,
      frameHeight: HOUSE_ART.props.frameHeight,
    });
    this.load.image(WORLD_MAP_SOURCE_KEY, WORLD_MAP_FALLBACK_URL);
    for (const asset of Object.values(TOMB_PROP_ASSETS)) {
      this.load.image(asset.key, asset.path);
    }
    for (const sheet of [
      ...allCharacterSheets(),
      ...Object.values(CORE_POSE_SHEETS),
      SUPPORTING_ACTION_SHEET,
      LAZARUS_SHEET,
    ]) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }

  create(): void {
    const ui = this.registry.get("ui");
    const audio = this.registry.get("audio");
    if (!(ui instanceof GameUI) || !(audio instanceof AudioManager)) {
      throw new Error("Bethany scene requires initialized UI and audio services.");
    }
    this.ui = ui;
    this.audio = audio;
    applyLinearTextureFiltering({
      linearMode: Phaser.Textures.FilterMode.LINEAR,
      textureKeys: this.textures.getTextureKeys(),
      setFilter: (textureKey, filterMode) =>
        this.textures.get(textureKey).setFilter(filterMode),
    });
    this.createWalkAnimations();
    this.createPlayer();
    this.registerActors();
    this.worldRuntime = new WorldRuntime(this.createWorldHost());
    this.sequence = new MapSequence(
      createPhaserMapSequenceAdapters(this.createSequenceHost()),
    );
    this.enterHouse();
    this.configureInput();
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.game.events.on("start-story", this.startStory, this);
    this.registry.set("bethany-ready", true);
    this.game.events.emit("bethany-ready");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.set("bethany-ready", false);
      this.game.events.off("start-story", this.startStory, this);
      void this.sequence?.dispose();
      this.worldRuntime?.cleanup();
      this.clearSceneResources();
      this.clearActorVisuals();
    });
  }

  update(): void {
    if (!this.canAcceptPlayerInput()) {
      this.player.setVelocity(0);
      this.updatePlayerAnimation(0, 0);
      this.ui.setInteractionPrompt(false);
      return;
    }

    this.updateMovement();
    this.updateNearestActor();
    this.tryProximityBeat();
    this.tryHouseExit();
    this.updateDepths();
  }

  private startStory(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.ui.showGameHud();
    this.syncHud();
    this.audio.setState("exploration", 900);
    this.cameras.main.fadeIn(450, 20, 18, 14);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      0,
      0,
      spriteTextureKey("messenger"),
      spriteFrame("messenger", this.playerFacing, "idle"),
    );
    this.applyActorScale(this.player, "messenger", "indoor");
    this.player
      .setOrigin(0.5, characterOriginY("messenger"))
      .setCollideWorldBounds(true)
      .setBodySize(72, 60)
      .setOffset(44, 150);
  }

  private registerActors(): void {
    for (const id of ACTOR_IDS) {
      this.actorRegistry.register(
        new Character(
          id,
          ACTOR_LABELS[id] ?? FIND_JESUS_CONTRACT.temporaryLabel,
          "lazarus-house",
          { x: 0, y: 0 },
          false,
        ),
      );
      this.labelTexts.set(id, ACTOR_LABELS[id]);
    }
  }

  private enterHouse(): void {
    this.inWorld = false;
    this.clearSceneResources();
    this.clearActorVisuals();
    this.physics.world.setBounds(0, 0, HOUSE_ART.width, HOUSE_ART.height);
    this.cameras.main.setBounds(0, 0, HOUSE_ART.width, HOUSE_ART.height);
    this.createHouseBackground();
    this.resources.push(...HOUSE_OBSTACLES.map((obstacle) => this.createObstacle(obstacle)));
    this.navigation = new NavigationGrid(
      HOUSE_ART.width,
      HOUSE_ART.height,
      40,
      HOUSE_OBSTACLES,
    );
    this.actorRegistry.hideAll();
    this.placeActor("martha", { x: 690, y: 455 }, true);
    this.placeActor("mary", { x: 705, y: 535 }, true);
    this.player.setPosition(HOUSE_PLAYER_SPAWN.x, HOUSE_PLAYER_SPAWN.y);
    this.applyActorScale(this.player, "messenger", "indoor");
    this.createSickLazarus();
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  private enterWorld(): void {
    this.inWorld = true;
    this.clearSceneResources();
    this.clearActorVisuals();
    this.worldRuntime?.activate();
    this.actorRegistry.hideAll();
    for (const id of ACTOR_IDS) {
      this.placeActor(id, WORLD_ACTOR_POSITIONS[id], true);
    }
    this.player.setPosition(
      WORLD_LANDMARKS.jesusCamp.x - 440,
      WORLD_LANDMARKS.jesusCamp.y + 80,
    );
    this.applyActorScale(this.player, "messenger", "outdoor");
    this.applyBeatPresentation(this.story.beatId, false);
    this.stopPlayerMovement();
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  private createWorldHost(): WorldHost {
    return {
      setBounds: (width, height) => {
        this.physics.world.setBounds(0, 0, width, height);
        this.cameras.main.setBounds(0, 0, width, height);
      },
      createWorldSource: () => this.createWorldSource(),
      createObstacle: (obstacle) => this.createObstacle(obstacle),
      setNavigation: (navigation) => {
        this.navigation = navigation;
      },
    };
  }

  private createWorldSource(): AreaResource {
    const texture = this.textures.get(WORLD_MAP_SOURCE_KEY);
    const halfWidth = WORLD_WIDTH / 2;
    const halfHeight = WORLD_HEIGHT / 2;
    const frames = [
      { name: "world-nw", x: 0, y: 0 },
      { name: "world-ne", x: halfWidth, y: 0 },
      { name: "world-sw", x: 0, y: halfHeight },
      { name: "world-se", x: halfWidth, y: halfHeight },
    ] as const;
    const container = this.add.container(0, 0).setDepth(-50);
    for (const frame of frames) {
      if (!texture.has(frame.name)) {
        texture.add(
          frame.name,
          0,
          frame.x,
          frame.y,
          halfWidth,
          halfHeight,
        );
      }
      container.add(
        this.add
          .image(
            frame.x + halfWidth / 2,
            frame.y + halfHeight / 2,
            WORLD_MAP_SOURCE_KEY,
            frame.name,
          )
          .setDisplaySize(halfWidth, halfHeight),
      );
    }
    const compound = WORLD_REGIONS.marthaCompound;
    const courtyard = this.add
      .rectangle(
        compound.x + compound.width / 2,
        compound.y + compound.height / 2,
        compound.width,
        compound.height,
        0x514638,
        0.16,
      )
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(-45);
    const houseShadow = this.add
      .ellipse(480, 1130, 520, 180, 0x1e1a15, 0.2)
      .setDepth(-44);
    this.daylightOverlay = this.add
      .rectangle(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        0x25314c,
        0,
      )
      .setDepth(100000);
    return {
      destroy: () => {
        container.destroy();
        courtyard.destroy();
        houseShadow.destroy();
        this.daylightOverlay?.destroy();
        this.daylightOverlay = undefined;
      },
    };
  }

  private createHouseBackground(): void {
    const base = this.add
      .rectangle(
        HOUSE_ART.width / 2,
        HOUSE_ART.height / 2,
        HOUSE_ART.width,
        HOUSE_ART.height,
        0x4f4435,
      )
      .setDepth(-50);
    const art = this.add
      .image(HOUSE_ART.width / 2, HOUSE_ART.height / 2, HOUSE_ART.base.key)
      .setDisplaySize(HOUSE_ART.width, HOUSE_ART.height)
      .setDepth(-48);
    this.decorations.push(base, art);
    for (const placement of [
      ...HOUSE_FOREGROUND_PLACEMENTS,
      ...HOUSE_PROP_PLACEMENTS,
    ]) {
      this.decorations.push(this.createHouseArtPlacement(placement));
    }
  }

  private createHouseArtPlacement(
    placement: HouseArtPlacement,
  ): Phaser.GameObjects.Image {
    const atlas = HOUSE_ART[placement.atlas];
    const centerX =
      placement.sourceBounds.x + placement.sourceBounds.width / 2;
    const bottomY =
      placement.sourceBounds.y + placement.sourceBounds.height;
    return this.add
      .image(
        placement.anchor.x -
          (centerX - atlas.frameWidth / 2) * placement.scale,
        placement.anchor.y -
          (bottomY - atlas.frameHeight / 2) * placement.scale,
        atlas.key,
        placement.frame,
      )
      .setScale(placement.scale)
      .setDepth(placement.depth);
  }

  private createSickLazarus(): void {
    this.lazarus = this.add
      .sprite(
        HOUSE_SICK_LAZARUS_POSITION.x,
        HOUSE_SICK_LAZARUS_POSITION.y,
        lazarusTextureKey(),
        lazarusFrame("sick"),
      )
      .setScale(lazarusScaleToFit("sick", HOUSE_SICK_LAZARUS_SIZE))
      .setDepth(HOUSE_STORY_FOCUS.y - 1);
    this.lazarusLabel = createActorLabel(this, this.lazarus, {
      text: ACTOR_LABELS.lazarus ?? "拉撒路",
      resolveVisibility: () => Boolean(this.lazarus?.visible),
    });
    this.decorations.push(this.lazarus);
  }

  private createTombElements(): void {
    if (this.stone?.active) {
      return;
    }
    const entrance = WORLD_LANDMARKS.tombEntrance;
    this.stone = this.add
      .image(entrance.x + 40, entrance.y, TOMB_PROP_ASSETS.stone.key)
      .setDisplaySize(120, 120)
      .setDepth(entrance.y + 20);
    this.lazarus = this.add
      .sprite(
        entrance.x,
        entrance.y + 15,
        lazarusTextureKey(),
        lazarusFrame("wrapped-idle"),
      )
      .setScale(
        lazarusScaleToFit("wrapped-idle", {
          width: EXTERIOR_CHARACTER_HEIGHT,
          height: EXTERIOR_CHARACTER_HEIGHT,
        }),
      )
      .setOrigin(0.5, 535 / LAZARUS_SHEET.frameHeight)
      .setDepth(entrance.y + 10)
      .setVisible(false);
    this.lazarusLabel = createActorLabel(this, this.lazarus, {
      text: ACTOR_LABELS.lazarus ?? "拉撒路",
      resolveVisibility: () => Boolean(this.lazarus?.visible),
    });
    this.decorations.push(this.stone, this.lazarus);
  }

  private placeActor(id: ActorId, position: Point, visible: boolean): void {
    const area = this.inWorld ? "bethany-world" : "lazarus-house";
    this.actorRegistry.move(id, area, position);
    this.actorRegistry.setVisible(id, visible);
    if (visible) {
      this.createActorVisual(id);
    }
  }

  private createActorVisual(id: ActorId): void {
    const actor = this.actorRegistry.require(id).state;
    const character = actorSpriteCharacter(id);
    const facing: Facing = "front";
    const sprite = this.add
      .sprite(
        0,
        0,
        spriteTextureKey(character),
        spriteFrame(character, facing, "idle"),
      )
      .setOrigin(0.5, characterOriginY(character));
    this.applyActorScale(
      sprite,
      character,
      this.inWorld ? "outdoor" : "indoor",
    );
    const shadow = this.add.ellipse(
      0,
      0,
      Math.max(sprite.displayWidth * 0.72, 24),
      11,
      0x1c1814,
      0.32,
    );
    const container = this.add.container(actor.position.x, actor.position.y, [
      shadow,
      sprite,
    ]);
    container
      .setSize(sprite.displayWidth + 16, sprite.displayHeight + 24)
      .setInteractive({ useHandCursor: true })
      .on(
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
    const label = createActorLabel(this, container, {
      text: this.labelTexts.get(id) ?? "",
      resolveVisibility: () =>
        container.visible && Boolean(this.labelTexts.get(id)),
    });
    this.visuals.set(id, { container, sprite, character, label, facing });
  }

  private applyActorScale(
    sprite: Phaser.GameObjects.Sprite,
    character: SpriteCharacter,
    area: "indoor" | "outdoor",
  ): void {
    const sheet = spriteSheet(character);
    const metrics = resolveDisplayMetrics(DEFAULT_DISPLAY_SCALE, {
      kind: "base-sheet",
      area,
      sourceBounds: { width: sheet.frameWidth, height: sheet.frameHeight },
    });
    sprite.setScale(metrics.scale);
  }

  private applyBeatPresentation(
    beatId: VerseBeatId,
    finalState: boolean,
  ): void {
    const beat = VERSE_BEATS.find((candidate) => candidate.id === beatId);
    if (!beat) {
      throw new Error(`Missing beat ${beatId}.`);
    }
    const snapshot =
      finalState || !beat.duringBeatActors
        ? beat.finalState.actors
        : beat.duringBeatActors;
    for (const id of ACTOR_IDS) {
      const visible = snapshot.visibleActorIds.includes(id);
      this.setActorVisible(id, visible);
      const override = snapshot.labelOverrides?.[id];
      const label = override === undefined ? ACTOR_LABELS[id] : override;
      this.setActorLabel(id, label);
    }
  }

  private setActorLabel(id: ActorId, label: string | null): void {
    this.labelTexts.set(id, label);
    this.visuals.get(id)?.label.updateText(label ?? "");
  }

  private setActorVisible(id: ActorId, visible: boolean): void {
    this.actorRegistry.setVisible(id, visible);
    let visual = this.visuals.get(id);
    if (visible && !visual) {
      this.createActorVisual(id);
      visual = this.visuals.get(id);
    }
    visual?.container.setVisible(visible);
  }

  private clearActorVisuals(): void {
    for (const visual of this.visuals.values()) {
      visual.label.destroy();
      visual.container.destroy();
    }
    this.visuals.clear();
  }

  private clearSceneResources(): void {
    for (const resource of this.resources) {
      resource.destroy();
    }
    this.resources = [];
    for (const decoration of this.decorations) {
      decoration.destroy();
    }
    this.decorations = [];
    this.lazarusLabel?.destroy();
    this.lazarusLabel = undefined;
    this.lazarus = undefined;
    this.stone = undefined;
  }

  private createObstacle(obstacle: Rectangle): AreaResource {
    const body = this.add
      .rectangle(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width,
        obstacle.height,
        0,
        0,
      )
      .setDepth(-20);
    this.physics.add.existing(body, true);
    const collider = this.physics.add.collider(this.player, body);
    return {
      destroy: () => {
        collider.destroy();
        body.destroy();
      },
    };
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
      if (event.repeat) {
        return;
      }
      if (this.sequence?.isRunning) {
        this.ui.dismissBlocking();
        this.sequence.requestSkip();
        return;
      }
      if (this.ui.advanceDialogue() || this.ui.isChoiceOpen()) {
        return;
      }
      this.interactWithNearestActor();
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

  private canAcceptPlayerInput(): boolean {
    return (
      this.started &&
      !this.paused &&
      !this.ui.isBlockingOpen() &&
      !this.playerController.isLocked &&
      !this.sequenceStarting
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
      this.player.setVelocity(
        direction.x * PLAYER_SPEED,
        direction.y * PLAYER_SPEED,
      );
      this.updatePlayerAnimation(direction.x, direction.y);
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
        this.updatePlayerAnimation(0, 0);
      } else {
        this.physics.moveTo(this.player, waypoint.x, waypoint.y, PLAYER_SPEED);
        this.updatePlayerAnimation(
          waypoint.x - this.player.x,
          waypoint.y - this.player.y,
        );
      }
      return;
    }
    this.player.setVelocity(0);
    this.updatePlayerAnimation(0, 0);
    if (this.pendingActor) {
      const target = this.visuals.get(this.pendingActor)?.container;
      if (target) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          target.x,
          target.y,
        );
        if (distance <= INTERACTION_DISTANCE) {
          const actor = this.pendingActor;
          this.pendingActor = undefined;
          this.handleActorInteraction(actor);
        }
      }
    }
  }

  private setMovementPath(target: Point): void {
    const path = this.navigation?.findPath(
      { x: this.player.x, y: this.player.y },
      target,
    );
    if (!path || path.length === 0) {
      this.movementPath = [];
      this.ui.showTechnicalError("目标点不可达。", "unreachable", 1800);
      return;
    }
    this.movementPath = path;
  }

  private eligibleActors(): readonly ActorId[] {
    return ACTOR_IDS.filter((id) => this.visuals.get(id)?.container.visible);
  }

  private updateNearestActor(): void {
    let nearest: ActorId | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const id of this.eligibleActors()) {
      const visual = this.visuals.get(id);
      if (!visual) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        visual.container.x,
        visual.container.y,
      );
      if (distance <= INTERACTION_DISTANCE && distance < nearestDistance) {
        nearest = id;
        nearestDistance = distance;
      }
    }
    this.nearestActor = nearest;
    this.ui.setInteractionPrompt(nearest !== undefined);
  }

  private moveTowardActor(id: ActorId): void {
    if (!this.canAcceptPlayerInput()) {
      return;
    }
    const visual = this.visuals.get(id);
    if (!visual?.container.visible) {
      return;
    }
    this.pendingActor = id;
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      visual.container.x,
      visual.container.y,
    );
    if (distance <= INTERACTION_DISTANCE) {
      this.pendingActor = undefined;
      this.handleActorInteraction(id);
      return;
    }
    this.setMovementPath({
      x: visual.container.x,
      y: visual.container.y + 72,
    });
  }

  private interactWithNearestActor(): void {
    if (this.canAcceptPlayerInput() && this.nearestActor) {
      this.handleActorInteraction(this.nearestActor);
    }
  }

  private handleActorInteraction(id: ActorId): void {
    this.stopPlayerMovement();
    if (this.story.beatId === "find-jesus") {
      this.handleFindJesus(id);
      return;
    }
    if (this.story.canTrigger(id)) {
      void this.runActiveBeat();
      return;
    }
    this.showActorEcho(id);
  }

  private handleFindJesus(id: ActorId): void {
    if (
      id !== "jesus" &&
      !FIND_JESUS_CONTRACT.clueCarrierIds.includes(
        id as (typeof FIND_JESUS_CONTRACT.clueCarrierIds)[number],
      )
    ) {
      this.showActorEcho(id);
      return;
    }
    const result = this.story.identifyJesus(id);
    if (result.kind === "identified") {
      void this.runActiveBeat();
      return;
    }
    const visual = this.visuals.get(id);
    if (!visual) {
      return;
    }
    this.ui.showVerseEcho({
      mode: "player-memory",
      text: `${result.memory.text}\n\n${result.memory.followUp.text}`,
      reference: result.memory.references.join("、"),
      anchor: this.screenAnchor(visual.container),
    });
  }

  private showActorEcho(id: ActorId): void {
    const completedThrough = this.story.completedBeatIds.at(-1);
    if (!completedThrough) {
      return;
    }
    const echo = getLatestActorVerseEcho(
      id as StoryActorId,
      completedThrough,
    );
    const visual = this.visuals.get(id);
    if (!echo || !visual) {
      return;
    }
    this.ui.showVerseEcho({
      mode: "npc-scripture",
      speaker: ACTOR_LABELS[id] ?? "",
      text: echo.text,
      reference: echo.references.join("、"),
      anchor: this.screenAnchor(visual.container),
    });
  }

  private screenAnchor(object: Phaser.GameObjects.Components.Transform): Point {
    const canvas = this.game.canvas.getBoundingClientRect();
    return {
      x: canvas.left + (object.x - this.cameras.main.worldView.x),
      y: canvas.top + (object.y - this.cameras.main.worldView.y) - 90,
    };
  }

  private tryProximityBeat(): void {
    if (
      this.story.beatId === "illness" &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        HOUSE_STORY_FOCUS.x,
        HOUSE_STORY_FOCUS.y,
      ) <= 155
    ) {
      void this.runActiveBeat();
    }
  }

  private tryHouseExit(): void {
    if (
      !this.inWorld &&
      this.story.beatId === "find-jesus" &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        HOUSE_EXIT.x,
        HOUSE_EXIT.y,
      ) <= 82
    ) {
      this.enterWorld();
    }
  }

  private async runActiveBeat(): Promise<void> {
    if (this.sequenceStarting || this.sequence?.isRunning) {
      return;
    }
    const beat = this.story.beat;
    this.sequenceStarting = true;
    this.stopPlayerMovement();
    try {
      const definition = this.sequenceDefinition(beat);
      await this.sequence?.run(definition);
      if (this.story.isComplete) {
        this.finishStory();
        return;
      }
      this.syncHud();
      if (beat.id === "sisters-send" && !this.inWorld) {
        this.enterWorld();
      }
      const next = this.story.beat;
      if (
        beat.handoff.mode === "automatic" &&
        ["automatic", "arrival", "recall-question"].includes(next.trigger.kind)
      ) {
        this.sequenceStarting = false;
        await this.runActiveBeat();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "未知的演出错误。";
      this.ui.showTechnicalError(message, "transition");
    } finally {
      this.sequenceStarting = false;
    }
  }

  private sequenceDefinition(
    beat: VerseBeat,
  ): MapSequenceDefinition<BethanySequenceSchema> {
    const steps: MapSequenceStep<BethanySequenceSchema>[] = [
      { kind: "camera-stop-follow" },
      {
        kind: "camera-pan",
        target: this.beatFocus(beat.id),
        durationMs: 450,
      },
      { kind: "music", state: "dialogue", durationMs: 700 },
    ];
    if (beat.recallBeforeReveal.kind === "required") {
      steps.push({
        kind: "choice",
        choice: RECALL_QUESTIONS[beat.recallBeforeReveal.questionId],
      });
    }
    steps.push(...this.actionSteps(beat.id));
    const dialogue = this.dialogueForBeat(beat);
    if (dialogue.length > 0) {
      steps.push({ kind: "dialogue", dialogue });
    }
    steps.push(
      { kind: "music", state: "exploration", durationMs: 900 },
      { kind: "camera-follow", target: "player" },
    );
    return {
      steps,
      finalState: beat.finalState,
      handoff: beat.handoff,
      finalize: beat.id,
    };
  }

  private actionSteps(
    beatId: VerseBeatId,
  ): readonly MapSequenceStep<BethanySequenceSchema>[] {
    const move = (
      actor: SequenceActor,
      points: readonly Point[],
      durationMs = 700,
    ): MapSequenceStep<BethanySequenceSchema> => ({
      kind: "move",
      actor,
      points: points.map((point) => ({ point, durationMs })),
    });
    switch (beatId) {
      case "two-day-wait":
        return [
          { kind: "environment", state: "wait-dusk", durationMs: 900 },
          { kind: "camera-hold", durationMs: 700 },
          { kind: "environment", state: "wait-day", durationMs: 900 },
        ];
      case "thomas":
        return [
          {
            kind: "parallel",
            branches: [
              [move("jesus", WORLD_ROUTES.campToMeeting.points)],
              [move("thomas", WORLD_ROUTES.campToMeeting.points)],
              [move("older-disciple", WORLD_ROUTES.campToMeeting.points)],
              [move("younger-disciple", WORLD_ROUTES.campToMeeting.points)],
              [move("player", WORLD_ROUTES.campToMeeting.points)],
            ],
          },
        ];
      case "martha-goes":
        return [move("martha", [WORLD_LANDMARKS.bethanyMeeting], 1100)];
      case "martha-calls":
        return [move("martha", [WORLD_LANDMARKS.villageCenter], 1100)];
      case "mary-rises":
        return [
          {
            kind: "parallel",
            branches: [
              [move("mary", [WORLD_LANDMARKS.bethanyMeeting], 1200)],
              [move("mourner", [WORLD_LANDMARKS.bethanyMeeting], 1200)],
              [
                move(
                  "mourner-woman",
                  [{ x: WORLD_LANDMARKS.bethanyMeeting.x + 60, y: WORLD_LANDMARKS.bethanyMeeting.y + 50 }],
                  1200,
                ),
              ],
              [
                move(
                  "older-witness",
                  [{ x: WORLD_LANDMARKS.bethanyMeeting.x - 60, y: WORLD_LANDMARKS.bethanyMeeting.y + 50 }],
                  1200,
                ),
              ],
            ],
          },
        ];
      case "come-and-see":
        return [
          {
            kind: "parallel",
            branches: [
              [move("jesus", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("martha", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("mary", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("mourner", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("mourner-woman", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("guide", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("older-witness", WORLD_ROUTES.villageToTomb.points, 600)],
              [move("player", WORLD_ROUTES.villageToTomb.points, 600)],
            ],
          },
        ];
      case "stone-and-prayer":
        return [{ kind: "environment", state: "stone-open", durationMs: 1000 }];
      case "call-and-emergence":
        return [
          { kind: "environment", state: "lazarus-emerge", durationMs: 1500 },
        ];
      case "responses":
        return [
          {
            kind: "parallel",
            branches: [
              [
                move(
                  "guide",
                  [{ x: WORLD_LANDMARKS.tombGarden.x - 300, y: WORLD_LANDMARKS.tombGarden.y + 180 }],
                  900,
                ),
              ],
              [
                move(
                  "older-witness",
                  [{ x: WORLD_LANDMARKS.tombGarden.x + 300, y: WORLD_LANDMARKS.tombGarden.y + 180 }],
                  900,
                ),
              ],
            ],
          },
        ];
      default:
        return [];
    }
  }

  private dialogueForBeat(beat: VerseBeat): readonly DialogueLine[] {
    return beat.verseKeys.map((key) => {
      const verse = JOHN_11_VERSES[key];
      return {
        speaker: dialogueSpeaker(verse.verse),
        text: verse.text,
        reference: verse.reference,
        kind: "scripture" as const,
      };
    });
  }

  private beatFocus(beatId: VerseBeatId): CameraTarget {
    if (["illness", "sisters-send"].includes(beatId)) {
      return HOUSE_STORY_FOCUS;
    }
    if (
      [
        "find-jesus",
        "message",
        "two-day-wait",
        "return-to-judea",
        "thomas",
      ].includes(beatId)
    ) {
      return "jesus";
    }
    if (
      [
        "four-days",
        "martha-goes",
        "martha-hope",
        "resurrection-life",
        "martha-confession",
        "martha-calls",
        "mary-rises",
        "mary-at-feet",
        "jesus-weeps",
      ].includes(beatId)
    ) {
      return WORLD_LANDMARKS.bethanyMeeting;
    }
    return WORLD_LANDMARKS.tombGarden;
  }

  private createSequenceHost(): PhaserSequenceHost<BethanySequenceSchema> {
    return {
      moveActor: (actor, point, durationMs) =>
        this.tweenActor(actor, point, durationMs),
      setActorFacing: (actor, facing) => this.setSequenceFacing(actor, facing),
      setActorOrdinaryPose: () => undefined,
      setActorSpecialPose: () => undefined,
      setActorVisible: (actor, visible) =>
        this.setSequenceActorVisible(actor, visible),
      stopCameraFollow: () => this.cameras.main.stopFollow(),
      panCamera: (target, durationMs) =>
        this.panCameraTo(target, durationMs),
      followCamera: (target) => {
        if (target === "player") {
          this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
        }
      },
      wait: (durationMs) => this.delayOperation(durationMs),
      transitionEnvironment: (state, durationMs) =>
        this.environmentOperation(state, durationMs),
      showDialogue: (dialogue) => this.dialogueOperation(dialogue),
      showChoice: (choice) => this.choiceOperation(choice),
      setMusic: (state, durationMs) => {
        this.audio.setState(state, durationMs);
        return completedOperation();
      },
      applyFinalState: (state) => this.applySequenceFinalState(state),
      handoff: () => undefined,
      finalize: (beatId) => {
        this.story.completeCurrent(beatId);
      },
      acquireInputLock: () => this.playerController.lock(),
    };
  }

  private tweenActor(
    actor: SequenceActor,
    point: Point,
    durationMs: number,
  ): MapSequenceOperation {
    const target = this.sequenceTarget(actor);
    if (!target) {
      return completedOperation();
    }
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const tween = this.tweens.add({
      targets: target,
      x: point.x,
      y: point.y,
      duration: durationMs,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        if (actor !== "player" && actor !== "lazarus") {
          this.actorRegistry.move(actor, "bethany-world", {
            x: target.x,
            y: target.y,
          });
        }
      },
      onComplete: () => {
        settled = true;
        resolveFinished();
      },
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          tween.stop();
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private panCameraTo(
    target: CameraTarget,
    durationMs: number,
  ): MapSequenceOperation {
    const point = isPoint(target)
      ? target
      : this.sequenceTarget(target) ?? this.player;
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
      this.cameras.main.pan(
        point.x,
        point.y,
        durationMs,
        "Sine.easeInOut",
        false,
        (_camera, progress) => {
          if (progress === 1 && !settled) {
            settled = true;
            resolve();
          }
        },
      );
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          this.cameras.main.panEffect.reset();
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private delayOperation(durationMs: number): MapSequenceOperation {
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const timer = this.time.delayedCall(durationMs, () => {
      settled = true;
      resolveFinished();
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          timer.remove(false);
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private environmentOperation(
    state: EnvironmentState,
    durationMs: number,
  ): MapSequenceOperation {
    if (state === "stone-open") {
      this.createTombElements();
      const stone = this.stone;
      if (!stone) {
        return completedOperation();
      }
      return this.tweenGameObject(
        stone,
        { x: stone.x + 150, angle: 32 },
        durationMs,
      );
    }
    if (state === "lazarus-emerge") {
      this.createTombElements();
      this.lazarus?.setVisible(true);
      const lazarus = this.lazarus;
      if (!lazarus) {
        return completedOperation();
      }
      return this.tweenGameObject(
        lazarus,
        {
          x: WORLD_LANDMARKS.tombGarden.x,
          y: WORLD_LANDMARKS.tombGarden.y + 130,
        },
        durationMs,
      );
    }
    if (state === "wait-dusk" || state === "wait-day") {
      const overlay = this.daylightOverlay;
      if (!overlay) {
        return this.delayOperation(durationMs);
      }
      return this.tweenGameObject(
        overlay,
        { alpha: state === "wait-dusk" ? 0.36 : 0 },
        durationMs,
      );
    }
    return this.delayOperation(durationMs);
  }

  private tweenGameObject(
    target: Phaser.GameObjects.GameObject,
    values: Record<string, number>,
    durationMs: number,
  ): MapSequenceOperation {
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const tween = this.tweens.add({
      targets: target,
      ...values,
      duration: durationMs,
      ease: "Sine.easeInOut",
      onComplete: () => {
        settled = true;
        resolveFinished();
      },
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          tween.stop();
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private dialogueOperation(
    dialogue: readonly DialogueLine[],
  ): MapSequenceOperation {
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
      this.ui.showDialogue(dialogue, () => {
        settled = true;
        resolve();
      });
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          this.ui.dismissBlocking();
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private choiceOperation(choice: RecallQuestion): MapSequenceOperation {
    let settled = false;
    let resolveFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
      this.ui.showChoice(
        {
          id: choice.id,
          prompt: choice.prompt,
          reference: choice.reference,
          correctOption: choice.correctOption,
          options: choice.options,
        },
        (optionId) => this.story.answerRecall(choice.id, optionId),
        () => {
          settled = true;
          this.ui.setScore(this.story.score);
          resolve();
        },
      );
    });
    return {
      finished,
      cancel: () => {
        if (!settled) {
          this.ui.dismissBlocking();
          settled = true;
          resolveFinished();
        }
      },
    };
  }

  private applySequenceFinalState(state: VerseBeat["finalState"]): void {
    const beatId = this.story.beatId;
    this.applyFinalPositions(beatId);
    for (const id of ACTOR_IDS) {
      const visible = state.actors.visibleActorIds.includes(id);
      this.setActorVisible(id, visible);
      const override = state.actors.labelOverrides?.[id];
      this.setActorLabel(
        id,
        override === undefined ? ACTOR_LABELS[id] : override,
      );
    }
    if (beatId === "tomb-arrival") {
      this.createTombElements();
    }
    if (beatId === "stone-and-prayer") {
      this.createTombElements();
      this.stone?.setPosition(
        WORLD_LANDMARKS.tombEntrance.x + 190,
        WORLD_LANDMARKS.tombEntrance.y,
      );
    }
    if (beatId === "call-and-emergence") {
      this.createTombElements();
      this.lazarus
        ?.setVisible(true)
        .setFrame(lazarusFrame("restored"))
        .setPosition(
          WORLD_LANDMARKS.tombGarden.x,
          WORLD_LANDMARKS.tombGarden.y + 130,
        );
    }
  }

  private applyFinalPositions(beatId: VerseBeatId): void {
    const meeting = WORLD_LANDMARKS.bethanyMeeting;
    const tomb = WORLD_LANDMARKS.tombGarden;
    if (beatId === "four-days") {
      this.setSequencePosition("jesus", meeting);
      this.setSequencePosition("thomas", { x: meeting.x + 120, y: meeting.y + 80 });
      this.setSequencePosition("older-disciple", { x: meeting.x + 180, y: meeting.y + 40 });
      this.setSequencePosition("younger-disciple", { x: meeting.x + 220, y: meeting.y + 100 });
      this.setSequencePosition("player", { x: meeting.x - 160, y: meeting.y + 120 });
    }
    if (beatId === "martha-goes") {
      this.setSequencePosition("martha", { x: meeting.x - 80, y: meeting.y + 40 });
    }
    if (beatId === "martha-calls") {
      this.setSequencePosition("martha", WORLD_LANDMARKS.villageCenter);
    }
    if (beatId === "mary-rises") {
      this.setSequencePosition("mary", { x: meeting.x - 80, y: meeting.y + 80 });
      this.setSequencePosition("mourner", { x: meeting.x - 170, y: meeting.y + 130 });
      this.setSequencePosition("mourner-woman", { x: meeting.x + 20, y: meeting.y + 140 });
      this.setSequencePosition("older-witness", { x: meeting.x + 100, y: meeting.y + 120 });
    }
    if (["come-and-see", "tomb-arrival"].includes(beatId)) {
      const actors: readonly SequenceActor[] = [
        "jesus",
        "martha",
        "mary",
        "mourner",
        "mourner-woman",
        "guide",
        "older-witness",
        "player",
      ];
      actors.forEach((actor, index) =>
        this.setSequencePosition(actor, {
          x: tomb.x - 220 + (index % 4) * 100,
          y: tomb.y + 180 + Math.floor(index / 4) * 90,
        }),
      );
    }
  }

  private sequenceTarget(
    actor: SequenceActor,
  ): Phaser.GameObjects.Components.Transform | undefined {
    if (actor === "player") {
      return this.player;
    }
    if (actor === "lazarus") {
      return this.lazarus;
    }
    return this.visuals.get(actor)?.container;
  }

  private setSequencePosition(actor: SequenceActor, position: Point): void {
    const target = this.sequenceTarget(actor);
    target?.setPosition(position.x, position.y);
    if (actor !== "player" && actor !== "lazarus") {
      this.actorRegistry.move(actor, "bethany-world", position);
    }
  }

  private setSequenceFacing(actor: SequenceActor, facing: Facing): void {
    if (actor === "player") {
      this.playerFacing = facing;
      this.player.setFrame(spriteFrame("messenger", facing, "idle"));
      return;
    }
    if (actor === "lazarus") {
      return;
    }
    const visual = this.visuals.get(actor);
    if (!visual) {
      return;
    }
    visual.facing = facing;
    visual.sprite.setFrame(spriteFrame(visual.character, facing, "idle"));
  }

  private setSequenceActorVisible(
    actor: SequenceActor,
    visible: boolean,
  ): void {
    if (actor === "player") {
      this.player.setVisible(visible);
    } else if (actor === "lazarus") {
      this.lazarus?.setVisible(visible);
    } else {
      this.setActorVisible(actor, visible);
    }
  }

  private syncHud(): void {
    const references = this.story.beat.verseKeys.map(
      (key) => JOHN_11_VERSES[key].reference,
    );
    this.ui.setReference(references.join("、") || "约翰福音");
    this.ui.setScore(this.story.score);
  }

  private finishStory(): void {
    this.stopPlayerMovement();
    this.ui.showResult(
      this.story.score,
      this.story.resultLabel(),
      () => window.location.reload(),
      () => window.location.reload(),
    );
  }

  private createWalkAnimations(): void {
    const walkingCharacters = [
      "messenger",
      "martha",
      "mary",
      "jesus",
    ] as const;
    for (const character of walkingCharacters) {
      for (const facing of ["front", "back", "left", "right"] as const) {
        const key = walkAnimationKey(character, facing);
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: Array.from(walkFrames(character, facing)),
            frameRate: 8,
            repeat: -1,
          });
        }
      }
    }
  }

  private updatePlayerAnimation(x: number, y: number): void {
    const facing = resolveFacing(x, y, this.playerFacing);
    this.playerFacing = facing;
    if (x === 0 && y === 0) {
      this.player.stop();
      this.player.setFrame(spriteFrame("messenger", facing, "idle"));
      return;
    }
    this.player.play(walkAnimationKey("messenger", facing), true);
  }

  private stopPlayerMovement(): void {
    this.movementPath = [];
    this.pendingActor = undefined;
    this.player.setVelocity(0);
    this.updatePlayerAnimation(0, 0);
  }

  private updateDepths(): void {
    this.player.setDepth(this.player.y);
    for (const visual of this.visuals.values()) {
      visual.container.setDepth(visual.container.y);
    }
    if (this.lazarus?.visible) {
      this.lazarus.setDepth(this.lazarus.y);
    }
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeGame();
      return;
    }
    this.paused = true;
    this.physics.world.pause();
    this.audio.pause("game");
    this.ui.showPause(
      () => this.resumeGame(),
      () => window.location.reload(),
      () => window.location.reload(),
    );
  }

  private resumeGame(): void {
    this.paused = false;
    this.physics.world.resume();
    this.audio.resume("game");
    this.ui.hidePause();
  }
}
