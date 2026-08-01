import { describe, expect, it, vi } from "vitest";

import { ProximityTrigger } from "../src/game/ProximityTrigger";

describe("ProximityTrigger", () => {
  it("activates once only after the player enters its radius", async () => {
    const handler = vi.fn();
    const trigger = new ProximityTrigger({
      stage: "opening",
      position: { x: 100, y: 100 },
      radius: 40,
      handler,
    });

    expect(
      await trigger.tryActivate("opening", { x: 145, y: 100 }),
    ).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    expect(
      await trigger.tryActivate("opening", { x: 130, y: 100 }),
    ).toBe(true);
    expect(trigger.isConsumed).toBe(true);
    expect(handler).toHaveBeenCalledOnce();

    expect(
      await trigger.tryActivate("opening", { x: 100, y: 100 }),
    ).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not activate for a different story stage", async () => {
    const handler = vi.fn();
    const trigger = new ProximityTrigger({
      stage: "opening",
      position: { x: 100, y: 100 },
      radius: 40,
      handler,
    });

    expect(
      await trigger.tryActivate("deliverMessage", { x: 100, y: 100 }),
    ).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
