import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LAZARUS_CONTENT_BOUNDS,
  LAZARUS_SHEET,
} from "../src/game/CharacterAssets";
import {
  lazarusScaleToFitRotated,
  lazarusVisibleBounds,
} from "../src/game/CharacterSprites";
import {
  HOUSE_BED_DEPTH,
  HOUSE_BED_MATTRESS_BOUNDS,
  HOUSE_FOREGROUND_PLACEMENTS,
  HOUSE_SICK_LAZARUS_DEPTH,
  HOUSE_SICK_LAZARUS_POSITION,
  HOUSE_SICK_LAZARUS_PRESENTATION,
  HOUSE_SICK_LAZARUS_SIZE,
  resolveLazarusDepth,
} from "../src/game/EnvironmentAssets";
import { resolveActorLabelVisibility } from "../src/ui/ActorLabel";

const overlaps = (
  left: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  right: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

describe("opening sick Lazarus presentation", () => {
  it("maps the sick frame to nontransparent source content", () => {
    const assetPath = resolve("public", LAZARUS_SHEET.path);
    const alphaBounds = JSON.parse(
      execFileSync("python3", [
        "-c",
        [
          "import json, sys",
          "from PIL import Image",
          "image = Image.open(sys.argv[1]).convert('RGBA')",
          "frame = image.crop((0, 0, 400, 544))",
          "print(json.dumps(frame.getchannel('A').getbbox()))",
        ].join("; "),
        assetPath,
      ]).toString(),
    ) as readonly [number, number, number, number];

    expect(alphaBounds).toEqual([6, 183, 393, 359]);
    expect(LAZARUS_CONTENT_BOUNDS.sick).toMatchObject({
      x: alphaBounds[0],
      y: alphaBounds[1],
      width: alphaBounds[2] - alphaBounds[0],
      height: alphaBounds[3] - alphaBounds[1],
    });
  });

  it("keeps the visible body on the mattress within the 160x108 contract", () => {
    const scale = lazarusScaleToFitRotated(
      "sick",
      HOUSE_SICK_LAZARUS_SIZE,
      HOUSE_SICK_LAZARUS_PRESENTATION.angle,
    );
    const visualBounds = lazarusVisibleBounds(
      "sick",
      HOUSE_SICK_LAZARUS_POSITION,
      scale,
      HOUSE_SICK_LAZARUS_PRESENTATION.angle,
    );

    expect(visualBounds.width).toBeLessThanOrEqual(HOUSE_SICK_LAZARUS_SIZE.width);
    expect(visualBounds.height).toBeLessThanOrEqual(HOUSE_SICK_LAZARUS_SIZE.height);
    expect(overlaps(visualBounds, HOUSE_BED_MATTRESS_BOUNDS)).toBe(true);
  });

  it("points his head toward the upper-right pillow and feet toward the lower-left footboard", () => {
    const angle = (HOUSE_SICK_LAZARUS_PRESENTATION.angle * Math.PI) / 180;
    const headDirection = {
      x: -Math.cos(angle),
      y: -Math.sin(angle),
    };
    const feetDirection = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    expect(headDirection.x).toBeGreaterThan(0);
    expect(headDirection.y).toBeLessThan(0);
    expect(feetDirection.x).toBeLessThan(0);
    expect(feetDirection.y).toBeGreaterThan(0);
  });

  it("keeps the house actor above the combined bed and blanket layer", () => {
    const bed = HOUSE_FOREGROUND_PLACEMENTS.find(({ id }) => id === "bed");

    expect(bed?.depth).toBe(HOUSE_BED_DEPTH);
    expect(HOUSE_SICK_LAZARUS_DEPTH).toBeGreaterThan(HOUSE_BED_DEPTH);
    expect(resolveLazarusDepth(false, HOUSE_SICK_LAZARUS_POSITION.y)).toBe(
      HOUSE_SICK_LAZARUS_DEPTH,
    );
    expect(resolveLazarusDepth(true, 1420)).toBe(1420);
  });

  it("starts active and visible and never leaves a floating label", () => {
    expect(HOUSE_SICK_LAZARUS_PRESENTATION).toEqual({
      active: true,
      angle: 135,
      visible: true,
    });
    expect(resolveActorLabelVisibility({ active: true, visible: true })).toBe(true);
    expect(resolveActorLabelVisibility({ active: true, visible: false })).toBe(false);
    expect(resolveActorLabelVisibility({ active: false, visible: true })).toBe(false);
  });

  it("wires the fixed presentation contract into scene creation and depth updates", () => {
    const scene = readFileSync("src/game/BethanyScene.ts", "utf8");

    expect(scene).toContain(".setActive(HOUSE_SICK_LAZARUS_PRESENTATION.active)");
    expect(scene).toContain(".setAngle(HOUSE_SICK_LAZARUS_PRESENTATION.angle)");
    expect(scene).toContain(".setVisible(HOUSE_SICK_LAZARUS_PRESENTATION.visible)");
    expect(scene).toContain(".setDepth(HOUSE_SICK_LAZARUS_DEPTH)");
    expect(scene).toContain(
      "this.lazarus.setDepth(resolveLazarusDepth(this.inWorld, this.lazarus.y))",
    );
    expect(scene).toContain("lazarus.angle");
  });
});
