import { describe, expect, it } from "vitest";

import {
  WORLD_ART_OBSTACLES,
  WORLD_DECORATIONS,
  WORLD_STRUCTURE_ART,
} from "../src/game/WorldArt";
import {
  WORLD_HEIGHT,
  WORLD_STRUCTURES,
  WORLD_WIDTH,
} from "../src/game/WorldLayout";

describe("WorldArt", () => {
  it("provides art for every collidable structure", () => {
    expect(
      WORLD_STRUCTURES.map(({ id }) => id).filter(
        (id) => WORLD_STRUCTURE_ART[id] === undefined,
      ),
    ).toEqual([]);
  });

  it("keeps decoration ids unique and placements inside the world", () => {
    const ids = WORLD_DECORATIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const { bounds } of [
      ...Object.values(WORLD_STRUCTURE_ART),
      ...WORLD_DECORATIONS,
    ]) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(WORLD_WIDTH);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(WORLD_HEIGHT);
    }
  });

  it("derives collision rectangles only from collidable decorations", () => {
    expect(WORLD_ART_OBSTACLES).toEqual(
      WORLD_DECORATIONS.flatMap(({ collision }) =>
        collision ? [collision] : [],
      ),
    );
  });

  it("uses multiply blending only for the approved olive-tree asset", () => {
    const blended = WORLD_DECORATIONS.filter(({ blendMode }) => blendMode);
    expect(blended.length).toBeGreaterThan(0);
    expect(blended.every(({ texture }) => texture === "world-olive-tree")).toBe(
      true,
    );
  });
});
