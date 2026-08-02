import {
  DIRECTIONAL_CHARACTER_SHEETS,
  FACINGS,
  LAZARUS_CONTENT_BOUNDS,
  LAZARUS_POSES,
  LAZARUS_SHEET,
  SUPPORTING_CHARACTER_SHEETS,
  WALK_POSES,
  characterOriginY,
  directionalFrame,
  lazarusFrame,
  lazarusScaleToFit,
  supportingFrame,
  supportingSheet,
  type CoreCharacter,
  type Facing,
  type LazarusPose,
  type SupportingCharacter,
  type WalkPose,
} from "./CharacterAssets";
import type { ActorId } from "./types";

export {
  FACINGS,
  LAZARUS_CONTENT_BOUNDS,
  LAZARUS_POSES,
  characterOriginY,
  lazarusScaleToFit,
};
export type { Facing, LazarusPose };

export type WalkingSpriteCharacter = CoreCharacter;
export type SpriteCharacter = CoreCharacter | SupportingCharacter;
export type SpritePose = WalkPose;

const WALKING_CHARACTERS: readonly WalkingSpriteCharacter[] = [
  "messenger",
  "martha",
  "mary",
  "jesus",
];

export const actorSpriteCharacter = (id: ActorId): SpriteCharacter => {
  switch (id) {
    case "mourner":
    case "memory-carrier-bread":
      return "mourner-man";
    case "memory-carrier-water":
      return "guide";
    case "memory-carrier-mud":
      return "older-witness";
    case "martha":
    case "mary":
    case "jesus":
    case "mourner-woman":
    case "guide":
    case "older-witness":
    case "thomas":
    case "older-disciple":
    case "younger-disciple":
      return id;
  }
};

export const spriteSheet = (character: SpriteCharacter) =>
  character === "messenger" ||
  character === "martha" ||
  character === "mary" ||
  character === "jesus"
    ? DIRECTIONAL_CHARACTER_SHEETS[character]
    : supportingSheet(character);

export const spriteTextureKey = (character: SpriteCharacter): string =>
  spriteSheet(character).key;

export const spriteFrame = (
  character: SpriteCharacter,
  facing: Facing,
  pose: SpritePose = "idle",
): number =>
  hasWalkFrames(character)
    ? directionalFrame(character, facing, pose)
    : supportingFrame(character, facing);

export const lazarusTextureKey = (): string => LAZARUS_SHEET.key;

export const lazarusAssetPath = (): string => LAZARUS_SHEET.path;

export { lazarusFrame };

export const lazarusScaleToFitRotated = (
  pose: LazarusPose,
  maximum: { readonly width: number; readonly height: number },
  angleDegrees: number,
): number => {
  const bounds = LAZARUS_CONTENT_BOUNDS[pose];
  const angle = (angleDegrees * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  const rotatedWidth = bounds.width * cosine + bounds.height * sine;
  const rotatedHeight = bounds.width * sine + bounds.height * cosine;
  return Math.min(maximum.width / rotatedWidth, maximum.height / rotatedHeight);
};

export const lazarusVisibleBounds = (
  pose: LazarusPose,
  position: { readonly x: number; readonly y: number },
  scale: number,
  angleDegrees = 0,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => {
  const bounds = LAZARUS_CONTENT_BOUNDS[pose];
  const angle = (angleDegrees * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const left = (bounds.x - LAZARUS_SHEET.frameWidth / 2) * scale;
  const top =
    (bounds.y - LAZARUS_SHEET.frameHeight * bounds.originY) * scale;
  const right = left + bounds.width * scale;
  const bottom = top + bounds.height * scale;
  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ].map(({ x, y }) => ({
    x: position.x + x * cosine - y * sine,
    y: position.y + x * sine + y * cosine,
  }));
  const xValues = corners.map(({ x }) => x);
  const yValues = corners.map(({ y }) => y);
  const x = Math.min(...xValues);
  const y = Math.min(...yValues);
  return {
    x,
    y,
    width: Math.max(...xValues) - x,
    height: Math.max(...yValues) - y,
  };
};

export const walkAnimationKey = (
  character: WalkingSpriteCharacter,
  facing: Facing,
): string => `walk-${character}-${facing}`;

export const hasWalkFrames = (
  character: SpriteCharacter,
): character is WalkingSpriteCharacter =>
  WALKING_CHARACTERS.includes(character as WalkingSpriteCharacter);

export const walkFrames = (
  character: WalkingSpriteCharacter,
  facing: Facing,
): readonly { readonly key: string; readonly frame: number }[] => {
  const poses: readonly SpritePose[] = [
    "step-left",
    "idle",
    "step-right",
    "idle",
  ];
  return poses.map((pose) => ({
    key: DIRECTIONAL_CHARACTER_SHEETS[character].key,
    frame: directionalFrame(character, facing, pose),
  }));
};

export const allCharacterSheets = () => [
  ...Object.values(DIRECTIONAL_CHARACTER_SHEETS),
  ...Object.values(SUPPORTING_CHARACTER_SHEETS),
];

export const resolveFacing = (
  x: number,
  y: number,
  previous: Facing,
): Facing => {
  if (x === 0 && y === 0) {
    return previous;
  }
  if (Math.abs(x) > Math.abs(y)) {
    return x > 0 ? "right" : "left";
  }
  return y > 0 ? "front" : "back";
};

export const WALK_POSE_COUNT = WALK_POSES.length;
