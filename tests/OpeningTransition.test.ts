import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { HOUSE_EXIT } from "../src/game/EnvironmentAssets";
import {
  HOUSE_EXIT_TRIGGER_RADIUS,
  HouseExitTransition,
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
    expect(sceneSource).toContain("houseExitTransition.active");
    expect(sceneSource).toMatch(
      /houseExitTransition[\s\S]{0,180}\.run\(\{[\s\S]{0,500}fadeOut:[\s\S]{0,180}enterWorld:[\s\S]{0,180}fadeIn:/,
    );
    expect(sceneSource).not.toMatch(
      /beat\.id === "sisters-send"[\s\S]{0,180}this\.enterWorld\(\)/,
    );
  });

  it("locks immediately, ignores reentry, and restores exploration after both fades", async () => {
    const transition = new HouseExitTransition();
    const fadeOut = deferred();
    const fadeIn = deferred();
    const events: string[] = [];
    let locks = 0;
    const host = {
      acquireInputLock: () => {
        events.push("lock");
        locks += 1;
        return () => {
          events.push("unlock");
          locks -= 1;
        };
      },
      fadeOut: () => {
        events.push("fade-out");
        return fadeOut.promise;
      },
      enterWorld: () => events.push("enter-world"),
      fadeIn: () => {
        events.push("fade-in");
        return fadeIn.promise;
      },
    };

    const run = transition.run(host);
    expect(transition.active).toBe(true);
    expect(locks).toBe(1);
    expect(events).toEqual(["lock", "fade-out"]);
    await expect(transition.run(host)).resolves.toBe(false);

    fadeOut.resolve();
    await Promise.resolve();
    expect(events).toEqual(["lock", "fade-out", "enter-world", "fade-in"]);

    fadeIn.resolve();
    await expect(run).resolves.toBe(true);
    expect(events).toEqual([
      "lock",
      "fade-out",
      "enter-world",
      "fade-in",
      "unlock",
    ]);
    expect(locks).toBe(0);
    expect(transition.active).toBe(false);
  });

  it("releases the lock after failure so the exit can be retried", async () => {
    const transition = new HouseExitTransition();
    let locks = 0;
    const failure = new Error("fade failed");
    const failedRun = transition.run({
      acquireInputLock: () => {
        locks += 1;
        return () => {
          locks -= 1;
        };
      },
      fadeOut: () => Promise.reject(failure),
      enterWorld: () => undefined,
      fadeIn: () => Promise.resolve(),
    });

    await expect(failedRun).rejects.toBe(failure);
    expect(locks).toBe(0);
    expect(transition.active).toBe(false);

    await expect(
      transition.run({
        acquireInputLock: () => {
          locks += 1;
          return () => {
            locks -= 1;
          };
        },
        fadeOut: () => Promise.resolve(),
        enterWorld: () => undefined,
        fadeIn: () => Promise.resolve(),
      }),
    ).resolves.toBe(true);
    expect(locks).toBe(0);
  });
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
