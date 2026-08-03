import type { MemoryCarrierId } from "./ScriptureContent";

export const MEMORY_CLUE_ATLAS = {
  key: "john-memory-clues",
  path: "assets/art/environment/props__john-memory-clues/v1.2/run-001/props__john-memory-clues.png",
  width: 1360,
  height: 768,
} as const;

export interface MemoryClueFrame {
  readonly name: string;
  readonly x: number;
  readonly width: number;
}

export const MEMORY_CLUE_FRAMES: Readonly<
  Record<MemoryCarrierId, MemoryClueFrame>
> = {
  "memory-carrier-bread": {
    name: "memory-clue-bread-and-fish",
    x: 0,
    width: 453,
  },
  "memory-carrier-water": {
    name: "memory-clue-water",
    x: 453,
    width: 454,
  },
  "memory-carrier-mud": {
    name: "memory-clue-mud",
    x: 907,
    width: 453,
  },
};

export const MEMORY_CLUE_DISPLAY_SIZE = {
  width: 110,
  height: 186,
} as const;

export const isMemoryCarrier = (actorId: string): actorId is MemoryCarrierId =>
  Object.hasOwn(MEMORY_CLUE_FRAMES, actorId);
