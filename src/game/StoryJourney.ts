import type { ActorId } from "./types";

export type StoryJourneyStatus = "idle" | "moving" | "ready";

export class StoryJourney {
  private readonly statuses = new Map<ActorId, StoryJourneyStatus>();

  status(id: ActorId): StoryJourneyStatus {
    return this.statuses.get(id) ?? "idle";
  }

  begin(id: ActorId): void {
    this.statuses.set(id, "moving");
  }

  complete(id: ActorId): boolean {
    if (this.status(id) !== "moving") {
      return false;
    }
    this.statuses.set(id, "ready");
    return true;
  }

  reset(id?: ActorId): void {
    if (id) {
      this.statuses.delete(id);
      return;
    }
    this.statuses.clear();
  }
}
