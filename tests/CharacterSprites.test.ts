import { describe, expect, it } from "vitest";

import {
  hasWalkFrames,
  resolveFacing,
  spriteTextureKey,
  walkFrameKeys,
} from "../src/game/CharacterSprites";

describe("character sprite helpers", () => {
  it.each([
    [0, 1, "front"],
    [0, -1, "back"],
    [-1, 0, "left"],
    [1, 0, "right"],
  ] as const)("resolves %s, %s to %s", (x, y, expected) => {
    expect(resolveFacing(x, y, "front")).toBe(expected);
  });

  it("keeps the most recent facing while stopped", () => {
    expect(resolveFacing(0, 0, "left")).toBe("left");
  });

  it("only creates walking frames for characters that have them", () => {
    expect(hasWalkFrames("martha")).toBe(true);
    expect(hasWalkFrames("mourner-man")).toBe(false);
    expect(walkFrameKeys("martha", "right")).toEqual([
      spriteTextureKey("martha", "right", "step-left"),
      spriteTextureKey("martha", "right", "idle"),
      spriteTextureKey("martha", "right", "step-right"),
      spriteTextureKey("martha", "right", "idle"),
    ]);
  });
});
