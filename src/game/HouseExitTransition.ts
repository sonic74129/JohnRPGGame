import { HOUSE_EXIT } from "./EnvironmentAssets";
import type { MapSequenceResult } from "./MapSequence";
import type { Point } from "./NavigationGrid";
import type { VerseBeatId } from "./VerseBeats";

export const HOUSE_EXIT_TRIGGER_RADIUS = 82;

export const shouldAwaitHouseExitAfterSequence = (
  completedBeatId: VerseBeatId,
  status: MapSequenceResult["status"],
): boolean =>
  completedBeatId === "sisters-send" &&
  (status === "completed" || status === "skipped");

export const shouldEnterWorldFromHouse = ({
  inWorld,
  beatId,
  playerPosition,
}: {
  readonly inWorld: boolean;
  readonly beatId: VerseBeatId;
  readonly playerPosition: Point;
}): boolean => {
  if (inWorld || beatId !== "find-jesus") {
    return false;
  }
  const deltaX = playerPosition.x - HOUSE_EXIT.x;
  const deltaY = playerPosition.y - HOUSE_EXIT.y;
  return (
    deltaX * deltaX + deltaY * deltaY <=
    HOUSE_EXIT_TRIGGER_RADIUS * HOUSE_EXIT_TRIGGER_RADIUS
  );
};
