import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DISPLAY_SCALE,
  LINEAR_RENDER_CONFIG,
  OUTDOOR_DISPLAY_HEIGHTS,
  applyLinearTextureFiltering,
  createDisplayScaleContract,
  resolveDisplayMetrics,
  resolveTargetVisibleHeight,
} from "../src/game/DisplayScale";
import {
  ACTOR_LABEL_DEFAULT_RESOLUTION,
  ACTOR_LABEL_LIFECYCLE,
  ACTOR_LABEL_STYLE,
  resolveActorLabelPosition,
} from "../src/ui/ActorLabel";

describe("display scale contract", () => {
  it("supports selectable outdoor profiles and the indoor target", () => {
    expect(OUTDOOR_DISPLAY_HEIGHTS).toEqual({
      outdoor84: 84,
      outdoor90: 90,
      outdoor96: 96,
    });
    expect(DEFAULT_DISPLAY_SCALE.outdoorVisibleHeight).toBe(90);
    expect(DEFAULT_DISPLAY_SCALE.indoorVisibleHeight).toBe(128);
    expect(DEFAULT_DISPLAY_SCALE.sickLazarusBox).toEqual({
      width: 160,
      height: 108,
    });
  });

  it("uses one visible-height rule for base, special, and supporting art", () => {
    const contract = createDisplayScaleContract("outdoor96");
    const kinds = [
      "base-sheet",
      "special-pose",
      "supporting-action",
    ] as const;

    for (const kind of kinds) {
      expect(
        resolveDisplayMetrics(contract, {
          kind,
          area: "outdoor",
          sourceBounds: { width: 200, height: 400 },
        }),
      ).toEqual({
        scale: 0.24,
        visibleWidth: 48,
        visibleHeight: 96,
      });
    }
  });

  it("fits sick Lazarus in the dedicated box and shares standing targets", () => {
    const contract = createDisplayScaleContract("outdoor84");
    const sick = resolveDisplayMetrics(contract, {
      kind: "lazarus",
      area: "indoor",
      state: "sick",
      sourceBounds: { width: 320, height: 180 },
    });

    expect(sick.maximumWidth).toBe(160);
    expect(sick.maximumHeight).toBe(108);
    expect(sick.visibleWidth).toBe(160);
    expect(sick.visibleHeight).toBe(90);
    expect(
      resolveTargetVisibleHeight(contract, {
        kind: "lazarus",
        area: "outdoor",
        state: "restored",
      }),
    ).toBe(84);
  });

  it("exports linear render and texture-filter adapters", () => {
    const setFilter = vi.fn();

    applyLinearTextureFiltering({
      linearMode: "LINEAR",
      textureKeys: ["actor", "world"],
      setFilter,
    });

    expect(LINEAR_RENDER_CONFIG).toEqual({
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    });
    expect(setFilter).toHaveBeenCalledTimes(2);
    expect(setFilter).toHaveBeenCalledWith("world", "LINEAR");
  });
});

describe("actor label contract", () => {
  it("places high-contrast labels above visible content bounds", () => {
    expect(ACTOR_LABEL_DEFAULT_RESOLUTION).toBe(1);
    expect(
      resolveActorLabelPosition({ x: 20, y: 40, width: 60, height: 100 }, 8),
    ).toEqual({ x: 50, y: 32 });
    expect(ACTOR_LABEL_STYLE.color).toBe("#fffaf0");
    expect(ACTOR_LABEL_STYLE.backgroundColor).toContain("rgba");
    expect(ACTOR_LABEL_STYLE.strokeThickness).toBeGreaterThan(0);
  });

  it("tracks visibility every frame and actor/container destruction", () => {
    expect(ACTOR_LABEL_LIFECYCLE).toEqual({
      syncOn: "postupdate",
      destroyOn: "destroy",
      sceneShutdown: "shutdown",
    });
  });
});
