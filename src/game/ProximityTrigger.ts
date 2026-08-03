import type { Point } from "./NavigationGrid";
import {
  Trigger,
  type StageGate,
  type TriggerOptions,
} from "./Trigger";

export interface ProximityTriggerOptions<Stage>
  extends TriggerOptions<Stage> {
  readonly position: Point;
  readonly radius: number;
}

export class ProximityTrigger<Stage> {
  private readonly trigger: Trigger<Stage>;

  constructor(private readonly options: ProximityTriggerOptions<Stage>) {
    this.trigger = new Trigger(options);
  }

  get isConsumed(): boolean {
    return this.trigger.isConsumed;
  }

  tryActivate(stage: Stage, playerPosition: Point): Promise<boolean> {
    if (
      Math.hypot(
        playerPosition.x - this.options.position.x,
        playerPosition.y - this.options.position.y,
      ) > this.options.radius
    ) {
      return Promise.resolve(false);
    }
    return this.trigger.tryActivate(stage);
  }
}

export type { StageGate };
