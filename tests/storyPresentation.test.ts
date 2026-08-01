import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { JOHN_11_VERSES } from "../src/game/ScriptureContent";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const gameSource = readdirSync("src/game")
  .filter((name) => name.endsWith(".ts"))
  .map((name) => readFileSync(`src/game/${name}`, "utf8"))
  .join("\n");

describe("Scripture-only live story presentation", () => {
  it("renders the new Scripture contracts instead of legacy content.ts", () => {
    expect(Object.values(JOHN_11_VERSES)).toHaveLength(46);
    expect(sceneSource).toContain("JOHN_11_VERSES");
    expect(sceneSource).not.toMatch(/from "\.\/content"/);
  });

  it("removes retired invented content from the game source", () => {
    expect(gameSource).not.toMatch(
      /followGuide|chooseGuide|姐姐……拉撒路还是很虚弱|情境重现|小组回顾|报信的人|两天后，耶稣与报信者|older-witness-rising|mourner-kneeling-grief/,
    );
    expect(gameSource).not.toContain("StoryStage");
    expect(gameSource).not.toContain("DIALOGUES");
  });
});
