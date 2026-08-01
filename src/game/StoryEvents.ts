import type { DialogueLine } from "./types";

export interface TombDialogueBeats {
  readonly beforeStone: readonly DialogueLine[];
  readonly stoneRemoval: readonly DialogueLine[];
  readonly callLazarus: readonly DialogueLine[];
  readonly emergence: readonly DialogueLine[];
}

export const partitionTombDialogue = (
  lines: readonly DialogueLine[],
): TombDialogueBeats => {
  const stoneIndex = lines.findIndex((line) =>
    line.text.includes("他们就把石头挪开"),
  );
  const callIndex = lines.findIndex((line) =>
    line.text.includes("拉撒路出来"),
  );
  const emergenceIndex = lines.findIndex((line) =>
    line.text.includes("那死人就出来了"),
  );
  if (
    stoneIndex < 0 ||
    callIndex <= stoneIndex ||
    emergenceIndex <= callIndex
  ) {
    throw new Error("Tomb dialogue is missing its ordered in-world event beats.");
  }

  return {
    beforeStone: lines.slice(0, stoneIndex),
    stoneRemoval: lines.slice(stoneIndex, callIndex),
    callLazarus: lines.slice(callIndex, emergenceIndex),
    emergence: lines.slice(emergenceIndex),
  };
};
