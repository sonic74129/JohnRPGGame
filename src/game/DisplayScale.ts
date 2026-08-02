export const OUTDOOR_DISPLAY_HEIGHTS = {
  outdoor84: 84,
  outdoor90: 90,
  outdoor96: 96,
} as const;

export type OutdoorDisplayProfile = keyof typeof OUTDOOR_DISPLAY_HEIGHTS;
export type DisplayArea = "indoor" | "outdoor";
export type ActorPresentationKind =
  | "base-sheet"
  | "special-pose"
  | "supporting-action";
export type LazarusDisplayState =
  | "sick"
  | "wrapped-idle"
  | "wrapped-step"
  | "restored";

export interface VisibleContentBounds {
  readonly width: number;
  readonly height: number;
}

export interface DisplayScaleContract {
  readonly outdoorProfile: OutdoorDisplayProfile;
  readonly outdoorVisibleHeight: number;
  readonly indoorVisibleHeight: number;
  readonly sickLazarusBox: {
    readonly width: number;
    readonly height: number;
  };
}

export type DisplayScaleRequest =
  | {
      readonly kind: ActorPresentationKind;
      readonly area: DisplayArea;
      readonly sourceBounds: VisibleContentBounds;
    }
  | {
      readonly kind: "lazarus";
      readonly area: DisplayArea;
      readonly state: LazarusDisplayState;
      readonly sourceBounds: VisibleContentBounds;
    };

export interface ResolvedDisplayMetrics {
  readonly scale: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly maximumWidth?: number;
  readonly maximumHeight?: number;
}

export const createDisplayScaleContract = (
  outdoorProfile: OutdoorDisplayProfile = "outdoor90",
  overrides: {
    readonly indoorVisibleHeight?: number;
    readonly sickLazarusBox?: {
      readonly width: number;
      readonly height: number;
    };
  } = {},
): DisplayScaleContract => ({
  outdoorProfile,
  outdoorVisibleHeight: OUTDOOR_DISPLAY_HEIGHTS[outdoorProfile],
  indoorVisibleHeight: overrides.indoorVisibleHeight ?? 128,
  sickLazarusBox: overrides.sickLazarusBox ?? { width: 160, height: 108 },
});

export const DEFAULT_DISPLAY_SCALE = createDisplayScaleContract();

const requirePositiveBounds = (bounds: VisibleContentBounds): void => {
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Visible content bounds must be positive.");
  }
};

export const resolveTargetVisibleHeight = (
  contract: DisplayScaleContract,
  request: Pick<DisplayScaleRequest, "kind" | "area"> & {
    readonly state?: LazarusDisplayState;
  },
): number =>
  request.kind === "lazarus" && request.state === "sick"
    ? contract.sickLazarusBox.height
    : request.area === "indoor"
      ? contract.indoorVisibleHeight
      : contract.outdoorVisibleHeight;

export const resolveDisplayMetrics = (
  contract: DisplayScaleContract,
  request: DisplayScaleRequest,
): ResolvedDisplayMetrics => {
  requirePositiveBounds(request.sourceBounds);

  if (request.kind === "lazarus" && request.state === "sick") {
    const scale = Math.min(
      contract.sickLazarusBox.width / request.sourceBounds.width,
      contract.sickLazarusBox.height / request.sourceBounds.height,
    );
    return {
      scale,
      visibleWidth: request.sourceBounds.width * scale,
      visibleHeight: request.sourceBounds.height * scale,
      maximumWidth: contract.sickLazarusBox.width,
      maximumHeight: contract.sickLazarusBox.height,
    };
  }

  const visibleHeight = resolveTargetVisibleHeight(contract, request);
  const scale = visibleHeight / request.sourceBounds.height;
  return {
    scale,
    visibleWidth: request.sourceBounds.width * scale,
    visibleHeight,
  };
};

export const LINEAR_RENDER_CONFIG = {
  antialias: true,
  pixelArt: false,
  roundPixels: false,
} as const;

export interface LinearTextureFilterAdapter<FilterMode> {
  readonly linearMode: FilterMode;
  readonly textureKeys: readonly string[];
  setFilter(textureKey: string, filterMode: FilterMode): void;
}

export const applyLinearTextureFiltering = <FilterMode>(
  adapter: LinearTextureFilterAdapter<FilterMode>,
): void => {
  for (const textureKey of adapter.textureKeys) {
    adapter.setFilter(textureKey, adapter.linearMode);
  }
};
