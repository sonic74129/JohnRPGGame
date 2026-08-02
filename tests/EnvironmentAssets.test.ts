import { describe, expect, it } from "vitest";

import {
  HOUSE_ART,
  HOUSE_DOOR_REENTRY_SPAWN,
  HOUSE_EXIT,
  HOUSE_FOREGROUND_PLACEMENTS,
  HOUSE_OBSTACLES,
  HOUSE_PLAYER_SPAWN,
  HOUSE_PROP_PLACEMENTS,
  HOUSE_SICK_LAZARUS_POSITION,
  HOUSE_SICK_LAZARUS_SIZE,
  HOUSE_SICK_LAZARUS_ANGLE,
  HOUSE_SICK_LAZARUS_DEPTH,
  HOUSE_SICK_LAZARUS_FLIP_X,
  INTERIOR_CHARACTER_SIZE,
} from "../src/game/EnvironmentAssets";

const contains = (
  point: { readonly x: number; readonly y: number },
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

describe("approved indoor environment contract", () => {
  it("uses the approved versioned runtime paths and atlas dimensions", () => {
    expect(HOUSE_ART).toMatchObject({
      width: 1360,
      height: 768,
      base: {
        path: "assets/art/environment/interior/environment__house-base/v1/run-001/environment__house-base.png",
      },
      foreground: {
        path: "assets/art/environment/interior/environment__house-foreground/v2/run-001/environment__house-foreground.png",
        frameWidth: 272,
        frameHeight: 768,
        frameCount: 5,
      },
      props: {
        path: "assets/art/environment/interior/props__house/v2/run-001/props__house.png",
        frameWidth: 340,
        frameHeight: 256,
        frameCount: 12,
      },
    });
  });

  it("keeps every placed frame inside its approved atlas and room", () => {
    for (const placement of [
      ...HOUSE_FOREGROUND_PLACEMENTS,
      ...HOUSE_PROP_PLACEMENTS,
    ]) {
      const atlas = HOUSE_ART[placement.atlas];
      expect(placement.frame).toBeGreaterThanOrEqual(0);
      expect(placement.frame).toBeLessThan(atlas.frameCount);
      expect(placement.anchor.x).toBeGreaterThan(0);
      expect(placement.anchor.x).toBeLessThan(HOUSE_ART.width);
      expect(placement.anchor.y).toBeGreaterThan(0);
      expect(placement.anchor.y).toBeLessThan(HOUSE_ART.height);
      if (placement.id === "bed") {
        expect(placement.depth).toBeLessThan(placement.anchor.y);
      } else {
        expect(placement.depth).toBeGreaterThanOrEqual(placement.anchor.y);
      }
    }
  });

  it("preserves believable indoor adult, doorway, bed and table scale", () => {
    const door = HOUSE_FOREGROUND_PLACEMENTS.find(({ id }) => id === "door-frame");
    const bed = HOUSE_FOREGROUND_PLACEMENTS.find(({ id }) => id === "bed");
    const table = HOUSE_FOREGROUND_PLACEMENTS.find(({ id }) => id === "table");

    expect(door).toBeDefined();
    expect(bed).toBeDefined();
    expect(table).toBeDefined();
    expect(door!.sourceBounds.height * door!.scale).toBeGreaterThan(
      INTERIOR_CHARACTER_SIZE.height * 0.9,
    );
    expect(door!.sourceBounds.height * door!.scale).toBeLessThan(
      INTERIOR_CHARACTER_SIZE.height * 1.1,
    );
    expect(bed!.sourceBounds.width * bed!.scale).toBeGreaterThan(
      HOUSE_SICK_LAZARUS_SIZE.width * 1.05,
    );
    expect(HOUSE_SICK_LAZARUS_POSITION.y).toBeLessThan(bed!.anchor.y);
    expect(HOUSE_SICK_LAZARUS_DEPTH).toBeGreaterThan(bed!.depth);
    expect(HOUSE_SICK_LAZARUS_ANGLE).toBeLessThan(0);
    expect(HOUSE_SICK_LAZARUS_FLIP_X).toBe(true);
    expect(table!.sourceBounds.width * table!.scale).toBeGreaterThan(
      INTERIOR_CHARACTER_SIZE.width,
    );
  });

  it("keeps the spawn and exterior doorway clear of furniture collision", () => {
    const furniture = HOUSE_OBSTACLES.slice(4);
    expect(furniture.some((bounds) => contains(HOUSE_PLAYER_SPAWN, bounds))).toBe(false);
    expect(
      furniture.some((bounds) => contains(HOUSE_DOOR_REENTRY_SPAWN, bounds)),
    ).toBe(false);
    expect(furniture.some((bounds) => contains(HOUSE_EXIT, bounds))).toBe(false);
  });

  it("keeps low floor props above the room's front gameplay edge", () => {
    for (const placement of HOUSE_PROP_PLACEMENTS) {
      expect(placement.anchor.y).toBeLessThanOrEqual(575);
    }
  });
});
