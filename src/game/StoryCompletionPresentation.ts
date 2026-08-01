import type { Facing } from "./CharacterSprites";
import type { Point } from "./NavigationGrid";
import type { ActorId } from "./types";
import { WORLD_LANDMARKS } from "./WorldLayout";

export type StoryCompletionActor = ActorId | "player";

export interface StoryCompletionTarget {
  setPosition(actor: StoryCompletionActor, position: Point): void;
  setFacing(actor: StoryCompletionActor, facing: Facing): void;
}

const tomb = WORLD_LANDMARKS.tombGarden;

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
    position: { x: tomb.x + 80, y: tomb.y + 270 },
    facing: "right",
  },
  martha: {
    position: { x: tomb.x - 120, y: tomb.y + 180 },
    facing: "right",
  },
  mary: {
    position: { x: tomb.x - 20, y: tomb.y + 180 },
    facing: "right",
  },
  mourner: {
    position: { x: tomb.x + 80, y: tomb.y + 180 },
    facing: "right",
  },
  "mourner-woman": {
    position: { x: tomb.x - 220, y: tomb.y + 270 },
    facing: "right",
  },
  jesus: {
    position: { x: tomb.x - 220, y: tomb.y + 180 },
    facing: "right",
  },
  guide: {
    position: { x: tomb.x - 300, y: tomb.y + 180 },
    facing: "left",
  },
  "older-witness": {
    position: { x: tomb.x + 300, y: tomb.y + 180 },
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
    position: { x: 2100, y: 1160 },
    facing: "front",
  },
  "memory-carrier-water": {
    position: { x: 2260, y: 1130 },
    facing: "front",
  },
  "memory-carrier-mud": {
    position: { x: 2440, y: 1170 },
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
