import { describe, expect, it } from "vitest";

import {
  actorSpriteCharacter,
  allCharacterSheets,
  characterOriginY,
  hasWalkFrames,
  lazarusAssetPath,
  lazarusFrame,
  lazarusScaleToFit,
  lazarusTextureKey,
  resolveFacing,
  spriteFrame,
  spriteTextureKey,
  walkFrames,
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

  it("uses one sheet key and numbered frames for walking", () => {
    expect(hasWalkFrames("martha")).toBe(true);
    expect(hasWalkFrames("mourner-man")).toBe(false);
    expect(walkFrames("martha", "right")).toEqual([
      { key: "character-martha", frame: 7 },
      { key: "character-martha", frame: 6 },
      { key: "character-martha", frame: 8 },
      { key: "character-martha", frame: 6 },
    ]);
    expect(spriteTextureKey("mary")).toBe("character-mary");
    expect(spriteFrame("mary", "left", "idle")).toBe(9);
  });

  it("maps every staged actor to an approved sheet identity", () => {
    expect(actorSpriteCharacter("mourner")).toBe("mourner-man");
    expect(actorSpriteCharacter("mourner-woman")).toBe("mourner-woman");
    expect(actorSpriteCharacter("guide")).toBe("guide");
    expect(actorSpriteCharacter("older-witness")).toBe("older-witness");
    expect(actorSpriteCharacter("thomas")).toBe("thomas");
    expect(actorSpriteCharacter("older-disciple")).toBe("older-disciple");
    expect(actorSpriteCharacter("younger-disciple")).toBe("younger-disciple");
    expect(allCharacterSheets()).toHaveLength(6);
  });

  it("uses approved foot baselines as sprite origins", () => {
    expect(characterOriginY("messenger")).toBeCloseTo(201 / 208);
    expect(characterOriginY("martha")).toBeCloseTo(185 / 192);
    expect(characterOriginY("guide")).toBeCloseTo(186 / 194);
  });

  it("resolves Lazarus states through one sheet without distortion", () => {
    expect(lazarusTextureKey()).toBe("character-lazarus");
    expect(lazarusAssetPath()).toContain("character__lazarus.png");
    expect(lazarusFrame("sick")).toBe(0);
    expect(lazarusFrame("wrapped-step")).toBe(2);
    expect(lazarusFrame("restored")).toBe(3);
    expect(
      lazarusScaleToFit("sick", { width: 205, height: 139 }),
    ).toBeCloseTo(205 / 387);
    expect(
      lazarusScaleToFit("wrapped-idle", { width: 78, height: 72 }),
    ).toBeCloseTo(72 / 524);
  });
});
