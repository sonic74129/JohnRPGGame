import { HOUSE_EXIT } from "./EnvironmentAssets";
import type { Point } from "./NavigationGrid";
import {
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_WIDTH,
} from "./WorldLayout";

export const HOUSE_DOOR_TRIGGER_RADIUS = 36;
export const HOUSE_DOOR_BEAT = "find-jesus";

export const WORLD_HOUSE_EXIT_SPAWN: Point =
  WORLD_LANDMARKS.marthaCourtyard;

export type HouseDoorTransition = "enter-house" | "enter-world";

export const resolveHouseDoorTransition = (
  inWorld: boolean,
  beatId: string,
  player: Point,
): HouseDoorTransition | undefined => {
  if (beatId !== HOUSE_DOOR_BEAT) {
    return undefined;
  }
  const door = inWorld ? WORLD_LANDMARKS.houseDoor : HOUSE_EXIT;
  return Math.hypot(player.x - door.x, player.y - door.y) <=
    HOUSE_DOOR_TRIGGER_RADIUS
    ? inWorld
      ? "enter-house"
      : "enter-world"
    : undefined;
};

export const TWO_DAY_WALK_ACTORS = [
  "jesus",
  "thomas",
  "older-disciple",
  "younger-disciple",
] as const;

export type TwoDayWalkActor = (typeof TWO_DAY_WALK_ACTORS)[number];

export const TWO_DAY_EXIT_POINTS: Readonly<Record<TwoDayWalkActor, Point>> = {
  jesus: { x: WORLD_WIDTH + 120, y: 1190 },
  thomas: { x: WORLD_WIDTH + 170, y: 1270 },
  "older-disciple": { x: WORLD_WIDTH + 220, y: 1350 },
  "younger-disciple": {
    x: WORLD_WIDTH + 270,
    y: Math.min(WORLD_HEIGHT - 120, 1430),
  },
};

export const TWO_DAY_TRANSITION_STATES = [
  "time-skip-black",
  "time-skip-title",
  "time-skip-return",
] as const;
