import { describe, expect, it } from "vitest";

import {
  HOUSE_DOOR_TRIGGER_RADIUS,
  TWO_DAY_EXIT_POINTS,
  TWO_DAY_TRANSITION_STATES,
  TWO_DAY_WALK_ACTORS,
  WORLD_HOUSE_EXIT_SPAWN,
  resolveHouseDoorTransition,
} from "../src/game/BethanyFlow";
import {
  HOUSE_DOOR_REENTRY_SPAWN,
  HOUSE_EXIT,
} from "../src/game/EnvironmentAssets";
import {
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_WIDTH,
} from "../src/game/WorldLayout";

const distance = (
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): number => Math.hypot(left.x - right.x, left.y - right.y);

describe("Bethany first-scene flow", () => {
  it("uses the same doorway for leaving and re-entering during Find Jesus", () => {
    expect(
      resolveHouseDoorTransition(false, "find-jesus", HOUSE_EXIT),
    ).toBe("enter-world");
    expect(
      resolveHouseDoorTransition(
        true,
        "find-jesus",
        WORLD_LANDMARKS.houseDoor,
      ),
    ).toBe("enter-house");
    expect(
      resolveHouseDoorTransition(true, "message", WORLD_LANDMARKS.houseDoor),
    ).toBeUndefined();
  });

  it("spawns on each doorway side without immediately retriggering travel", () => {
    expect(
      distance(HOUSE_DOOR_REENTRY_SPAWN, HOUSE_EXIT),
    ).toBeGreaterThan(HOUSE_DOOR_TRIGGER_RADIUS);
    expect(
      distance(WORLD_HOUSE_EXIT_SPAWN, WORLD_LANDMARKS.houseDoor),
    ).toBeGreaterThan(HOUSE_DOOR_TRIGGER_RADIUS);
  });

  it("walks every camp NPC beyond the map before the black title card returns", () => {
    expect(TWO_DAY_WALK_ACTORS).toEqual([
      "jesus",
      "thomas",
      "older-disciple",
      "younger-disciple",
    ]);
    for (const actor of TWO_DAY_WALK_ACTORS) {
      expect(TWO_DAY_EXIT_POINTS[actor].x).toBeGreaterThan(WORLD_WIDTH);
      expect(TWO_DAY_EXIT_POINTS[actor].y).toBeGreaterThan(0);
      expect(TWO_DAY_EXIT_POINTS[actor].y).toBeLessThan(WORLD_HEIGHT);
    }
    expect(TWO_DAY_TRANSITION_STATES).toEqual([
      "time-skip-black",
      "time-skip-title",
      "time-skip-return",
    ]);
  });
});
