import { describe, expect, it } from "vitest";

import { Trigger } from "../src/game/Trigger";

describe("Trigger", () => {
  it("runs only one concurrent activation and consumes after success", async () => {
    let releaseHandler = (): void => undefined;
    const handlerStarted = new Promise<void>((resolve) => {
      releaseHandler = resolve;
    });
    let calls = 0;
    const trigger = new Trigger({
      stage: "ready",
      handler: async () => {
        calls += 1;
        await handlerStarted;
      },
    });

    const first = trigger.tryActivate("ready");
    await expect(trigger.tryActivate("ready")).resolves.toBe(false);
    expect(calls).toBe(1);
    releaseHandler();
    await expect(first).resolves.toBe(true);
    await expect(trigger.tryActivate("ready")).resolves.toBe(false);
    expect(trigger.isConsumed).toBe(true);
  });

  it("does not consume a one-shot trigger when its handler fails", async () => {
    let shouldFail = true;
    const trigger = new Trigger({
      stage: ["ready"],
      handler: () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("temporary failure");
        }
      },
    });

    await expect(trigger.tryActivate("ready")).rejects.toThrow("temporary failure");
    expect(trigger.isConsumed).toBe(false);
    await expect(trigger.tryActivate("ready")).resolves.toBe(true);
    expect(trigger.isConsumed).toBe(true);
  });

  it("rejects a mismatched story stage without running", async () => {
    let calls = 0;
    const trigger = new Trigger({
      stage: "ready",
      handler: () => {
        calls += 1;
      },
    });

    await expect(trigger.tryActivate("waiting")).resolves.toBe(false);
    expect(calls).toBe(0);
  });
});
