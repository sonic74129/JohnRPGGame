import type { AreaResource } from "./AreaRuntime";
import type { NavigationGrid } from "./NavigationGrid";
import {
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_ROUTES,
  WORLD_STRUCTURES,
  WORLD_WIDTH,
  createWorldNavigation,
  type WorldRoute,
  type WorldStructure,
} from "./WorldLayout";

export interface WorldHost {
  setBounds(width: number, height: number): void;
  createGround(): AreaResource;
  createRoute(route: WorldRoute): AreaResource;
  createStructure(structure: WorldStructure): AreaResource;
  createObstacle(obstacle: (typeof WORLD_OBSTACLES)[number]): AreaResource;
  setNavigation(navigation: NavigationGrid): void;
}

export class WorldRuntime {
  private resources: AreaResource[] = [];
  private initialized = false;

  constructor(private readonly host: WorldHost) {}

  get active(): boolean {
    return this.initialized;
  }

  activate(): void {
    if (this.initialized) {
      return;
    }

    this.host.setBounds(WORLD_WIDTH, WORLD_HEIGHT);
    this.resources = [
      this.host.createGround(),
      ...WORLD_ROUTES.map((route) => this.host.createRoute(route)),
      ...WORLD_STRUCTURES.map((structure) =>
        this.host.createStructure(structure),
      ),
      ...WORLD_OBSTACLES.map((obstacle) => this.host.createObstacle(obstacle)),
    ];
    this.host.setNavigation(createWorldNavigation());
    this.initialized = true;
  }

  cleanup(): void {
    for (const resource of this.resources) {
      resource.destroy();
    }
    this.resources = [];
    this.initialized = false;
  }
}
