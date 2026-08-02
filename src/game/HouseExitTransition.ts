import { HOUSE_EXIT } from "./EnvironmentAssets";
import type { MapSequenceResult } from "./MapSequence";
import type { Point } from "./NavigationGrid";
import type { VerseBeatId } from "./VerseBeats";

export const HOUSE_EXIT_TRIGGER_RADIUS = 82;

export interface HouseExitTransitionHost {
  acquireInputLock(): () => void;
  fadeOut(): Promise<void>;
  enterWorld(): void;
  fadeIn(): Promise<void>;
}

export class HouseExitTransition {
  private transitioning = false;

  get active(): boolean {
    return this.transitioning;
  }

  async run(host: HouseExitTransitionHost): Promise<boolean> {
    if (this.transitioning) {
      return false;
    }

    this.transitioning = true;
    let releaseInput = (): void => undefined;
    try {
      releaseInput = host.acquireInputLock();
      await host.fadeOut();
      host.enterWorld();
      await host.fadeIn();
      return true;
    } finally {
      releaseInput();
      this.transitioning = false;
    }
  }
}

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
