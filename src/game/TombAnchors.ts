import tombAnchorData from "../../art/tomb-anchors.json";

export interface TombPoint {
  readonly x: number;
  readonly y: number;
}

export interface TombBounds {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export interface TombAnchorContract {
  readonly schemaVersion: string;
  readonly source: {
    readonly candidatePath: string;
    readonly runtimeAssetPath: string;
    readonly layoutPath: string;
    readonly debugOverlayPath: string;
    readonly canvas: { readonly width: number; readonly height: number };
    readonly gardenBounds: TombBounds;
  };
  readonly tombApproach: TombPoint;
  readonly tombMouth: {
    readonly center: TombPoint;
    readonly visualBounds: TombBounds;
    readonly darkOpeningBounds: TombBounds;
    readonly pixelEvidence: string;
  };
  readonly tombGathering: {
    readonly center: TombPoint;
    readonly groupPositions: Readonly<Record<TombGroupSlot, TombPoint>>;
  };
  readonly stone: {
    readonly size: { readonly width: number; readonly height: number };
    readonly initialBounds: TombBounds;
    readonly rolledTarget: {
      readonly center: TombPoint;
      readonly bounds: TombBounds;
    };
    readonly rollDelta: TombPoint;
    readonly rollDistance: number;
  };
  readonly lazarus: {
    readonly hiddenStart: TombPoint;
    readonly emergenceTarget: TombPoint;
    readonly entranceFade: {
      readonly fromAlpha: number;
      readonly toAlpha: number;
    };
    readonly path: readonly TombPoint[];
  };
  readonly cameraFocus: TombPoint;
  readonly colliderIntent: {
    readonly stoneUsesRectangularBounds: boolean;
    readonly stoneColliderMovesWithRoll: boolean;
    readonly stoneBlocksMouthInitially: boolean;
    readonly mouthPassableAfterRoll: boolean;
    readonly lazarusNonCollidingWhileHidden: boolean;
    readonly lazarusCollidingAfterEmergence: boolean;
  };
}

export type TombGroupSlot =
  | "jesus"
  | "martha"
  | "mary"
  | "mourner"
  | "mournerWoman"
  | "player";

export const TOMB_ANCHORS = tombAnchorData satisfies TombAnchorContract;
