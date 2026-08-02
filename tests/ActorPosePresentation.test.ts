import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  resolveBaseActorPresentation,
  resolveSpecialActorPresentation,
} from "../src/game/ActorPosePresentation";

describe("sequence actor pose presentations", () => {
  it("resolves base facing and approved core poses to different textures", () => {
    const base = resolveBaseActorPresentation("mary", "right");
    const rise = resolveSpecialActorPresentation("mary", {
      kind: "core",
      character: "mary",
      pose: "urgent-rise",
    });
    const feet = resolveSpecialActorPresentation("mary", {
      kind: "core",
      character: "mary",
      pose: "kneeling-grief",
    });

    expect(base.textureKey).toBe("character-mary");
    expect(rise.textureKey).toBe("pose-mary");
    expect(rise.frame).not.toBe(feet.frame);
    expect(rise.scaleKind).toBe("special-pose");
  });

  it("rejects a core pose applied to the wrong actor", () => {
    expect(() =>
      resolveSpecialActorPresentation("jesus", {
        kind: "core",
        character: "mary",
        pose: "urgent-rise",
      }),
    ).toThrow(/cannot be applied/);
  });

  it("resolves Thomas and stone movement through supporting action frames", () => {
    const thomas = resolveSpecialActorPresentation("thomas", {
      kind: "supporting",
      pose: "thomas-listening",
    });
    const stoneGroup = resolveSpecialActorPresentation("mourner-man", {
      kind: "supporting",
      pose: "stone-moving",
    });

    expect(thomas.textureKey).toBe("pose-disciples-witnesses");
    expect(thomas.frame).not.toBe(stoneGroup.frame);
    expect(stoneGroup.scaleKind).toBe("supporting-action");
  });

  it("wires walk start and idle restoration into tween completion and cancel", () => {
    const scene = readFileSync("src/game/BethanyScene.ts", "utf8");

    expect(scene).toContain("startSequenceActorWalk(actor, point)");
    expect(
      scene.match(/restoreSequenceActorIdle\(actor\)/g)?.length,
    ).toBeGreaterThanOrEqual(3);
    expect(scene).toContain("restoreAllSequenceActors()");
    expect(scene).not.toContain("setActorOrdinaryPose: () => undefined");
    expect(scene).not.toContain("setActorSpecialPose: () => undefined");
  });

  it("uses only Scripture-supported beat pose steps", () => {
    const scene = readFileSync("src/game/BethanyScene.ts", "utf8");

    for (const pose of [
      "urgent-rise",
      "kneeling-grief",
      "quiet-weeping",
      "visible-grief",
      "restrained-prayer",
      "authoritative-call",
      "thomas-listening",
      "stone-moving",
    ]) {
      expect(scene).toContain(`pose: "${pose}"`);
    }
    expect(scene).not.toMatch(/hideActors|setVisible\("thomas", false\)/);
  });
});
