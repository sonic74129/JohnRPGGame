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

  it("isolates live character positions from input and snapshot mutation", () => {
    const actors = new ActorRegistry();
    const initialPosition = { x: 10, y: 20 };
    actors.register(
      new Character("martha", "马大", "lazarus-house", initialPosition),
    );

    initialPosition.x = 99;
    const snapshot = actors.require("martha").state;
    Object.assign(snapshot.position, { x: 77 });

    expect(actors.require("martha").state.position).toEqual({ x: 10, y: 20 });
  });
});
