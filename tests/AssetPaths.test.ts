import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  allCharacterSheets,
  lazarusAssetPath,
} from "../src/game/CharacterSprites";

const SOURCE_FILES = [
  "src/audio/AudioManager.ts",
  "src/game/BethanyScene.ts",
  "src/ui/GameUI.ts",
] as const;

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

  it("keeps every character sheet path backed by a public file", () => {
    const paths = [
      ...allCharacterSheets().map((sheet) => sheet.path),
      lazarusAssetPath(),
    ];
    expect(paths.filter((path) => !publicPathExists(path))).toEqual([]);
  });
});
