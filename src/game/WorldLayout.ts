import worldMapLayout from "../../art/world-map-layout.json";

import {
  NavigationGrid,
  type Point,
  type Rectangle,
} from "./NavigationGrid";

export const WORLD_TILE_SIZE = 32;
export const WORLD_WIDTH = worldMapLayout.canvas.width;
export const WORLD_HEIGHT = worldMapLayout.canvas.height;
export const WORLD_COLUMNS = Math.ceil(WORLD_WIDTH / WORLD_TILE_SIZE);
export const WORLD_ROWS = Math.ceil(WORLD_HEIGHT / WORLD_TILE_SIZE);
export const WORLD_BOUNDARY = worldMapLayout.canvas.safeBorder;
export const PLAYER_TRAVEL_SPEED = 260;
export const WORLD_NAVIGATION_CLEARANCE = 40;
export const WORLD_SELECTED_PROFILE = worldMapLayout.selectedProfile;
export const WORLD_MAP_SOURCE_KEY = "world-map-source";
export const WORLD_MAP_FALLBACK_KEY = "world-map-graybox-fallback";
export const WORLD_MAP_RUNTIME_URL =
  "assets/art/environment/environment__world-map/v1.1/run-001/environment__world-map.png";
export const WORLD_MAP_FALLBACK_URL = new URL(
  "../../production/design-contracts/world-map-graybox-b.png",
  import.meta.url,
).href;

const point = (value: { readonly x: number; readonly y: number }): Point => ({
  x: value.x,
  y: value.y,
});

const pointAt = (
  values: readonly { readonly x: number; readonly y: number }[],
  index: number,
): Point => {
  const value = values[index];
  if (!value) {
    throw new Error(`World layout is missing tomb route point ${index}.`);
  }
  return point(value);
};

const rectangle = (value: {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}): Rectangle => ({
  x: value.xMin,
  y: value.yMin,
  width: value.xMax - value.xMin,
  height: value.yMax - value.yMin,
});

export const WORLD_LANDMARKS = {
  houseDoor: point(worldMapLayout.regions.marthaCompound.door),
  villageCenter: point(worldMapLayout.regions.village.center),
  bethanyMeeting: point(worldMapLayout.regions.meetingArea.center),
  jesusCamp: point(worldMapLayout.regions.jesusCamp.center),
  tombRoadStart: pointAt(worldMapLayout.regions.tombRoute.points, 0),
  tombRoadMiddle: pointAt(worldMapLayout.regions.tombRoute.points, 1),
  tombEntrance: pointAt(worldMapLayout.regions.tombRoute.points, 2),
  tombGarden: point(worldMapLayout.regions.tombGarden.center),
  jerusalemGate: { x: 180, y: 360 },
  bethanyEntrance: point(worldMapLayout.regions.meetingArea.center),
  jesusArrival: point(worldMapLayout.regions.jesusCamp.center),
} as const satisfies Readonly<Record<string, Point>>;

export const WORLD_REGIONS = {
  marthaCompound: rectangle(worldMapLayout.regions.marthaCompound.bounds),
  village: rectangle(worldMapLayout.regions.village.bounds),
  meetingArea: rectangle(worldMapLayout.regions.meetingArea.bounds),
  jesusCamp: rectangle(worldMapLayout.regions.jesusCamp.bounds),
  tombGarden: rectangle(worldMapLayout.regions.tombGarden.bounds),
} as const satisfies Readonly<Record<string, Rectangle>>;

export const WORLD_ROUTES = {
  villageToTomb: {
    id: "village-to-tomb",
    points: [
      WORLD_LANDMARKS.villageCenter,
      WORLD_LANDMARKS.tombRoadStart,
      WORLD_LANDMARKS.tombRoadMiddle,
      WORLD_LANDMARKS.tombEntrance,
      WORLD_LANDMARKS.tombGarden,
    ],
  },
  campToMeeting: {
    id: "camp-to-meeting",
    points: [
      WORLD_LANDMARKS.jesusCamp,
      { x: 1990, y: 1190 },
      WORLD_LANDMARKS.bethanyMeeting,
    ],
  },
} as const;

export const WORLD_ROUTE_LIST = Object.values(WORLD_ROUTES);

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

export const WORLD_STRUCTURE_OBSTACLES: readonly Rectangle[] = [
  { x: 180, y: 880, width: 250, height: 245 },
  { x: 610, y: 880, width: 150, height: 245 },
  { x: 720, y: 610, width: 300, height: 200 },
  { x: 1210, y: 620, width: 290, height: 200 },
  { x: 840, y: 1040, width: 290, height: 180 },
  { x: 2040, y: 100, width: 430, height: 190 },
];

export const WORLD_OBSTACLES: readonly Rectangle[] = [
  ...boundaryObstacles,
  ...WORLD_STRUCTURE_OBSTACLES,
];

const inflateRectangle = (
  obstacle: Rectangle,
  clearance: number,
): Rectangle => ({
  x: obstacle.x - clearance,
  y: obstacle.y - clearance,
  width: obstacle.width + clearance * 2,
  height: obstacle.height + clearance * 2,
});

export const WORLD_NAVIGATION_OBSTACLES: readonly Rectangle[] = [
  ...boundaryObstacles,
  ...WORLD_STRUCTURE_OBSTACLES.map((obstacle) =>
    inflateRectangle(obstacle, WORLD_NAVIGATION_CLEARANCE),
  ),
];

export const createWorldNavigation = (): NavigationGrid =>
  new NavigationGrid(
    WORLD_WIDTH,
    WORLD_HEIGHT,
    WORLD_TILE_SIZE,
    WORLD_NAVIGATION_OBSTACLES,
  );

export const pathLength = (
  start: Point,
  path: readonly Point[],
  target: Point,
): number => {
  const points = [start, ...path, target];
  return points.slice(1).reduce((distance, current, index) => {
    const previous = points[index];
    return previous
      ? distance + Math.hypot(current.x - previous.x, current.y - previous.y)
      : distance;
  }, 0);
};

export const routeLength = (route: readonly Point[]): number =>
  route.slice(1).reduce((distance, current, index) => {
    const previous = route[index];
    return previous
      ? distance + Math.hypot(current.x - previous.x, current.y - previous.y)
      : distance;
  }, 0);

export const travelTimeSeconds = (
  start: Point,
  target: Point,
  speed = PLAYER_TRAVEL_SPEED,
): number => {
  const path = createWorldNavigation().findPath(start, target);
  return path.length === 0
    ? Number.POSITIVE_INFINITY
    : pathLength(start, path, target) / speed;
};
