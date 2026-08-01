import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type Range = { min: number; max: number };
type Point = { x: number; y: number };
type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };

interface Profile {
  referencePersonHeight: number;
  smallHouseVisibleHeight: number;
  smallHouseToPersonRatio: number;
  doorClearHeight: number;
  doorToPersonRatio: number;
  mainRoadWidth: number;
  secondaryRoadWidth: number;
}

interface WorldMapLayout {
  schemaVersion: string;
  canvas: { width: number; height: number; north: string; safeBorder: number };
  regions: Record<string, { bounds?: Bounds; center?: Point; points?: Point[] }>;
  sharedDimensions: {
    roads: { main: Range; secondary: Range };
    villageHouse: { visibleHeight: Range };
  };
  profiles: Record<"A" | "B" | "C", Profile>;
  review: {
    spriteHeights: number[];
    locations: string[];
    approvedSpriteSources: string[];
    scores: Record<string, { passesHardCriteria: boolean }>;
  };
  selectedProfile: "A" | "B" | "C";
  lockedScale: Profile & {
    personHeight: number;
    villageHouseVisibleHeight: Range;
  };
}

const layout = JSON.parse(
  readFileSync("art/world-map-layout.json", "utf8"),
) as WorldMapLayout;

describe("world-map layout and scale contract", () => {
  it("locks the exact continuous-world geography", () => {
    expect(layout.schemaVersion).toBe("1.0.0");
    expect(layout.canvas).toEqual({
      width: 2720,
      height: 1536,
      north: "top",
      safeBorder: 96,
    });
    expect(layout.regions.marthaCompound.bounds).toEqual({
      xMin: 180,
      xMax: 760,
      yMin: 880,
      yMax: 1430,
    });
    expect(layout.regions.marthaCompound).toMatchObject({
      door: { x: 520, y: 1110 },
    });
    expect(layout.regions.village).toMatchObject({
      bounds: { xMin: 680, xMax: 1520, yMin: 600, yMax: 1240 },
      center: { x: 1040, y: 900 },
    });
    expect(layout.regions.meetingArea).toMatchObject({
      bounds: { xMin: 1450, xMax: 1850, yMin: 900, yMax: 1220 },
      center: { x: 1640, y: 1050 },
    });
    expect(layout.regions.jesusCamp).toMatchObject({
      bounds: { xMin: 1960, xMax: 2580, yMin: 1030, yMax: 1430 },
      center: { x: 2260, y: 1260 },
    });
    expect(layout.regions.tombRoute.points).toEqual([
      { x: 1450, y: 720 },
      { x: 1770, y: 560 },
      { x: 2020, y: 450 },
    ]);
    expect(layout.regions.tombGarden).toMatchObject({
      bounds: { xMin: 1950, xMax: 2580, yMin: 100, yMax: 610 },
      center: { x: 2220, y: 360 },
      stoneReserve: { width: 120, height: 120 },
    });
  });

  it("compares the three required profiles using real approved sprites", () => {
    expect(layout.review.spriteHeights).toEqual([84, 90, 96]);
    expect(layout.review.locations).toEqual([
      "houseDoor",
      "villageWell",
      "jesusCamp",
      "tombRoad",
      "tombEntrance",
    ]);
    expect(layout.review.approvedSpriteSources).toHaveLength(3);
    for (const path of layout.review.approvedSpriteSources) {
      expect(path).toMatch(/character__/);
      expect(() => readFileSync(path)).not.toThrow();
    }

    expect(layout.profiles.A.smallHouseToPersonRatio).toBeGreaterThanOrEqual(2.7);
    expect(layout.profiles.A.smallHouseToPersonRatio).toBeLessThanOrEqual(3);
    expect(layout.profiles.B.smallHouseToPersonRatio).toBeGreaterThanOrEqual(2.25);
    expect(layout.profiles.B.smallHouseToPersonRatio).toBeLessThanOrEqual(2.6);
    expect(layout.profiles.C.smallHouseToPersonRatio).toBeGreaterThanOrEqual(2);
    expect(layout.profiles.C.smallHouseToPersonRatio).toBeLessThanOrEqual(2.25);
  });

  it("locks the passing preferred profile to measurable gameplay ratios", () => {
    expect(layout.selectedProfile).toBe("B");
    expect(layout.review.scores.B.passesHardCriteria).toBe(true);
    expect(layout.lockedScale.personHeight).toBe(90);
    expect(layout.lockedScale.smallHouseVisibleHeight).toBe(230);
    expect(layout.lockedScale.smallHouseToPersonRatio).toBeCloseTo(
      layout.lockedScale.smallHouseVisibleHeight / layout.lockedScale.personHeight,
      2,
    );
    expect(layout.lockedScale.doorToPersonRatio).toBeGreaterThanOrEqual(1.15);
    expect(layout.lockedScale.doorToPersonRatio).toBeLessThanOrEqual(1.35);
    expect(layout.lockedScale.doorClearHeight).toBe(108);
    expect(layout.lockedScale.mainRoadWidth).toBeGreaterThanOrEqual(
      layout.sharedDimensions.roads.main.min,
    );
    expect(layout.lockedScale.mainRoadWidth).toBeLessThanOrEqual(
      layout.sharedDimensions.roads.main.max,
    );
    expect(layout.lockedScale.secondaryRoadWidth).toBeGreaterThanOrEqual(
      layout.sharedDimensions.roads.secondary.min,
    );
    expect(layout.lockedScale.secondaryRoadWidth).toBeLessThanOrEqual(
      layout.sharedDimensions.roads.secondary.max,
    );
    expect(layout.lockedScale.villageHouseVisibleHeight).toEqual({
      min: 215,
      max: 235,
    });
  });
});
