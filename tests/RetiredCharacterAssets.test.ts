import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CORE_POSE_SHEETS,
  DIRECTIONAL_CHARACTER_SHEETS,
  LAZARUS_SHEET,
  PORTRAIT_ASSETS,
  SUPPORTING_ACTION_SHEET,
  SUPPORTING_CHARACTER_SHEETS,
} from "../src/game/CharacterAssets";

const LEGACY_SOURCES = [
  "sprite-disciples-source.png",
  "sprite-jesus-source.png",
  "sprite-lazarus-source.png",
  "sprite-messenger-source.png",
  "sprite-sisters-source.png",
  "sprite-witnesses-source.png",
] as const;

const LEGACY_PORTRAITS = [
  "portrait-jesus.png",
  "portrait-martha.png",
  "portrait-mary.png",
  "portrait-witnesses.png",
] as const;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(css|html|js|mjs|py|ts|tsx)$/.test(entry.name) ? [path] : [];
  });

describe("retired character assets", () => {
  it("keeps legacy per-frame sprites, sources, and portrait panels absent", () => {
    const spriteDirectory = resolve("public/assets/art/sprites");
    const remainingSprites = existsSync(spriteDirectory)
      ? readdirSync(spriteDirectory, { recursive: true }).filter((entry) =>
          String(entry).endsWith(".png"),
        )
      : [];
    expect(remainingSprites).toEqual([]);
    for (const source of LEGACY_SOURCES) {
      expect(existsSync(resolve("production/art-source", source))).toBe(false);
    }
    for (const portrait of LEGACY_PORTRAITS) {
      expect(existsSync(resolve("public/assets/art", portrait))).toBe(false);
    }
  });

  it("keeps source and processing code free of retired references", () => {
    const sources = [
      ...sourceFiles("src"),
      ...sourceFiles("scripts"),
    ].map((path) => readFileSync(path, "utf8"));
    for (const source of sources) {
      expect(source).not.toContain("assets/art/sprites/");
      for (const name of [...LEGACY_SOURCES, ...LEGACY_PORTRAITS]) {
        expect(source).not.toContain(name);
      }
    }
  });

  it("keeps every approved replacement asset present", () => {
    const approvedPaths = [
      ...Object.values(DIRECTIONAL_CHARACTER_SHEETS).map((sheet) => sheet.path),
      ...Object.values(SUPPORTING_CHARACTER_SHEETS).map((sheet) => sheet.path),
      ...Object.values(CORE_POSE_SHEETS).map((sheet) => sheet.path),
      SUPPORTING_ACTION_SHEET.path,
      LAZARUS_SHEET.path,
      ...Object.values(PORTRAIT_ASSETS),
    ];
    expect(approvedPaths).toHaveLength(23);
    for (const path of approvedPaths) {
      const absolute = resolve("public", path);
      expect(existsSync(absolute)).toBe(true);
      expect(statSync(absolute).size).toBeGreaterThan(0);
    }
  });
});
