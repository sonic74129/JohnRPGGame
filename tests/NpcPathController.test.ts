import { describe, expect, it } from "vitest";

import { NpcPathController, type NpcPathAdapter } from "../src/game/NpcPathController";

describe("NpcPathController", () => {
  it("moves an NPC through every waypoint once", async () => {
    const path = new NpcPathController();
    const positions = new Map([["martha", { x: 0, y: 0 }]]);
    const visited: Array<readonly [number, number]> = [];
    const adapter: NpcPathAdapter = {
      positionOf: (id) => positions.get(id),
      moveTo: async (id, target) => {
        positions.set(id, target);
        visited.push([target.x, target.y]);
      },
    };

    await expect(
      path.follow(
        "martha",
        [
          { x: 20, y: 0 },
          { x: 20, y: 40 },
        ],
        adapter,
      ),
    ).resolves.toBe(true);
    expect(visited).toEqual([
      [20, 0],
      [20, 40],
    ]);
  });
});
