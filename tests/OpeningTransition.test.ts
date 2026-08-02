import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { HOUSE_EXIT } from "../src/game/EnvironmentAssets";
import {
  HOUSE_EXIT_TRIGGER_RADIUS,
  shouldAwaitHouseExitAfterSequence,
  shouldEnterWorldFromHouse,
} from "../src/game/HouseExitTransition";
import { StoryEngine } from "../src/game/StoryEngine";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");

describe("opening house-to-world transition", () => {
  it.each(["completed", "skipped"] as const)(
    "keeps the %s sisters-send outcome indoors until the doorway",
    (status) => {
      expect(shouldAwaitHouseExitAfterSequence("sisters-send", status)).toBe(
        true,
      );
      expect(shouldAwaitHouseExitAfterSequence("illness", status)).toBe(false);
    },
  );

  it("enters the world only after sisters-send and inside the door trigger", () => {
    const story = new StoryEngine();
    story.completeCurrent("illness");

    expect(
      shouldEnterWorldFromHouse({
        inWorld: false,
        beatId: story.beatId,
        playerPosition: HOUSE_EXIT,
      }),
    ).toBe(false);

    story.completeCurrent("sisters-send");
    expect(
      shouldEnterWorldFromHouse({
        inWorld: false,
        beatId: story.beatId,
        playerPosition: {
          x: HOUSE_EXIT.x + HOUSE_EXIT_TRIGGER_RADIUS + 1,
          y: HOUSE_EXIT.y,
        },
      }),
    ).toBe(false);
    expect(
      shouldEnterWorldFromHouse({
        inWorld: false,
        beatId: story.beatId,
        playerPosition: {
          x: HOUSE_EXIT.x + HOUSE_EXIT_TRIGGER_RADIUS,
          y: HOUSE_EXIT.y,
        },
      }),
    ).toBe(true);
    expect(
      shouldEnterWorldFromHouse({
        inWorld: true,
        beatId: story.beatId,
        playerPosition: HOUSE_EXIT,
      }),
    ).toBe(false);
  });

  it("wires the shared parity and proximity contracts without auto-entry", () => {
    expect(sceneSource).toContain("shouldAwaitHouseExitAfterSequence");
    expect(sceneSource).toContain("shouldEnterWorldFromHouse");
    expect(sceneSource).not.toMatch(
      /beat\.id === "sisters-send"[\s\S]{0,180}this\.enterWorld\(\)/,
    );
  });
});
