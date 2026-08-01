import { describe, expect, it } from "vitest";

import {
  WORLD_COLUMNS,
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_ROWS,
  WORLD_TILE_SIZE,
  WORLD_WIDTH,
  createWorldNavigation,
  travelTimeSeconds,
} from "../src/game/WorldLayout";

describe("continuous Bethany world greybox", () => {
  it("uses the compact approved world dimensions", () => {
    expect(WORLD_COLUMNS).toBe(72);
    expect(WORLD_ROWS).toBe(48);
    expect(WORLD_TILE_SIZE).toBe(32);
    expect(WORLD_WIDTH).toBe(2304);
    expect(WORLD_HEIGHT).toBe(1536);
  });

  it("connects every required story destination", () => {
    const navigation = createWorldNavigation();
    const destinations = [
      WORLD_LANDMARKS.villageCenter,
      WORLD_LANDMARKS.jesusArrival,
      WORLD_LANDMARKS.tombEntrance,
      WORLD_LANDMARKS.jerusalemGate,
    ];

    for (const destination of destinations) {
      expect(
        navigation.findPath(WORLD_LANDMARKS.houseDoor, destination).length,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps required travel below twelve seconds", () => {
    expect(
      travelTimeSeconds(
        WORLD_LANDMARKS.houseDoor,
        WORLD_LANDMARKS.jesusArrival,
      ),
    ).toBeLessThan(12);
    expect(
      travelTimeSeconds(
        WORLD_LANDMARKS.houseDoor,
        WORLD_LANDMARKS.tombEntrance,
      ),
    ).toBeLessThan(12);
  });
});
