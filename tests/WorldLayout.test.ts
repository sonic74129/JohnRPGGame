import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  WORLD_MAP_FALLBACK_URL,
  WORLD_MAP_RUNTIME_URL,
  WORLD_NAVIGATION_CLEARANCE,
  WORLD_ROUTES,
  WORLD_SELECTED_PROFILE,
  WORLD_STRUCTURE_OBSTACLES,
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

  it("keeps click-to-move waypoints clear of player-sized structures", () => {
    const path = createWorldNavigation().findPath(
      {
        x: WORLD_LANDMARKS.bethanyMeeting.x - 160,
        y: WORLD_LANDMARKS.bethanyMeeting.y + 120,
      },
      { x: 650, y: 1192 },
    );

    expect(path.length).toBeGreaterThan(0);
    for (const waypoint of path) {
      for (const obstacle of WORLD_STRUCTURE_OBSTACLES) {
        const horizontalDistance = Math.max(
          obstacle.x - waypoint.x,
          0,
          waypoint.x - (obstacle.x + obstacle.width),
        );
        const verticalDistance = Math.max(
          obstacle.y - waypoint.y,
          0,
          waypoint.y - (obstacle.y + obstacle.height),
        );
        expect(Math.hypot(horizontalDistance, verticalDistance)).toBeGreaterThanOrEqual(
          WORLD_NAVIGATION_CLEARANCE,
        );
      }
    }
  });

  it("keeps the village-to-cemetery experience route within 1000–1300px", () => {
    const distance = routeLength(WORLD_ROUTES.villageToTomb.points);

    expect(distance).toBeGreaterThanOrEqual(1000);
    expect(distance).toBeLessThanOrEqual(1300);
  });
});
