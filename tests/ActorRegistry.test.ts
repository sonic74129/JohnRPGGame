import { describe, expect, it } from "vitest";

import { ActorRegistry } from "../src/game/ActorRegistry";
import { Character } from "../src/game/Character";

describe("ActorRegistry", () => {
  it("is the authoritative source for actor area, position, and visibility", () => {
    const actors = new ActorRegistry();
    actors.register(
      new Character("martha", "马大", "lazarus-house", { x: 10, y: 20 }),
    );

    actors.move("martha", "bethany-village", { x: 100, y: 200 });
    actors.setVisible("martha", false);

    expect(actors.inArea("bethany-village")).toEqual([]);
    actors.setVisible("martha", true);
    expect(actors.inArea("bethany-village")).toEqual([
      {
        id: "martha",
        name: "马大",
        area: "bethany-village",
        position: { x: 100, y: 200 },
        visible: true,
      },
    ]);
  });
});
