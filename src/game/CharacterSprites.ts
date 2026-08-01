export const FACINGS = ["front", "back", "left", "right"] as const;

export type Facing = (typeof FACINGS)[number];
export type WalkingSpriteCharacter = "messenger" | "martha" | "mary" | "jesus";
export type IdleSpriteCharacter = "mourner-man" | "guide";
export type SpriteCharacter = WalkingSpriteCharacter | IdleSpriteCharacter;
export type SpritePose = "idle" | "step-left" | "step-right";
export const LAZARUS_POSES = [
  "sick",
  "wrapped-idle",
  "wrapped-step",
  "restored",
] as const;
export type LazarusPose = (typeof LAZARUS_POSES)[number];

const LAZARUS_DISPLAY_SIZES: Readonly<
  Record<LazarusPose, { readonly width: number; readonly height: number }>
> = {
  sick: { width: 280, height: 190 },
  "wrapped-idle": { width: 78, height: 72 },
  "wrapped-step": { width: 78, height: 72 },
  restored: { width: 84, height: 78 },
};

const WALKING_CHARACTERS: readonly WalkingSpriteCharacter[] = [
  "messenger",
  "martha",
  "mary",
  "jesus",
];

export const actorSpriteCharacter = (
  id: "martha" | "mary" | "jesus" | "mourner" | "guide",
): SpriteCharacter => (id === "mourner" ? "mourner-man" : id);

export const spriteTextureKey = (
  character: SpriteCharacter,
  facing: Facing,
  pose: SpritePose,
): string => `sprite-${character}-${facing}-${pose}`;

export const spriteAssetPath = (
  character: SpriteCharacter,
  facing: Facing,
  pose: SpritePose,
): string => `assets/art/sprites/${character}/${facing}-${pose}.png`;

export const lazarusTextureKey = (pose: LazarusPose): string =>
  `sprite-lazarus-${pose}`;

export const lazarusAssetPath = (pose: LazarusPose): string =>
  `assets/art/sprites/lazarus/${pose}.png`;

export const lazarusDisplaySize = (
  pose: LazarusPose,
): { readonly width: number; readonly height: number } =>
  LAZARUS_DISPLAY_SIZES[pose];

export const walkAnimationKey = (
  character: WalkingSpriteCharacter,
  facing: Facing,
): string => `walk-${character}-${facing}`;

export const hasWalkFrames = (
  character: SpriteCharacter,
): character is WalkingSpriteCharacter =>
  WALKING_CHARACTERS.includes(character as WalkingSpriteCharacter);

export const walkFrameKeys = (
  character: WalkingSpriteCharacter,
  facing: Facing,
): readonly string[] => [
  spriteTextureKey(character, facing, "step-left"),
  spriteTextureKey(character, facing, "idle"),
  spriteTextureKey(character, facing, "step-right"),
  spriteTextureKey(character, facing, "idle"),
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
