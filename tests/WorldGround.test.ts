import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const runtimeSource = readFileSync("src/game/WorldRuntime.ts", "utf8");

describe("retired stitched world ground", () => {
  it("is unreachable from the live runtime", () => {
    expect(sceneSource).not.toMatch(/from "\.\/WorldGround"/);
    expect(runtimeSource).not.toMatch(/from "\.\/WorldGround"/);
    expect(sceneSource).not.toContain("WORLD_GROUND_TILES");
  });
});
