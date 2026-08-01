import type { ActorRegistry } from "./ActorRegistry";
import type { AreaId } from "./AreaRuntime";
import type { Point } from "./NavigationGrid";
import type { ActorId, StoryStage } from "./types";

export interface InteractionContext {
  readonly area: AreaId;
  readonly playerPosition: Point;
  readonly stage: StoryStage;
  readonly inputLocked: boolean;
}

export interface InteractionRule {
  readonly areas: readonly AreaId[];
  readonly stages: readonly StoryStage[];
}

export type InteractionRules = Readonly<Partial<Record<ActorId, InteractionRule>>>;

export class Interaction {
  constructor(
    private readonly registry: ActorRegistry,
    private readonly rules: InteractionRules,
    private readonly distance = 125,
  ) {}

  nearest(context: InteractionContext): ActorId | undefined {
    if (context.inputLocked) {
      return undefined;
    }

    let closest: ActorId | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const actor of this.registry.inArea(context.area)) {
      if (!this.isEligible(actor.id, context)) {
        continue;
      }
      const actorDistance = Math.hypot(
        actor.position.x - context.playerPosition.x,
        actor.position.y - context.playerPosition.y,
      );
      if (actorDistance <= this.distance && actorDistance < closestDistance) {
        closest = actor.id;
        closestDistance = actorDistance;
      }
    }
    return closest;
  }

  canInteract(id: ActorId, context: InteractionContext): boolean {
    if (!this.canApproach(id, context)) {
      return false;
    }
    const actor = this.registry.get(id)?.state;
    if (!actor) {
      return false;
    }
    return (
      Math.hypot(
        actor.position.x - context.playerPosition.x,
        actor.position.y - context.playerPosition.y,
      ) <= this.distance
    );
  }

  canApproach(id: ActorId, context: InteractionContext): boolean {
    if (context.inputLocked || !this.isEligible(id, context)) {
      return false;
    }
    const actor = this.registry.get(id)?.state;
    return Boolean(actor && actor.area === context.area && actor.visible);
  }

  targetPosition(id: ActorId): Point | undefined {
    const actor = this.registry.get(id)?.state;
    return actor ? { x: actor.position.x, y: actor.position.y + 78 } : undefined;
  }

  private isEligible(id: ActorId, context: InteractionContext): boolean {
    const rule = this.rules[id];
    return Boolean(
      rule &&
        rule.areas.includes(context.area) &&
        rule.stages.includes(context.stage),
    );
  }
}
