import { describe, expect, it } from "vitest";

import {
  TOMB_PROP_ASSETS,
  TOMB_PROP_PLACEMENTS,
  TOMB_STONE_PLACEMENT,
} from "../src/game/TombAssets";

describe("continuous-world tomb props", () => {
  it("maps all eight refreshed runtime assets exactly once", () => {
    expect(Object.keys(TOMB_PROP_ASSETS)).toHaveLength(8);
    expect(new Set(Object.values(TOMB_PROP_ASSETS).map(({ key }) => key)).size).toBe(
      8,
    );
    expect(Object.values(TOMB_PROP_ASSETS).map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "assets/art/props/tomb-stone.png",
        "assets/art/props/tomb-stone-rolled.png",
        "assets/art/props/tomb-cave-lip.png",
        "assets/art/props/burial-cloth-folded.png",
        "assets/art/props/burial-cloth-strips.png",
        "assets/art/props/tomb-dust.png",
        "assets/art/props/tomb-rubble.png",
        "assets/art/props/tomb-plant.png",
      ]),
    );
  });

  it("uses every non-stone prop in the tomb composition", () => {
    expect(TOMB_PROP_PLACEMENTS.map(({ id }) => id)).toEqual([
      "clothFolded",
      "caveLip",
      "clothStrips",
      "dust",
      "rubble",
      "plant",
    ]);
  });

  it("keeps the cave lip as a native-size low foreground occluder", () => {
    const caveLip = TOMB_PROP_PLACEMENTS.find(({ id }) => id === "caveLip");
    const foldedCloth = TOMB_PROP_PLACEMENTS.find(
      ({ id }) => id === "clothFolded",
    );

    expect(caveLip).toMatchObject({
      width: 275,
      height: 94,
      depth: 455,
    });
    expect(caveLip!.depth).toBeGreaterThan(TOMB_STONE_PLACEMENT.depth);
    expect(caveLip!.depth).toBeGreaterThan(foldedCloth!.depth);
  });
});
