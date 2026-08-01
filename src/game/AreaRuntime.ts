import type { Point, Rectangle } from "./NavigationGrid";
import type { ActorId } from "./types";

export type AreaId =
  | "lazarus-house"
  | "road-to-jesus"
  | "bethany-village"
  | "road-to-tomb"
  | "tomb-garden";

export interface AreaActorPlacement {
  readonly id: ActorId;
  readonly position: Point;
  readonly visible?: boolean;
}

export interface AreaConfig {
  readonly id: AreaId;
  readonly width: number;
  readonly height: number;
  readonly backgroundKey: string;
  readonly backgroundColor: number;
  readonly obstacles: readonly Rectangle[];
  readonly playerSpawn: Point;
  readonly actors: readonly AreaActorPlacement[];
}

export interface AreaResource {
  destroy(): void;
}

export interface AreaHost {
  setBounds(width: number, height: number): void;
  createBackground(config: AreaConfig): AreaResource;
  createObstacle(obstacle: Rectangle): AreaResource;
  clearActors(): void;
  rebuildNavigation(config: AreaConfig): void;
}

export class AreaRuntime {
  private activeArea?: AreaId;
  private resources: AreaResource[] = [];

  constructor(
    private readonly host: AreaHost,
    private readonly areas: Readonly<Record<AreaId, AreaConfig>>,
  ) {}

  get currentArea(): AreaId | undefined {
    return this.activeArea;
  }

  get config(): AreaConfig | undefined {
    return this.activeArea ? this.areas[this.activeArea] : undefined;
  }

  enter(area: AreaId): AreaConfig {
    this.cleanup();
    const config = this.areas[area];
    this.host.setBounds(config.width, config.height);
    this.resources = [
      this.host.createBackground(config),
      ...config.obstacles.map((obstacle) => this.host.createObstacle(obstacle)),
    ];
    this.host.rebuildNavigation(config);
    this.activeArea = area;
    return config;
  }

  cleanup(): void {
    for (const resource of this.resources) {
      resource.destroy();
    }
    this.resources = [];
    this.host.clearActors();
    this.activeArea = undefined;
  }
}
