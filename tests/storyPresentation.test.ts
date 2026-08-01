import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { JOHN_11_VERSES } from "../src/game/ScriptureContent";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");

describe("Scripture-only live story presentation", () => {
  it("renders the new Scripture contracts instead of legacy content.ts", () => {
    expect(Object.values(JOHN_11_VERSES)).toHaveLength(46);
    expect(sceneSource).toContain("JOHN_11_VERSES");
    expect(sceneSource).not.toMatch(/from "\.\/content"/);
  });

  it("keeps invented stage guidance unreachable", () => {
    expect(sceneSource).not.toMatch(
      /followGuide|older-witness-rising|mourner-kneeling-grief|报信的人|两天后，耶稣与报信者/,
    );
  });
});
