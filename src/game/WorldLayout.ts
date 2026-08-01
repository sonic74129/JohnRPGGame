import {
  NavigationGrid,
  type Point,
  type Rectangle,
} from "./NavigationGrid";

export const WORLD_TILE_SIZE = 32;
export const WORLD_COLUMNS = 72;
export const WORLD_ROWS = 48;
export const WORLD_WIDTH = WORLD_COLUMNS * WORLD_TILE_SIZE;
export const WORLD_HEIGHT = WORLD_ROWS * WORLD_TILE_SIZE;
export const WORLD_BOUNDARY = 64;
export const PLAYER_TRAVEL_SPEED = 260;

export type WorldZoneId =
  | "jerusalem-road"
  | "martha-house"
  | "village-square"
  | "bethany-entrance"
  | "arrival-road"
  | "tomb-road"
  | "tomb-garden";

export type WorldLandmarkId =
  | "jerusalemGate"
  | "houseDoor"
  | "villageCenter"
  | "well"
  | "bethanyEntrance"
  | "jesusArrival"
  | "tombRoadStart"
  | "tombEntrance";

export interface WorldZone {
  readonly id: WorldZoneId;
  readonly label: string;
  readonly bounds: Rectangle;
}

export interface WorldStructure {
  readonly id: string;
  readonly kind: "building" | "well" | "tomb" | "wall";
  readonly bounds: Rectangle;
}

export interface WorldRoute {
  readonly id: "house" | "arrival" | "tomb" | "jerusalem";
  readonly width: number;
  readonly points: readonly Point[];
}

export const WORLD_LANDMARKS: Readonly<Record<WorldLandmarkId, Point>> = {
  jerusalemGate: { x: 180, y: 360 },
  houseDoor: { x: 480, y: 1100 },
  villageCenter: { x: 1100, y: 820 },
  well: { x: 1100, y: 740 },
  bethanyEntrance: { x: 1420, y: 1080 },
  jesusArrival: { x: 2100, y: 1330 },
  tombRoadStart: { x: 1320, y: 650 },
  tombEntrance: { x: 1990, y: 390 },
};

export const WORLD_ZONES: readonly WorldZone[] = [
  {
    id: "jerusalem-road",
    label: "耶路撒冷方向",
    bounds: { x: 64, y: 120, width: 700, height: 500 },
  },
  {
    id: "martha-house",
    label: "马大家",
    bounds: { x: 160, y: 650, width: 640, height: 620 },
  },
  {
    id: "village-square",
    label: "伯大尼村庄",
    bounds: { x: 700, y: 500, width: 850, height: 650 },
  },
  {
    id: "bethany-entrance",
    label: "村庄入口",
    bounds: { x: 1250, y: 940, width: 520, height: 360 },
  },
  {
    id: "arrival-road",
    label: "耶稣来路",
    bounds: { x: 1540, y: 980, width: 700, height: 490 },
  },
  {
    id: "tomb-road",
    label: "墓园道路",
    bounds: { x: 1250, y: 300, width: 700, height: 570 },
  },
  {
    id: "tomb-garden",
    label: "拉撒路坟墓",
    bounds: { x: 1720, y: 64, width: 520, height: 520 },
  },
];

export const WORLD_STRUCTURES: readonly WorldStructure[] = [
  {
    id: "martha-house",
    kind: "building",
    bounds: { x: 240, y: 720, width: 480, height: 320 },
  },
  {
    id: "village-house-west",
    kind: "building",
    bounds: { x: 760, y: 280, width: 320, height: 250 },
  },
  {
    id: "village-house-east",
    kind: "building",
    bounds: { x: 1220, y: 280, width: 340, height: 250 },
  },
  {
    id: "village-house-south",
    kind: "building",
    bounds: { x: 1450, y: 810, width: 300, height: 240 },
  },
  {
    id: "village-well",
    kind: "well",
    bounds: { x: 1045, y: 685, width: 110, height: 110 },
  },
  {
    id: "tomb-hillside",
    kind: "tomb",
    bounds: { x: 1840, y: 96, width: 400, height: 250 },
  },
  {
    id: "jerusalem-gate",
    kind: "wall",
    bounds: { x: 64, y: 210, width: 250, height: 70 },
  },
];

export const WORLD_ROUTES: readonly WorldRoute[] = [
  {
    id: "house",
    width: 150,
    points: [
      WORLD_LANDMARKS.houseDoor,
      { x: 700, y: 1030 },
      { x: 880, y: 910 },
      WORLD_LANDMARKS.villageCenter,
    ],
  },
  {
    id: "arrival",
    width: 170,
    points: [
      WORLD_LANDMARKS.jesusArrival,
      { x: 1830, y: 1260 },
      WORLD_LANDMARKS.bethanyEntrance,
      WORLD_LANDMARKS.villageCenter,
    ],
  },
  {
    id: "tomb",
    width: 150,
    points: [
      WORLD_LANDMARKS.villageCenter,
      WORLD_LANDMARKS.tombRoadStart,
      { x: 1600, y: 500 },
      WORLD_LANDMARKS.tombEntrance,
    ],
  },
  {
    id: "jerusalem",
    width: 140,
    points: [
      WORLD_LANDMARKS.jerusalemGate,
      { x: 480, y: 470 },
      { x: 760, y: 620 },
      WORLD_LANDMARKS.villageCenter,
    ],
  },
];

const boundaryObstacles: readonly Rectangle[] = [
  { x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_BOUNDARY },
  { x: 0, y: 0, width: WORLD_BOUNDARY, height: WORLD_HEIGHT },
  {
    x: WORLD_WIDTH - WORLD_BOUNDARY,
    y: 0,
    width: WORLD_BOUNDARY,
    height: WORLD_HEIGHT,
  },
  {
    x: 0,
    y: WORLD_HEIGHT - WORLD_BOUNDARY,
    width: WORLD_WIDTH,
    height: WORLD_BOUNDARY,
  },
];

export const WORLD_OBSTACLES: readonly Rectangle[] = [
  ...boundaryObstacles,
  ...WORLD_STRUCTURES.map(({ bounds }) => bounds),
];

export const createWorldNavigation = (): NavigationGrid =>
  new NavigationGrid(
    WORLD_WIDTH,
    WORLD_HEIGHT,
    WORLD_TILE_SIZE,
    WORLD_OBSTACLES,
  );

export const pathLength = (
  start: Point,
  path: readonly Point[],
  target: Point,
): number => {
  const points = [start, ...path, target];
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous && current) {
      distance += Math.hypot(current.x - previous.x, current.y - previous.y);
    }
  }
  return distance;
};

export const travelTimeSeconds = (
  start: Point,
  target: Point,
  speed = PLAYER_TRAVEL_SPEED,
): number => {
  const path = createWorldNavigation().findPath(start, target);
  if (path.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return pathLength(start, path, target) / speed;
};
