import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  allCharacterSheets,
  lazarusAssetPath,
} from "../src/game/CharacterSprites";
import { PORTRAIT_ASSETS } from "../src/game/CharacterAssets";

const SOURCE_FILES = [
  "src/audio/AudioManager.ts",
  "src/game/BethanyScene.ts",
  "src/ui/GameUI.ts",
] as const;

const publicPathExists = (assetPath: string): boolean =>
  existsSync(resolve("public", assetPath));

const artManifestPaths = (): string[] => {
  const manifest = JSON.parse(
    readFileSync(resolve("public/assets/art/manifest.json"), "utf8"),
  ) as {
    readonly files: Readonly<Record<string, string>>;
  };
  return Object.keys(manifest.files);
};

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

  it("keeps every art manifest path backed by a public file", () => {
    const missing = artManifestPaths().filter(
      (path) => !publicPathExists(`assets/art/${path}`),
    );
    expect(missing).toEqual([]);
  });

  it("keeps manifest portraits aligned with the runtime portrait registry", () => {
    const manifestPortraits = artManifestPaths()
      .filter((path) => path.startsWith("portrait/"))
      .sort();
    const runtimePortraits = Object.values(PORTRAIT_ASSETS)
      .map((path) => path.replace(/^assets\/art\//, ""))
      .sort();

    expect(manifestPortraits).toEqual(runtimePortraits);
  });
});
