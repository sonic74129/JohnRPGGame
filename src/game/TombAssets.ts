export type TombPropId =
  | "stone"
  | "stoneRolled"
  | "caveLip"
  | "clothFolded"
  | "clothStrips"
  | "dust"
  | "rubble"
  | "plant";

export interface TombPropAsset {
  readonly key: string;
  readonly path: string;
}

export interface TombPropPlacement {
  readonly id: Exclude<TombPropId, "stone" | "stoneRolled">;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly alpha?: number;
}

export const TOMB_PROP_ASSETS: Readonly<Record<TombPropId, TombPropAsset>> = {
  stone: {
    key: "prop-tomb-stone",
    path: "assets/art/props/tomb-stone.png",
  },
  stoneRolled: {
    key: "prop-tomb-stone-rolled",
    path: "assets/art/props/tomb-stone-rolled.png",
  },
  caveLip: {
    key: "prop-tomb-cave-lip",
    path: "assets/art/props/tomb-cave-lip.png",
  },
  clothFolded: {
    key: "prop-burial-cloth-folded",
    path: "assets/art/props/burial-cloth-folded.png",
  },
  clothStrips: {
    key: "prop-burial-cloth-strips",
    path: "assets/art/props/burial-cloth-strips.png",
  },
  dust: {
    key: "prop-tomb-dust",
    path: "assets/art/props/tomb-dust.png",
  },
  rubble: {
    key: "prop-tomb-rubble",
    path: "assets/art/props/tomb-rubble.png",
  },
  plant: {
    key: "prop-tomb-plant",
    path: "assets/art/props/tomb-plant.png",
  },
};

export const TOMB_STONE_PLACEMENT = {
  x: 1940,
  y: 415,
  width: 140,
  height: 110,
  depth: 425,
} as const;

export const TOMB_PROP_PLACEMENTS: readonly TombPropPlacement[] = [
  {
    id: "clothFolded",
    x: 2010,
    y: 390,
    width: 120,
    height: 86,
    depth: 398,
  },
  {
    id: "caveLip",
    x: 1990,
    y: 430,
    width: 275,
    height: 94,
    depth: 455,
  },
  {
    id: "clothStrips",
    x: 1915,
    y: 520,
    width: 118,
    height: 71,
    depth: 530,
  },
  {
    id: "dust",
    x: 2070,
    y: 490,
    width: 165,
    height: 56,
    depth: 493,
    alpha: 0.72,
  },
  {
    id: "rubble",
    x: 1815,
    y: 455,
    width: 129,
    height: 72,
    depth: 527,
  },
  {
    id: "plant",
    x: 2180,
    y: 395,
    width: 86,
    height: 81,
    depth: 476,
  },
];
