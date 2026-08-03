import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CORE_POSES,
  DIRECTIONAL_CHARACTER_SHEETS,
  LAZARUS_SHEET,
  PORTRAIT_ASSETS,
  SUPPORTING_ACTIONS,
  SUPPORTING_ACTION_SHEET,
  SUPPORTING_CHARACTER_SHEETS,
  corePoseFrame,
  directionalFrame,
  lazarusFrame,
  supportingActionFrame,
  supportingFrame,
} from "../src/game/CharacterAssets";

const pngSize = (assetPath: string): readonly [number, number] => {
  const png = readFileSync(resolve("public", assetPath));
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

describe("approved character asset contracts", () => {
  it("maps normalized directional frames without runtime mirroring", () => {
    expect(directionalFrame("messenger", "front", "idle")).toBe(0);
    expect(directionalFrame("messenger", "left", "step-right")).toBe(11);
    expect(directionalFrame("martha", "right", "idle")).toBe(6);
    expect(DIRECTIONAL_CHARACTER_SHEETS.martha.sourceMirroredFacings).toEqual([]);
    expect(DIRECTIONAL_CHARACTER_SHEETS.messenger.sourceMirroredFacings).toEqual([
      "left",
    ]);
    expect(DIRECTIONAL_CHARACTER_SHEETS.mary.sourceMirroredFacings).toEqual([
      "left",
    ]);
    expect(DIRECTIONAL_CHARACTER_SHEETS.jesus.sourceMirroredFacings).toEqual([
      "left",
    ]);
  });

  it("maps every supporting identity to the repacked approved sheets", () => {
    expect(SUPPORTING_CHARACTER_SHEETS.disciples).toMatchObject({
      frameWidth: 128,
      frameHeight: 249,
    });
    expect(SUPPORTING_CHARACTER_SHEETS.witnesses).toMatchObject({
      frameWidth: 133,
      frameHeight: 194,
    });
    expect(supportingFrame("thomas", "front")).toBe(0);
    expect(supportingFrame("younger-disciple", "right")).toBe(11);
    expect(supportingFrame("guide", "left")).toBe(10);
    expect(supportingFrame("older-witness", "right")).toBe(15);
  });

  it("maps Lazarus and all approved special poses by semantic name", () => {
    expect(LAZARUS_SHEET).toMatchObject({
      frameWidth: 400,
      frameHeight: 544,
    });
    expect(lazarusFrame("sick")).toBe(0);
    expect(lazarusFrame("restored")).toBe(3);
    expect(CORE_POSES.martha).toContain("quiet-call");
    expect(CORE_POSES.mary).toContain("kneeling-grief");
    expect(CORE_POSES.jesus).toContain("authoritative-call");
    expect(corePoseFrame("jesus", "restrained-prayer")).toBe(3);
    expect(SUPPORTING_ACTIONS).toEqual([
      "thomas-listening",
      "stone-moving",
    ]);
    expect(supportingActionFrame("thomas-listening")).toBe(3);
    expect(supportingActionFrame("stone-moving")).toBe(7);
  });

  it("keeps sheet dimensions aligned with the committed PNGs", () => {
    for (const sheet of Object.values(DIRECTIONAL_CHARACTER_SHEETS)) {
      expect(pngSize(sheet.path)).toEqual([
        sheet.frameWidth * 3,
        sheet.frameHeight * 4,
      ]);
    }
    expect(pngSize(SUPPORTING_CHARACTER_SHEETS.disciples.path)).toEqual([
      512, 747,
    ]);
    expect(pngSize(SUPPORTING_CHARACTER_SHEETS.witnesses.path)).toEqual([
      532, 776,
    ]);
    expect(pngSize(LAZARUS_SHEET.path)).toEqual([1600, 544]);
    expect(pngSize(SUPPORTING_ACTION_SHEET.path)).toEqual([1167, 804]);
  });

  it("uses the 12 individual approved portraits and no legacy panels", () => {
    const entries = Object.entries(PORTRAIT_ASSETS);
    expect(entries).toHaveLength(12);
    for (const [key, path] of entries) {
      expect(path).toContain("assets/art/portrait/portrait__");
      expect(path).not.toMatch(/portrait-(martha|mary|jesus|witnesses)\.png$/);
      expect(pngSize(path)).toEqual([1024, 1024]);

      const manifest = JSON.parse(
        readFileSync(
          resolve(
            "production/art-pipeline/manifests/portrait",
            `portrait__${key}/v1/run-001.manifest.json`,
          ),
          "utf8",
        ),
      ) as {
        readonly asset: { readonly id: string };
        readonly run: { readonly status: string };
        readonly processing: { readonly status: string };
      };
      expect(manifest.asset.id).toBe(`portrait.${key}`);
      expect(manifest.run.status).toBe("approved");
      expect(manifest.processing.status).toBe("completed");
    }
  });

  it("keeps normalized supporting sheets transparent and auditable", () => {
    const result = JSON.parse(
      execFileSync("python3", [
        "scripts/normalize-character-sheets.py",
        "--check",
      ]).toString(),
    ) as {
      readonly cornerAlphas: readonly number[];
      readonly transparentPixels: number;
    }[];
    expect(result).toHaveLength(3);
    for (const sheet of result) {
      expect(sheet.cornerAlphas).toEqual([0, 0, 0, 0]);
      expect(sheet.transparentPixels).toBeGreaterThan(0);
    }
  });
});
