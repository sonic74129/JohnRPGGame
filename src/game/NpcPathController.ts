import type { Point } from "./NavigationGrid";
import type { ActorId } from "./types";

export interface NpcPathAdapter {
  positionOf(id: ActorId): Point | undefined;
  moveTo(id: ActorId, target: Point, durationMs: number): Promise<void>;
}

export class NpcPathController {
  private readonly moving = new Set<ActorId>();

  async follow(
    id: ActorId,
    points: readonly Point[],
    adapter: NpcPathAdapter,
    speed = 185,
  ): Promise<boolean> {
    if (this.moving.has(id) || !adapter.positionOf(id)) {
      return false;
    }

    this.moving.add(id);
    try {
      for (const point of points) {
        const current = adapter.positionOf(id);
        if (!current) {
          return false;
        }
        const distance = Math.hypot(point.x - current.x, point.y - current.y);
        await adapter.moveTo(id, point, Math.max(400, (distance / speed) * 1000));
      }
      return true;
    } finally {
      this.moving.delete(id);
    }
  }
}
