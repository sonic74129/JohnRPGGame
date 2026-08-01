import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FACINGS,
  lazarusAssetPath,
  spriteAssetPath,
  type LazarusPose,
  type SpriteCharacter,
} from "../src/game/CharacterSprites";

const SOURCE_FILES = [
  "src/audio/AudioManager.ts",
  "src/game/BethanyScene.ts",
  "src/ui/GameUI.ts",
] as const;

const SPRITE_CHARACTERS: readonly SpriteCharacter[] = [
  "messenger",
  "martha",
  "mary",
  "jesus",
  "mourner-man",
  "guide",
];

const LAZARUS_POSES: readonly LazarusPose[] = [
  "sick",
  "wrapped-idle",
  "wrapped-step",
  "restored",
];

const publicPathExists = (assetPath: string): boolean =>
  existsSync(resolve("public", assetPath));

describe("runtime asset paths", () => {
  it("keeps every literal source reference backed by a public file", () => {
    const paths = SOURCE_FILES.flatMap((sourceFile) => {
      const source = readFileSync(sourceFile, "utf8");
      return [...source.matchAll(/["'`](assets\/[^"'`]+)["'`]/g)].flatMap(
        (match) => (match[1] ? [match[1]] : []),
      );
    });

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((path) => !publicPathExists(path))).toEqual([]);
  });

  it("keeps every generated character sprite path backed by a public file", () => {
    const missing: string[] = [];
    for (const character of SPRITE_CHARACTERS) {
      for (const facing of FACINGS) {
        const poses =
          character === "messenger" ||
          character === "martha" ||
          character === "mary" ||
          character === "jesus"
            ? (["idle", "step-left", "step-right"] as const)
            : (["idle"] as const);
        for (const pose of poses) {
          const path = spriteAssetPath(character, facing, pose);
          if (!publicPathExists(path)) {
            missing.push(path);
          }
        }
      }
    }
    for (const pose of LAZARUS_POSES) {
      const path = lazarusAssetPath(pose);
      if (!publicPathExists(path)) {
        missing.push(path);
      }
    }

    expect(missing).toEqual([]);
  });
});
