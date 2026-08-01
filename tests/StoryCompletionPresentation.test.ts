import { describe, expect, it } from "vitest";

import { FACINGS } from "../src/game/CharacterAssets";
import { ACTOR_IDS } from "../src/game/ScriptureContent";
import {
  STORY_COMPLETION_ACTORS,
  STORY_COMPLETION_PRESENTATION,
  applyStoryCompletionPresentation,
  type StoryCompletionActor,
} from "../src/game/StoryCompletionPresentation";

describe("canonical story completion presentation", () => {
  it("covers every player and NPC presentation outside Lazarus", () => {
    expect(new Set(STORY_COMPLETION_ACTORS)).toEqual(
      new Set(ACTOR_IDS.filter((actor) => actor !== "lazarus")),
    );
    for (const presentation of Object.values(
      STORY_COMPLETION_PRESENTATION,
    )) {
      expect(FACINGS).toContain(presentation.facing);
    }
  });

  it("keeps the two recorded crowd responses visibly distinct", () => {
    const leftResponse = STORY_COMPLETION_PRESENTATION.guide;
    const rightResponse = STORY_COMPLETION_PRESENTATION["older-witness"];

    expect(leftResponse.facing).toBe("left");
    expect(rightResponse.facing).toBe("right");
    expect(leftResponse.position.x).toBeLessThan(rightResponse.position.x);
    expect(leftResponse.position.y).toBe(rightResponse.position.y);
  });

  it("canonicalizes different normal and skip residues identically", () => {
    const run = (offset: number) => {
      const state = Object.fromEntries(
        STORY_COMPLETION_ACTORS.map((actor, index) => [
          actor,
          {
            position: { x: offset + index, y: offset - index },
            facing: FACINGS[(index + offset) % FACINGS.length],
          },
        ]),
      ) as Record<
        StoryCompletionActor,
        {
          position: { x: number; y: number };
          facing: (typeof FACINGS)[number];
        }
      >;

      applyStoryCompletionPresentation({
        setPosition: (actor, position) => {
          state[actor].position = { ...position };
        },
        setFacing: (actor, facing) => {
          state[actor].facing = facing;
        },
      });
      return state;
    };

    expect(run(10)).toEqual(run(1000));
  });
});
