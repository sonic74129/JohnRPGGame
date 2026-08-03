import type { AreaId } from "./AreaRuntime";
import { Character, type CharacterState } from "./Character";
import type { Point } from "./NavigationGrid";
import type { ActorId } from "./types";

export class ActorRegistry {
  private readonly actors = new Map<ActorId, Character>();

  register(character: Character): void {
    if (this.actors.has(character.id)) {
      throw new Error(`Actor ${character.id} is already registered.`);
    }
    this.actors.set(character.id, character);
  }

  get(id: ActorId): Character | undefined {
    return this.actors.get(id);
  }

  require(id: ActorId): Character {
    const actor = this.get(id);
    if (!actor) {
      throw new Error(`Actor ${id} is not registered.`);
    }
    return actor;
  }

  move(id: ActorId, area: AreaId, position: Point): void {
    this.require(id).moveTo(area, position);
  }

  setVisible(id: ActorId, visible: boolean): void {
    this.require(id).setVisible(visible);
  }

  hideAll(): void {
    for (const actor of this.actors.values()) {
      actor.setVisible(false);
    }
  }

  inArea(area: AreaId): CharacterState[] {
    return [...this.actors.values()]
      .map((actor) => actor.state)
      .filter((actor) => actor.area === area && actor.visible);
  }

  all(): CharacterState[] {
    return [...this.actors.values()].map((actor) => actor.state);
  }
}
