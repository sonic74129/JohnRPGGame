import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_MAP_FALLBACK_URL,
  WORLD_MAP_RUNTIME_URL,
  WORLD_ROUTES,
  WORLD_SELECTED_PROFILE,
  WORLD_WIDTH,
  createWorldNavigation,
  routeLength,
} from "../src/game/WorldLayout";

describe("JSON-driven continuous Bethany world", () => {
  it("uses the locked canvas and Profile B", () => {
    expect(WORLD_WIDTH).toBe(2720);
    expect(WORLD_HEIGHT).toBe(1536);
    expect(WORLD_SELECTED_PROFILE).toBe("B");
    expect(WORLD_MAP_RUNTIME_URL).toContain(
      "environment__world-map/v1.1/run-001/environment__world-map.png",
    );
    const runtimeMap = readFileSync(resolve("public", WORLD_MAP_RUNTIME_URL));
    expect([
      runtimeMap.readUInt32BE(16),
      runtimeMap.readUInt32BE(20),
    ]).toEqual([WORLD_WIDTH, WORLD_HEIGHT]);
    expect(WORLD_MAP_FALLBACK_URL).toContain("world-map-graybox-b.png");
  });

  it("connects every required story destination", () => {
    const navigation = createWorldNavigation();
    for (const destination of [
      WORLD_LANDMARKS.villageCenter,
      WORLD_LANDMARKS.jesusCamp,
      WORLD_LANDMARKS.bethanyMeeting,
      WORLD_LANDMARKS.tombEntrance,
      WORLD_LANDMARKS.tombGarden,
    ]) {
      expect(
        navigation.findPath(WORLD_LANDMARKS.houseDoor, destination).length,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps the village-to-cemetery experience route within 1000–1300px", () => {
    const distance = routeLength(WORLD_ROUTES.villageToTomb.points);

    expect(distance).toBeGreaterThanOrEqual(1000);
    expect(distance).toBeLessThanOrEqual(1300);
  });
});
