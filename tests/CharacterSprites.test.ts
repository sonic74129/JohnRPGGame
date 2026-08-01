import { describe, expect, it } from "vitest";

import {
  LAZARUS_POSES,
  hasWalkFrames,
  lazarusAssetPath,
  lazarusDisplaySize,
  lazarusTextureKey,
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

  it("resolves every Lazarus event pose through one asset contract", () => {
    expect(LAZARUS_POSES).toEqual([
      "sick",
      "wrapped-idle",
      "wrapped-step",
      "restored",
    ]);
    expect(lazarusTextureKey("sick")).toBe("sprite-lazarus-sick");
    expect(lazarusAssetPath("wrapped-step")).toBe(
      "assets/art/sprites/lazarus/wrapped-step.png",
    );
    expect(lazarusTextureKey("restored")).toBe("sprite-lazarus-restored");
  });

  it("keeps Lazarus display sizes proportional to their source canvases", () => {
    expect(lazarusDisplaySize("sick")).toEqual({ width: 280, height: 190 });
    expect(lazarusDisplaySize("wrapped-idle")).toEqual({
      width: 78,
      height: 72,
    });
    expect(lazarusDisplaySize("wrapped-step")).toEqual({
      width: 78,
      height: 72,
    });
    expect(lazarusDisplaySize("restored")).toEqual({
      width: 84,
      height: 78,
    });
  });
});
