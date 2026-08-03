import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const runtimeSource = readFileSync("src/game/WorldRuntime.ts", "utf8");

describe("retired stitched WorldArt runtime", () => {
  it("does not feed live structures or decorations", () => {
    expect(sceneSource).not.toMatch(/from "\.\/WorldArt"/);
    expect(runtimeSource).not.toMatch(/from "\.\/WorldArt"/);
    expect(runtimeSource).not.toContain("WORLD_DECORATIONS");
    expect(runtimeSource).not.toContain("WORLD_STRUCTURES");
  });
});
