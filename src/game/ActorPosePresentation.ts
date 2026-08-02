import {
  CORE_POSE_SHEETS,
  SUPPORTING_ACTION_SHEET,
  characterOriginY,
  corePoseFrame,
  corePoseOriginY,
  supportingActionFrame,
  type CorePoseFor,
  type SupportingAction,
} from "./CharacterAssets";
import {
  spriteFrame,
  spriteSheet,
  type Facing,
  type SpriteCharacter,
} from "./CharacterSprites";
import type { ActorPresentationKind } from "./DisplayScale";

export type SequenceSpecialPose =
  | {
      readonly kind: "core";
      readonly character: "martha";
      readonly pose: CorePoseFor<"martha">;
    }
  | {
      readonly kind: "core";
      readonly character: "mary";
      readonly pose: CorePoseFor<"mary">;
    }
  | {
      readonly kind: "core";
      readonly character: "jesus";
      readonly pose: CorePoseFor<"jesus">;
    }
  | {
      readonly kind: "supporting";
      readonly pose: SupportingAction;
    };

export interface ActorPosePresentation {
  readonly character: SpriteCharacter;
  readonly textureKey: string;
  readonly frame: number;
  readonly originY: number;
  readonly sourceBounds: {
    readonly width: number;
    readonly height: number;
  };
  readonly scaleKind: ActorPresentationKind;
}

export const resolveBaseActorPresentation = (
  character: SpriteCharacter,
  facing: Facing,
): ActorPosePresentation => {
  const sheet = spriteSheet(character);
  return {
    character,
    textureKey: sheet.key,
    frame: spriteFrame(character, facing, "idle"),
    originY: characterOriginY(character),
    sourceBounds: {
      width: sheet.frameWidth,
      height: sheet.frameHeight,
    },
    scaleKind: "base-sheet",
  };
};

export const resolveSpecialActorPresentation = (
  character: SpriteCharacter,
  special: SequenceSpecialPose,
): ActorPosePresentation => {
  if (special.kind === "supporting") {
    return {
      character,
      textureKey: SUPPORTING_ACTION_SHEET.key,
      frame: supportingActionFrame(special.pose),
      originY: 1,
      sourceBounds: {
        width: SUPPORTING_ACTION_SHEET.frameWidth,
        height: SUPPORTING_ACTION_SHEET.frameHeight,
      },
      scaleKind: "supporting-action",
    };
  }
  if (character !== special.character) {
    throw new Error(
      `${special.character} pose ${special.pose} cannot be applied to ${character}.`,
    );
  }
  const sheet = CORE_POSE_SHEETS[special.character];
  return {
    character,
    textureKey: sheet.key,
    frame: corePoseFrame(special.character, special.pose),
    originY: corePoseOriginY(special.character),
    sourceBounds: {
      width: sheet.frameWidth,
      height: sheet.frameHeight,
    },
    scaleKind: "special-pose",
  };
};
