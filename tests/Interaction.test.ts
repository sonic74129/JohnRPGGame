import { describe, expect, it } from "vitest";

import { ActorRegistry } from "../src/game/ActorRegistry";
import { Character } from "../src/game/Character";
import { Interaction, type InteractionContext } from "../src/game/Interaction";

describe("Interaction", () => {
  it("uses area, distance, stage, and lock state to gate interactions", () => {
    const actors = new ActorRegistry();
    actors.register(
      new Character("jesus", "耶稣", "road-to-jesus", { x: 100, y: 100 }),
    );
    const interaction = new Interaction(
      actors,
      {
        jesus: {
          areas: ["road-to-jesus"],
          stages: ["deliverMessage"],
        },
      },
      50,
    );
    const context: InteractionContext = {
      area: "road-to-jesus",
      playerPosition: { x: 120, y: 100 },
      stage: "deliverMessage",
      inputLocked: false,
    };

    expect(interaction.nearest(context)).toBe("jesus");
    expect(interaction.canInteract("jesus", context)).toBe(true);
    expect(
      interaction.canInteract("jesus", {
        ...context,
        stage: "journey",
      }),
    ).toBe(false);
    expect(
      interaction.nearest({
        ...context,
        inputLocked: true,
      }),
    ).toBeUndefined();
  });
});
