import type { ActorId } from "./types";
import type { AreaId } from "./AreaRuntime";
import type { Point } from "./NavigationGrid";

export interface CharacterState {
  readonly id: ActorId;
  readonly name: string;
  readonly area: AreaId;
  readonly position: Point;
  readonly visible: boolean;
}

export class Character {
  private currentArea: AreaId;
  private currentPosition: Point;
  private isVisible: boolean;

  constructor(
    readonly id: ActorId,
    readonly name: string,
    area: AreaId,
    position: Point,
    visible = true,
  ) {
    this.currentArea = area;
    this.currentPosition = { ...position };
    this.isVisible = visible;
  }

  get state(): CharacterState {
    return {
      id: this.id,
      name: this.name,
      area: this.currentArea,
      position: { ...this.currentPosition },
      visible: this.isVisible,
    };
  }

  moveTo(area: AreaId, position: Point): void {
    this.currentArea = area;
    this.currentPosition = { ...position };
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
  }
}
