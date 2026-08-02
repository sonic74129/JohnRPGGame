export const FACINGS = ["front", "back", "left", "right"] as const;
export type Facing = (typeof FACINGS)[number];

export const WALK_POSES = ["idle", "step-left", "step-right"] as const;
export type WalkPose = (typeof WALK_POSES)[number];

export type CoreCharacter = "messenger" | "martha" | "mary" | "jesus";
export type DiscipleCharacter =
  | "thomas"
  | "older-disciple"
  | "younger-disciple";
export type WitnessCharacter =
  | "mourner-man"
  | "mourner-woman"
  | "guide"
  | "older-witness";
export type SupportingCharacter = DiscipleCharacter | WitnessCharacter;

interface SheetAsset {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

interface DirectionalSheetAsset extends SheetAsset {
  readonly rows: readonly Facing[];
  readonly sourceMirroredFacings: readonly Facing[];
  readonly footBaseline: number;
}

export const DIRECTIONAL_CHARACTER_SHEETS: Readonly<
  Record<CoreCharacter, DirectionalSheetAsset>
> = {
  messenger: {
    key: "character-messenger",
    path: "assets/art/characters/core/character__messenger/v3/run-001/character__messenger.png",
    frameWidth: 160,
    frameHeight: 208,
    rows: ["front", "back", "right", "left"],
    sourceMirroredFacings: ["left"],
    footBaseline: 201,
  },
  martha: {
    key: "character-martha",
    path: "assets/art/characters/core/character__martha/v3/run-001/character__martha.png",
    frameWidth: 96,
    frameHeight: 192,
    rows: ["front", "back", "right", "left"],
    sourceMirroredFacings: [],
    footBaseline: 185,
  },
  mary: {
    key: "character-mary",
    path: "assets/art/characters/core/character__mary/v3/run-001/character__mary.png",
    frameWidth: 120,
    frameHeight: 224,
    rows: ["front", "back", "right", "left"],
    sourceMirroredFacings: ["left"],
    footBaseline: 217,
  },
  jesus: {
    key: "character-jesus",
    path: "assets/art/characters/core/character__jesus/v3/run-001/character__jesus.png",
    frameWidth: 96,
    frameHeight: 200,
    rows: ["front", "back", "right", "left"],
    sourceMirroredFacings: ["left"],
    footBaseline: 193,
  },
};

const indexOf = (values: readonly string[], value: string): number => {
  const index = values.indexOf(value);
  if (index < 0) {
    throw new Error(`${value} is not present in the asset contract.`);
  }
  return index;
};

export const directionalFrame = (
  character: CoreCharacter,
  facing: Facing,
  pose: WalkPose,
): number => {
  const sheet = DIRECTIONAL_CHARACTER_SHEETS[character];
  return indexOf(sheet.rows, facing) * WALK_POSES.length + indexOf(WALK_POSES, pose);
};

interface SupportingSheetAsset extends SheetAsset {
  readonly rows: readonly SupportingCharacter[];
  readonly footBaseline: number;
}

export const SUPPORTING_CHARACTER_SHEETS = {
  disciples: {
    key: "character-disciples",
    path: "assets/art/character/character__disciples/v2/run-001/character__disciples.png",
    frameWidth: 128,
    frameHeight: 249,
    rows: ["thomas", "older-disciple", "younger-disciple"],
    footBaseline: 241,
  },
  witnesses: {
    key: "character-witnesses",
    path: "assets/art/character/character__witnesses/v2/run-001/character__witnesses.png",
    frameWidth: 133,
    frameHeight: 194,
    rows: ["mourner-man", "mourner-woman", "guide", "older-witness"],
    footBaseline: 186,
  },
} as const satisfies Record<string, SupportingSheetAsset>;

export const supportingSheet = (
  character: SupportingCharacter,
): (typeof SUPPORTING_CHARACTER_SHEETS)[keyof typeof SUPPORTING_CHARACTER_SHEETS] =>
  character === "thomas" ||
  character === "older-disciple" ||
  character === "younger-disciple"
    ? SUPPORTING_CHARACTER_SHEETS.disciples
    : SUPPORTING_CHARACTER_SHEETS.witnesses;

export const supportingFrame = (
  character: SupportingCharacter,
  facing: Facing,
): number => {
  const sheet = supportingSheet(character);
  return (
    indexOf(sheet.rows, character) * FACINGS.length + indexOf(FACINGS, facing)
  );
};

export const characterOriginY = (
  character: CoreCharacter | SupportingCharacter,
): number => {
  const sheet =
    character === "messenger" ||
    character === "martha" ||
    character === "mary" ||
    character === "jesus"
      ? DIRECTIONAL_CHARACTER_SHEETS[character]
      : supportingSheet(character);
  return sheet.footBaseline / sheet.frameHeight;
};

export const LAZARUS_POSES = [
  "sick",
  "wrapped-idle",
  "wrapped-step",
  "restored",
] as const;
export type LazarusPose = (typeof LAZARUS_POSES)[number];

export const LAZARUS_SHEET = {
  key: "character-lazarus",
  path: "assets/art/characters/core/character__lazarus/v1/run-001/character__lazarus.png",
  frameWidth: 400,
  frameHeight: 544,
} as const satisfies SheetAsset;

export const LAZARUS_CONTENT_BOUNDS: Readonly<
  Record<
    LazarusPose,
    {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly originY: number;
    }
  >
> = {
  sick: { x: 6, y: 183, width: 387, height: 176, originY: 0.5 },
  "wrapped-idle": {
    x: 122,
    y: 12,
    width: 155,
    height: 524,
    originY: 535 / 544,
  },
  "wrapped-step": {
    x: 102,
    y: 30,
    width: 196,
    height: 503,
    originY: 535 / 544,
  },
  restored: {
    x: 109,
    y: 9,
    width: 181,
    height: 526,
    originY: 535 / 544,
  },
};

export const lazarusFrame = (pose: LazarusPose): number =>
  indexOf(LAZARUS_POSES, pose);

export const lazarusScaleToFit = (
  pose: LazarusPose,
  maximum: { readonly width: number; readonly height: number },
): number => {
  const bounds = LAZARUS_CONTENT_BOUNDS[pose];
  return Math.min(maximum.width / bounds.width, maximum.height / bounds.height);
};

export const CORE_POSES = {
  martha: [
    "care",
    "worried-idle",
    "purposeful-walk",
    "quiet-call",
    "calm-conviction",
  ],
  mary: [
    "care",
    "urgent-rise",
    "quick-walk",
    "kneeling-grief",
    "quiet-weeping",
  ],
  jesus: [
    "listening",
    "calm-speaking",
    "visible-grief",
    "restrained-prayer",
    "authoritative-call",
  ],
} as const;

export type CorePoseCharacter = keyof typeof CORE_POSES;
export type CorePoseFor<Character extends CorePoseCharacter> =
  (typeof CORE_POSES)[Character][number];
export type CorePose = CorePoseFor<CorePoseCharacter>;

export const CORE_POSE_SHEETS: Readonly<
  Record<CorePoseCharacter, SheetAsset>
> = {
  martha: {
    key: "pose-martha",
    path: "assets/art/characters/core/pose__martha/v2/run-001/pose__martha.png",
    frameWidth: 280,
    frameHeight: 552,
  },
  mary: {
    key: "pose-mary",
    path: "assets/art/characters/core/pose__mary/v2/run-001/pose__mary.png",
    frameWidth: 260,
    frameHeight: 456,
  },
  jesus: {
    key: "pose-jesus",
    path: "assets/art/characters/core/pose__jesus/v2/run-001/pose__jesus.png",
    frameWidth: 304,
    frameHeight: 576,
  },
};

export const corePoseFrame = (
  character: CorePoseCharacter,
  pose: CorePose,
): number => indexOf(CORE_POSES[character], pose);

export const CORE_POSE_BASELINES: Readonly<
  Record<CorePoseCharacter, number>
> = {
  martha: 543,
  mary: 447,
  jesus: 565,
};

export const corePoseOriginY = (character: CorePoseCharacter): number =>
  CORE_POSE_BASELINES[character] / CORE_POSE_SHEETS[character].frameHeight;

export const SUPPORTING_ACTION_FRAMES = {
  "thomas-listening": 3,
  "stone-moving": 7,
} as const;
export type SupportingAction = keyof typeof SUPPORTING_ACTION_FRAMES;
export const SUPPORTING_ACTIONS = [
  "thomas-listening",
  "stone-moving",
] as const satisfies readonly SupportingAction[];

export const SUPPORTING_ACTION_SHEET = {
  key: "pose-disciples-witnesses",
  path: "assets/art/special-pose/pose__disciples-witnesses/v3/run-001/pose__disciples-witnesses.png",
  frameWidth: 389,
  frameHeight: 268,
} as const satisfies SheetAsset;

export const supportingActionFrame = (action: SupportingAction): number =>
  SUPPORTING_ACTION_FRAMES[action];

export const PORTRAIT_ASSETS = {
  "martha-worried":
    "assets/art/portrait/portrait__martha-worried/v1/run-001/portrait__martha-worried.png",
  "martha-grieving":
    "assets/art/portrait/portrait__martha-grieving/v1/run-001/portrait__martha-grieving.png",
  "martha-faith":
    "assets/art/portrait/portrait__martha-faith/v1/run-001/portrait__martha-faith.png",
  "mary-worried":
    "assets/art/portrait/portrait__mary-worried/v1/run-001/portrait__mary-worried.png",
  "mary-urgent":
    "assets/art/portrait/portrait__mary-urgent/v1/run-001/portrait__mary-urgent.png",
  "mary-grieving":
    "assets/art/portrait/portrait__mary-grieving/v1/run-001/portrait__mary-grieving.png",
  "jesus-listening":
    "assets/art/portrait/portrait__jesus-listening/v1/run-001/portrait__jesus-listening.png",
  "jesus-declaration":
    "assets/art/portrait/portrait__jesus-declaration/v1/run-001/portrait__jesus-declaration.png",
  "jesus-weeping":
    "assets/art/portrait/portrait__jesus-weeping/v1/run-001/portrait__jesus-weeping.png",
  messenger:
    "assets/art/portrait/portrait__messenger/v1/run-001/portrait__messenger.png",
  thomas:
    "assets/art/portrait/portrait__thomas/v1/run-001/portrait__thomas.png",
  witness:
    "assets/art/portrait/portrait__witness/v1/run-001/portrait__witness.png",
} as const;

export type PortraitKey = keyof typeof PORTRAIT_ASSETS;
