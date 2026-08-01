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

  it("only makes the guide interactive on the road to the tomb", () => {
    const actors = new ActorRegistry();
    actors.register(
      new Character("guide", "带路的人", "road-to-tomb", { x: 200, y: 200 }),
    );
    actors.register(
      new Character("jesus", "耶稣", "road-to-tomb", { x: 205, y: 200 }),
    );
    const interaction = new Interaction(
      actors,
      {
        guide: {
          areas: ["bethany-village", "road-to-tomb"],
          stages: ["chooseGuide", "followGuide"],
        },
      },
      50,
    );
    const context: InteractionContext = {
      area: "road-to-tomb",
      playerPosition: { x: 220, y: 200 },
      stage: "followGuide",
      inputLocked: false,
    };

    expect(interaction.nearest(context)).toBe("guide");
    expect(interaction.canInteract("guide", context)).toBe(true);
    expect(interaction.canApproach("jesus", context)).toBe(false);
    expect(
      interaction.canInteract("guide", { ...context, stage: "chooseGuide" }),
    ).toBe(true);
  });
});
