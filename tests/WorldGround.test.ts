import { describe, expect, it } from "vitest";

import {
  WORLD_GROUND_ASSET,
  WORLD_GROUND_BASE_FRAME_CROP,
  WORLD_GROUND_COLUMNS,
  WORLD_GROUND_FRAME_CROP,
  WORLD_GROUND_ROAD_CELLS,
  WORLD_GROUND_ROWS,
  WORLD_GROUND_RENDER_SIZE,
  WORLD_GROUND_TILES,
  worldGroundBaseFrame,
  worldGroundInnerFrame,
  worldPointToGroundCell,
} from "../src/game/WorldGround";
import { WORLD_LANDMARKS, WORLD_ROUTES } from "../src/game/WorldLayout";

describe("approved continuous world ground", () => {
  it("loads the approved versioned 4x4 runtime atlas", () => {
    expect(WORLD_GROUND_ASSET).toEqual({
      key: "world-ground-atlas",
      path: "assets/art/environment/environment__world-ground/v2/run-001/environment__world-ground.png",
      width: 1024,
      height: 1024,
      frameWidth: 256,
      frameHeight: 256,
      frameCount: 16,
    });
  });

  it("covers the complete world with one base tile per cell", () => {
    const baseTiles = WORLD_GROUND_TILES.filter(({ layer }) => layer === "base");
    expect(baseTiles).toHaveLength(WORLD_GROUND_COLUMNS * WORLD_GROUND_ROWS);
    expect(
      new Set(baseTiles.map(({ column, row }) => `${column},${row}`)).size,
    ).toBe(baseTiles.length);
  });

  it("keeps every route point and story landmark on the road network", () => {
    const requiredPoints = [
      ...WORLD_ROUTES.flatMap(({ points }) => points),
      WORLD_LANDMARKS.jerusalemGate,
      WORLD_LANDMARKS.houseDoor,
      WORLD_LANDMARKS.villageCenter,
      WORLD_LANDMARKS.bethanyEntrance,
      WORLD_LANDMARKS.jesusArrival,
      WORLD_LANDMARKS.tombRoadStart,
      WORLD_LANDMARKS.tombEntrance,
    ];
    for (const point of requiredPoints) {
      const { column, row } = worldPointToGroundCell(point);
      expect(WORLD_GROUND_ROAD_CELLS.has(`${column},${row}`)).toBe(true);
    }
  });

  it("uses only approved atlas frames", () => {
    for (const tile of WORLD_GROUND_TILES) {
      expect(tile.frame).toBeGreaterThanOrEqual(0);
      expect(tile.frame).toBeLessThan(WORLD_GROUND_ASSET.frameCount);
      expect([0, 90, 180, 270]).toContain(tile.angle);
    }
  });

  it("varies approved base frames and rotations deterministically", () => {
    const baseTiles = WORLD_GROUND_TILES.filter(({ layer }) => layer === "base");
    const frames = new Set(baseTiles.map(({ frame }) => frame));
    const angles = new Set(baseTiles.map(({ angle }) => angle));

    expect(frames).toEqual(new Set([0, 12]));
    expect(angles).toEqual(new Set([0, 90, 180, 270]));
    expect(baseTiles.slice(0, 6).map(({ frame, angle }) => [frame, angle])).toEqual([
      [0, 270],
      [12, 0],
      [0, 90],
      [12, 180],
      [0, 270],
      [12, 0],
    ]);
  });

  it("varies compatible straight-road frames without changing route cells", () => {
    const straightRoadFrames = new Set(
      WORLD_GROUND_TILES.filter(
        ({ layer, frame }) =>
          layer === "road" && (frame === 2 || frame === 5 || frame === 10),
      ).map(({ frame }) => frame),
    );

    expect(straightRoadFrames).toEqual(new Set([2, 5, 10]));
  });

  it("crops atlas borders and slightly overlaps adjacent runtime cells", () => {
    expect(WORLD_GROUND_FRAME_CROP).toBe(10);
    expect(WORLD_GROUND_BASE_FRAME_CROP).toBe(92);
    expect(WORLD_GROUND_BASE_FRAME_CROP).toBeGreaterThan(
      WORLD_GROUND_FRAME_CROP,
    );
    expect(WORLD_GROUND_RENDER_SIZE).toBeGreaterThan(128);
    expect(worldGroundInnerFrame(15)).toBe("world-ground-inner-15");
    expect(worldGroundBaseFrame(12)).toBe("world-ground-base-12");
  });
});
