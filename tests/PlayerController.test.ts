import { describe, expect, it } from "vitest";

import { CutsceneDirector } from "../src/game/CutsceneDirector";
import { PlayerController } from "../src/game/PlayerController";

describe("PlayerController", () => {
  it("keeps input locked until every nested lock is released", () => {
    const player = new PlayerController();
    const first = player.lock();
    const second = player.lock();

    expect(player.isLocked).toBe(true);
    first();
    expect(player.isLocked).toBe(true);
    second();
    expect(player.isLocked).toBe(false);
  });

  it("unlocks after a cutscene handler throws", async () => {
    const player = new PlayerController();
    const director = new CutsceneDirector(player);

    await expect(
      director.run(async () => {
        throw new Error("cutscene failed");
      }),
    ).rejects.toThrow("cutscene failed");

    expect(player.isLocked).toBe(false);
    expect(player.activeLocks).toBe(0);
  });

  it("suppresses movement while locked", () => {
    const player = new PlayerController();
    const release = player.lock();

    expect(player.resolveMovement(1, 1)).toEqual({ x: 0, y: 0 });
    release();
    const movement = player.resolveMovement(1, 1);
    expect(movement.x).toBeCloseTo(Math.SQRT1_2);
    expect(movement.y).toBeCloseTo(Math.SQRT1_2);
  });
});
