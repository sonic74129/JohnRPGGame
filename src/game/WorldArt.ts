import type { Rectangle } from "./NavigationGrid";

export type WorldTexture =
  | "world-door-threshold"
  | "world-market-canopy"
  | "world-market-table"
  | "world-martha-house"
  | "world-tomb-entrance"
  | "world-village-house-a"
  | "world-village-house-b"
  | "world-village-well"
  | "world-cliff-edge"
  | "world-olive-tree"
  | "world-road-marker"
  | "world-rock-ledge"
  | "world-wall-corner"
  | "world-wall-end"
  | "world-wall";

export interface WorldArtObject {
  readonly id: string;
  readonly texture: WorldTexture;
  readonly bounds: Rectangle;
  readonly collision?: Rectangle;
}

export const WORLD_STRUCTURE_ART: Readonly<Record<string, WorldArtObject>> = {
  "martha-house": {
    id: "martha-house",
    texture: "world-martha-house",
    bounds: { x: 325, y: 765, width: 310, height: 242 },
  },
  "village-house-west": {
    id: "village-house-west",
    texture: "world-village-house-a",
    bounds: { x: 775, y: 310, width: 270, height: 227 },
  },
  "village-house-east": {
    id: "village-house-east",
    texture: "world-village-house-b",
    bounds: { x: 1245, y: 315, width: 282, height: 218 },
  },
  "village-house-south": {
    id: "village-house-south",
    texture: "world-village-house-a",
    bounds: { x: 1465, y: 780, width: 270, height: 227 },
  },
  "village-well": {
    id: "village-well",
    texture: "world-village-well",
    bounds: { x: 1028, y: 615, width: 142, height: 169 },
  },
  "tomb-hillside": {
    id: "tomb-hillside",
    texture: "world-tomb-entrance",
    bounds: { x: 1840, y: 120, width: 320, height: 279 },
  },
  "jerusalem-gate": {
    id: "jerusalem-gate",
    texture: "world-wall",
    bounds: { x: 65, y: 275, width: 250, height: 80 },
  },
};

export const WORLD_DECORATIONS: readonly WorldArtObject[] = [
  {
    id: "market-canopy",
    texture: "world-market-canopy",
    bounds: { x: 820, y: 650, width: 165, height: 162 },
    collision: { x: 845, y: 735, width: 115, height: 55 },
  },
  {
    id: "market-table",
    texture: "world-market-table",
    bounds: { x: 850, y: 740, width: 150, height: 108 },
  },
  {
    id: "village-marker",
    texture: "world-road-marker",
    bounds: { x: 1280, y: 780, width: 76, height: 94 },
    collision: { x: 1300, y: 835, width: 36, height: 28 },
  },
  {
    id: "house-tree-west",
    texture: "world-olive-tree",
    bounds: { x: 120, y: 790, width: 150, height: 158 },
    collision: { x: 170, y: 885, width: 52, height: 42 },
  },
  {
    id: "house-tree-east",
    texture: "world-olive-tree",
    bounds: { x: 650, y: 700, width: 150, height: 158 },
    collision: { x: 700, y: 795, width: 52, height: 42 },
  },
  {
    id: "entrance-tree-west",
    texture: "world-olive-tree",
    bounds: { x: 1190, y: 1120, width: 150, height: 158 },
    collision: { x: 1240, y: 1215, width: 52, height: 42 },
  },
  {
    id: "entrance-tree-east",
    texture: "world-olive-tree",
    bounds: { x: 1510, y: 1210, width: 150, height: 158 },
    collision: { x: 1560, y: 1305, width: 52, height: 42 },
  },
  {
    id: "arrival-tree-north",
    texture: "world-olive-tree",
    bounds: { x: 1900, y: 1040, width: 150, height: 158 },
    collision: { x: 1950, y: 1135, width: 52, height: 42 },
  },
  {
    id: "arrival-tree-east",
    texture: "world-olive-tree",
    bounds: { x: 2140, y: 900, width: 150, height: 158 },
    collision: { x: 2190, y: 995, width: 52, height: 42 },
  },
  {
    id: "tomb-tree",
    texture: "world-olive-tree",
    bounds: { x: 2130, y: 470, width: 150, height: 158 },
    collision: { x: 2180, y: 565, width: 52, height: 42 },
  },
  {
    id: "house-wall",
    texture: "world-wall",
    bounds: { x: 230, y: 1045, width: 210, height: 67 },
    collision: { x: 230, y: 1080, width: 210, height: 28 },
  },
  {
    id: "house-wall-corner",
    texture: "world-wall-corner",
    bounds: { x: 115, y: 990, width: 170, height: 103 },
    collision: { x: 150, y: 1045, width: 135, height: 42 },
  },
  {
    id: "village-wall",
    texture: "world-wall",
    bounds: { x: 1110, y: 445, width: 190, height: 61 },
    collision: { x: 1110, y: 477, width: 190, height: 25 },
  },
  {
    id: "tomb-cliff",
    texture: "world-cliff-edge",
    bounds: { x: 1665, y: 110, width: 205, height: 135 },
    collision: { x: 1680, y: 155, width: 180, height: 75 },
  },
  {
    id: "tomb-rocks",
    texture: "world-rock-ledge",
    bounds: { x: 2070, y: 225, width: 190, height: 107 },
    collision: { x: 2085, y: 260, width: 165, height: 60 },
  },
  {
    id: "jerusalem-wall-end",
    texture: "world-wall-end",
    bounds: { x: 300, y: 300, width: 165, height: 64 },
    collision: { x: 300, y: 330, width: 165, height: 28 },
  },
];

export const WORLD_ART_OBSTACLES: readonly Rectangle[] = WORLD_DECORATIONS.flatMap(
  ({ collision }) => (collision ? [collision] : []),
);
