import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MEMORY_CLUE_ATLAS,
  MEMORY_CLUE_FRAMES,
  isMemoryCarrier,
} from "../src/game/MemoryClueAssets";

describe("findJesus memory clue atlas", () => {
  it("uses the selected v1.2 runtime asset", () => {
    expect(MEMORY_CLUE_ATLAS).toMatchObject({
      width: 1360,
      height: 768,
    });
    expect(MEMORY_CLUE_ATLAS.path).toContain(
      "props__john-memory-clues/v1.2/run-001/props__john-memory-clues.png",
    );
    const atlas = readFileSync(resolve("public", MEMORY_CLUE_ATLAS.path));
    expect([atlas.readUInt32BE(16), atlas.readUInt32BE(20)]).toEqual([
      MEMORY_CLUE_ATLAS.width,
      MEMORY_CLUE_ATLAS.height,
    ]);
  });

  it("maps the three carriers to contiguous left-to-right frames", () => {
    expect(Object.values(MEMORY_CLUE_FRAMES)).toEqual([
      { name: "memory-clue-bread-and-fish", x: 0, width: 453 },
      { name: "memory-clue-water", x: 453, width: 454 },
      { name: "memory-clue-mud", x: 907, width: 453 },
    ]);
    expect(
      Object.values(MEMORY_CLUE_FRAMES).reduce(
        (width, frame) => width + frame.width,
        0,
      ),
    ).toBe(MEMORY_CLUE_ATLAS.width);
  });

  it("keeps memory carriers silent and contract-driven", () => {
    const scene = readFileSync("src/game/BethanyScene.ts", "utf8");

    expect(isMemoryCarrier("memory-carrier-bread")).toBe(true);
    expect(isMemoryCarrier("jesus")).toBe(false);
    expect(scene).not.toMatch(/memory-carrier-(?:bread|water|mud).*showDialogue/);
  });
});
