import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  TOMB_ANCHORS,
  type TombBounds,
  type TombPoint,
} from "../src/game/TombAnchors";

const pointInside = (point: TombPoint, bounds: TombBounds): boolean =>
  point.x >= bounds.xMin &&
  point.x <= bounds.xMax &&
  point.y >= bounds.yMin &&
  point.y <= bounds.yMax;

const boundsOverlap = (first: TombBounds, second: TombBounds): boolean =>
  first.xMin < second.xMax &&
  first.xMax > second.xMin &&
  first.yMin < second.yMax &&
  first.yMax > second.yMin;

const boundsCenter = (bounds: TombBounds): TombPoint => ({
  x: (bounds.xMin + bounds.xMax) / 2,
  y: (bounds.yMin + bounds.yMax) / 2,
});

const boundsInside = (inner: TombBounds, outer: TombBounds): boolean =>
  inner.xMin >= outer.xMin &&
  inner.xMax <= outer.xMax &&
  inner.yMin >= outer.yMin &&
  inner.yMax <= outer.yMax;

const overlapArea = (first: TombBounds, second: TombBounds): number =>
  Math.max(0, Math.min(first.xMax, second.xMax) - Math.max(first.xMin, second.xMin)) *
  Math.max(0, Math.min(first.yMax, second.yMax) - Math.max(first.yMin, second.yMin));

describe("TombAnchors", () => {
  it("keeps point anchors inside the tomb garden", () => {
    const garden = TOMB_ANCHORS.source.gardenBounds;
    const points = [
      TOMB_ANCHORS.tombApproach,
      TOMB_ANCHORS.tombMouth.center,
      TOMB_ANCHORS.tombGathering.center,
      TOMB_ANCHORS.cameraFocus,
      TOMB_ANCHORS.stone.rolledTarget.center,
      TOMB_ANCHORS.lazarus.hiddenStart,
      TOMB_ANCHORS.lazarus.emergenceTarget,
      ...Object.values(TOMB_ANCHORS.tombGathering.groupPositions),
    ];

    points.forEach((point) => {
      expect(pointInside(point, garden)).toBe(true);
    });
  });

  it("separates the route approach from the pixel-checked cave mouth", () => {
    expect(TOMB_ANCHORS.tombApproach).toEqual({ x: 2020, y: 450 });
    expect(TOMB_ANCHORS.tombMouth.center).toEqual({ x: 2405, y: 245 });
    expect(TOMB_ANCHORS.tombMouth.darkOpeningBounds).toEqual({
      xMin: 2353,
      xMax: 2458,
      yMin: 142,
      yMax: 242,
    });
    expect(TOMB_ANCHORS.tombApproach).not.toEqual(
      TOMB_ANCHORS.tombMouth.center,
    );
    expect(
      Math.hypot(
        TOMB_ANCHORS.tombApproach.x - TOMB_ANCHORS.tombMouth.center.x,
        TOMB_ANCHORS.tombApproach.y - TOMB_ANCHORS.tombMouth.center.y,
      ),
    ).toBeGreaterThan(400);
  });

  it("blocks the mouth with a 120 square stone, then rolls right and clear", () => {
    const { stone, tombMouth } = TOMB_ANCHORS;
    expect(stone.initialBounds.xMax - stone.initialBounds.xMin).toBe(120);
    expect(stone.initialBounds.yMax - stone.initialBounds.yMin).toBe(120);
    expect(pointInside(tombMouth.center, stone.initialBounds)).toBe(true);
    expect(boundsOverlap(stone.initialBounds, tombMouth.visualBounds)).toBe(
      true,
    );
    expect(
      overlapArea(stone.initialBounds, tombMouth.visualBounds) /
        (stone.size.width * stone.size.height),
    ).toBeGreaterThan(0.7);

    expect(stone.rollDelta).toEqual({ x: 140, y: 110 });
    expect(stone.rollDelta.x).toBeGreaterThan(stone.rollDelta.y);
    expect(stone.rollDistance).toBeCloseTo(
      Math.hypot(stone.rollDelta.x, stone.rollDelta.y),
      3,
    );
    expect(stone.rollDistance).toBeGreaterThanOrEqual(170);
    expect(stone.rollDistance).toBeLessThanOrEqual(220);
    expect(stone.rolledTarget.center.x).toBeGreaterThan(
      tombMouth.center.x,
    );
    expect(boundsOverlap(stone.rolledTarget.bounds, tombMouth.visualBounds)).toBe(
      false,
    );
    expect(
      boundsInside(stone.initialBounds, TOMB_ANCHORS.source.gardenBounds),
    ).toBe(true);
    expect(
      boundsInside(stone.rolledTarget.bounds, TOMB_ANCHORS.source.gardenBounds),
    ).toBe(true);
    expect(boundsCenter(stone.rolledTarget.bounds)).toEqual(
      stone.rolledTarget.center,
    );
  });

  it("starts Lazarus in the mouth and ends his path outside it", () => {
    const { lazarus, tombMouth } = TOMB_ANCHORS;
    expect(lazarus.path[0]).toEqual(lazarus.hiddenStart);
    expect(lazarus.path.at(-1)).toEqual(lazarus.emergenceTarget);
    expect(pointInside(lazarus.hiddenStart, tombMouth.visualBounds)).toBe(true);
    expect(pointInside(lazarus.emergenceTarget, tombMouth.visualBounds)).toBe(
      false,
    );
    expect(lazarus.emergenceTarget.y).toBeGreaterThan(
      tombMouth.visualBounds.yMax,
    );
  });

  it("keeps every gathering position clear of the opening", () => {
    const mouth = TOMB_ANCHORS.tombMouth.visualBounds;
    const openingClearance = {
      xMin: mouth.xMin - 32,
      xMax: mouth.xMax + 32,
      yMin: mouth.yMin - 32,
      yMax: mouth.yMax + 32,
    };
    Object.values(TOMB_ANCHORS.tombGathering.groupPositions).forEach(
      (position) => {
        expect(pointInside(position, openingClearance)).toBe(false);
      },
    );
  });

  it("defines collider state changes without closing the cleared mouth", () => {
    expect(TOMB_ANCHORS.colliderIntent).toEqual({
      stoneUsesRectangularBounds: true,
      stoneColliderMovesWithRoll: true,
      stoneBlocksMouthInitially: true,
      mouthPassableAfterRoll: true,
      lazarusNonCollidingWhileHidden: true,
      lazarusCollidingAfterEmergence: true,
    });
  });

  it("ships the source assets, generator, and bounded debug overlay", () => {
    expect(existsSync(TOMB_ANCHORS.source.candidatePath)).toBe(true);
    expect(existsSync(TOMB_ANCHORS.source.runtimeAssetPath)).toBe(true);
    expect(existsSync("scripts/build-tomb-anchor-overlay.py")).toBe(true);
    expect(existsSync(TOMB_ANCHORS.source.debugOverlayPath)).toBe(true);

    const png = readFileSync(TOMB_ANCHORS.source.debugOverlayPath);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect({ width, height }).toEqual({ width: 1360, height: 768 });
    expect(Math.max(width, height)).toBeLessThanOrEqual(1600);
  });
});
