import type { Point, Rectangle } from "./NavigationGrid";

export interface AtlasFrameBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HouseArtPlacement {
  readonly id: string;
  readonly atlas: "foreground" | "props";
  readonly frame: number;
  readonly sourceBounds: AtlasFrameBounds;
  readonly anchor: Point;
  readonly scale: number;
  readonly depth: number;
  readonly collision?: Rectangle;
}

export const HOUSE_ART = {
  width: 1360,
  height: 768,
  base: {
    key: "house-base",
    path: "assets/art/environment/interior/environment__house-base/v1/run-001/environment__house-base.png",
    depth: -40,
  },
  foreground: {
    key: "house-foreground",
    path: "assets/art/environment/interior/environment__house-foreground/v2/run-001/environment__house-foreground.png",
    frameWidth: 272,
    frameHeight: 768,
    frameCount: 5,
  },
  props: {
    key: "house-props",
    path: "assets/art/environment/interior/props__house/v2/run-001/props__house.png",
    frameWidth: 340,
    frameHeight: 256,
    frameCount: 12,
  },
} as const;

export const INTERIOR_CHARACTER_SIZE = {
  width: 88,
  height: 114,
} as const;

export const HOUSE_SICK_LAZARUS_SIZE = {
  width: 205,
  height: 139,
} as const;

export const HOUSE_PLAYER_SPAWN: Point = { x: 390, y: 540 };
export const HOUSE_EXIT: Point = { x: 245, y: 445 };
export const HOUSE_STORY_FOCUS: Point = { x: 535, y: 485 };
export const HOUSE_SICK_LAZARUS_POSITION: Point = { x: 535, y: 385 };

export const HOUSE_FOREGROUND_PLACEMENTS: readonly HouseArtPlacement[] = [
  {
    id: "door-frame",
    atlas: "foreground",
    frame: 0,
    sourceBounds: { x: 58, y: 188, width: 198, height: 338 },
    anchor: HOUSE_EXIT,
    scale: 0.55,
    depth: 445,
  },
  {
    id: "bed",
    atlas: "foreground",
    frame: 1,
    sourceBounds: { x: 12, y: 216, width: 260, height: 296 },
    anchor: { x: 535, y: 505 },
    scale: 1,
    depth: 470,
    collision: { x: 395, y: 365, width: 280, height: 125 },
  },
  {
    id: "table",
    atlas: "foreground",
    frame: 2,
    sourceBounds: { x: 0, y: 265, width: 260, height: 250 },
    anchor: { x: 820, y: 535 },
    scale: 0.58,
    depth: 535,
    collision: { x: 750, y: 470, width: 145, height: 58 },
  },
  {
    id: "shelf",
    atlas: "foreground",
    frame: 3,
    sourceBounds: { x: 14, y: 194, width: 258, height: 318 },
    anchor: { x: 1055, y: 445 },
    scale: 0.58,
    depth: 445,
    collision: { x: 995, y: 405, width: 120, height: 40 },
  },
  {
    id: "vessels",
    atlas: "foreground",
    frame: 4,
    sourceBounds: { x: 0, y: 224, width: 222, height: 308 },
    anchor: { x: 1190, y: 535 },
    scale: 0.58,
    depth: 535,
    collision: { x: 1135, y: 480, width: 110, height: 50 },
  },
];

export const HOUSE_PROP_PLACEMENTS: readonly HouseArtPlacement[] = [
  {
    id: "stool-dark",
    atlas: "props",
    frame: 2,
    sourceBounds: { x: 0, y: 84, width: 305, height: 172 },
    anchor: { x: 710, y: 575 },
    scale: 0.35,
    depth: 575,
  },
  {
    id: "stool-light",
    atlas: "props",
    frame: 3,
    sourceBounds: { x: 93, y: 93, width: 152, height: 163 },
    anchor: { x: 905, y: 555 },
    scale: 0.45,
    depth: 555,
  },
  {
    id: "oil-lamp",
    atlas: "props",
    frame: 6,
    sourceBounds: { x: 0, y: 0, width: 276, height: 256 },
    anchor: { x: 835, y: 485 },
    scale: 0.22,
    depth: 536,
  },
  {
    id: "folded-linen",
    atlas: "props",
    frame: 9,
    sourceBounds: { x: 108, y: 0, width: 232, height: 202 },
    anchor: { x: 660, y: 570 },
    scale: 0.3,
    depth: 570,
  },
  {
    id: "basket",
    atlas: "props",
    frame: 10,
    sourceBounds: { x: 0, y: 0, width: 292, height: 196 },
    anchor: { x: 1000, y: 545 },
    scale: 0.28,
    depth: 545,
  },
  {
    id: "cup",
    atlas: "props",
    frame: 11,
    sourceBounds: { x: 108, y: 0, width: 113, height: 189 },
    anchor: { x: 790, y: 475 },
    scale: 0.3,
    depth: 537,
  },
];

export const HOUSE_OBSTACLES: readonly Rectangle[] = [
  { x: 0, y: 0, width: HOUSE_ART.width, height: 64 },
  { x: 0, y: 0, width: 64, height: HOUSE_ART.height },
  { x: HOUSE_ART.width - 64, y: 0, width: 64, height: HOUSE_ART.height },
  { x: 0, y: HOUSE_ART.height - 64, width: HOUSE_ART.width, height: 64 },
  ...HOUSE_FOREGROUND_PLACEMENTS.flatMap(({ collision }) =>
    collision ? [collision] : [],
  ),
];
