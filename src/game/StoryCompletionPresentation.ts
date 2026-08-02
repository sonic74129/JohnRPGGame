import type { Facing } from "./CharacterSprites";
import { FIND_JESUS_MEMORY_CARRIERS } from "./FindJesusStories";
import type { Point } from "./NavigationGrid";
import { TOMB_ANCHORS } from "./TombAnchors";
import type { ActorId } from "./types";

export type StoryCompletionActor = ActorId | "player";

export interface StoryCompletionTarget {
  setPosition(actor: StoryCompletionActor, position: Point): void;
  setFacing(actor: StoryCompletionActor, facing: Facing): void;
}

const gathering = TOMB_ANCHORS.tombGathering;

export const STORY_COMPLETION_PRESENTATION: Readonly<
  Record<
    StoryCompletionActor,
    {
      readonly position: Point;
      readonly facing: Facing;
    }
  >
> = {
  player: {
    position: gathering.groupPositions.player,
    facing: "right",
  },
  martha: {
    position: gathering.groupPositions.martha,
    facing: "right",
  },
  mary: {
    position: gathering.groupPositions.mary,
    facing: "right",
  },
  mourner: {
    position: gathering.groupPositions.mourner,
    facing: "right",
  },
  "mourner-woman": {
    position: gathering.groupPositions.mournerWoman,
    facing: "right",
  },
  jesus: {
    position: gathering.groupPositions.jesus,
    facing: "right",
  },
  guide: {
    position: {
      x: gathering.center.x - 150,
      y: gathering.center.y + 100,
    },
    facing: "left",
  },
  "older-witness": {
    position: {
      x: gathering.center.x + 120,
      y: gathering.center.y + 100,
    },
    facing: "right",
  },
  thomas: {
    position: { x: 1760, y: 1130 },
    facing: "left",
  },
  "older-disciple": {
    position: { x: 1820, y: 1090 },
    facing: "left",
  },
  "younger-disciple": {
    position: { x: 1860, y: 1150 },
    facing: "left",
  },
  "memory-carrier-bread": {
    position: FIND_JESUS_MEMORY_CARRIERS["memory-carrier-bread"].placement,
    facing: "front",
  },
  "memory-carrier-water": {
    position: FIND_JESUS_MEMORY_CARRIERS["memory-carrier-water"].placement,
    facing: "front",
  },
  "memory-carrier-mud": {
    position: FIND_JESUS_MEMORY_CARRIERS["memory-carrier-mud"].placement,
    facing: "front",
  },
};

export const STORY_COMPLETION_ACTORS = Object.keys(
  STORY_COMPLETION_PRESENTATION,
) as readonly StoryCompletionActor[];

export const applyStoryCompletionPresentation = (
  target: StoryCompletionTarget,
): void => {
  for (const actor of STORY_COMPLETION_ACTORS) {
    const presentation = STORY_COMPLETION_PRESENTATION[actor];
    target.setPosition(actor, presentation.position);
    target.setFacing(actor, presentation.facing);
  }
};
