import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RETIRED_STORY_ASSETS = [
  "opening-sickroom.png",
  "journey-to-jesus.png",
  "bethany-village.png",
  "tomb-garden.png",
  "story-martha-meets-jesus.png",
  "story-jesus-weeps.png",
  "story-lazarus-comes-out.png",
  "story-ending-reflection.png",
] as const;

describe("retired story environment assets", () => {
  it("keeps cinematic and story illustrations out of public runtime assets", () => {
    for (const filename of RETIRED_STORY_ASSETS) {
      expect(existsSync(resolve("public/assets/art", filename))).toBe(false);
    }
  });

  it("keeps runtime source free of cinematic and story illustration paths", () => {
    const runtimeSource = [
      "src/game/BethanyScene.ts",
      "src/ui/GameUI.ts",
      "src/main.ts",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    for (const filename of RETIRED_STORY_ASSETS) {
      expect(runtimeSource).not.toContain(filename);
    }
  });
});
