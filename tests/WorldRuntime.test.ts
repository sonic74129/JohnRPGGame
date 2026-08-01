import { describe, expect, it } from "vitest";

import type { AreaResource } from "../src/game/AreaRuntime";
import type { NavigationGrid } from "../src/game/NavigationGrid";
import { WorldRuntime, type WorldHost } from "../src/game/WorldRuntime";
import {
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_ROUTES,
  WORLD_STRUCTURES,
  WORLD_WIDTH,
} from "../src/game/WorldLayout";

describe("WorldRuntime", () => {
  it("creates the persistent exterior once across repeated activations", () => {
    const created: string[] = [];
    const destroyed: string[] = [];
    const bounds: Array<readonly [number, number]> = [];
    let navigation: NavigationGrid | undefined;
    const resource = (name: string): AreaResource => {
      created.push(name);
      return { destroy: () => destroyed.push(name) };
    };
    const host: WorldHost = {
      setBounds: (width, height) => bounds.push([width, height]),
      createGround: () => resource("ground"),
      createRoute: (route) => resource(`route:${route.id}`),
      createStructure: (structure) => resource(`structure:${structure.id}`),
      createObstacle: () => resource("obstacle"),
      setNavigation: (nextNavigation) => {
        navigation = nextNavigation;
      },
    };
    const runtime = new WorldRuntime(host);

    runtime.activate();
    runtime.activate();

    expect(runtime.active).toBe(true);
    expect(bounds).toEqual([[WORLD_WIDTH, WORLD_HEIGHT]]);
    expect(created).toHaveLength(
      1 + WORLD_ROUTES.length + WORLD_STRUCTURES.length + WORLD_OBSTACLES.length,
    );
    expect(navigation).toBeDefined();
    expect(destroyed).toEqual([]);

    runtime.cleanup();

    expect(runtime.active).toBe(false);
    expect(destroyed).toEqual(created);
  });
});
