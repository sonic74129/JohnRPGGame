import { describe, expect, it } from "vitest";

import {
  AreaRuntime,
  type AreaConfig,
  type AreaHost,
  type AreaId,
  type AreaResource,
} from "../src/game/AreaRuntime";

const resource = (destroyed: string[], name: string): AreaResource => ({
  destroy: () => destroyed.push(name),
});

const area = (id: AreaId): AreaConfig => ({
  id,
  width: 400,
  height: 300,
  backgroundKey: id,
  backgroundColor: 0,
  obstacles: [{ x: 10, y: 20, width: 30, height: 40 }],
  playerSpawn: { x: 50, y: 60 },
  actors: [],
});

const areas: Readonly<Record<AreaId, AreaConfig>> = {
  "lazarus-house": area("lazarus-house"),
  "bethany-world": area("bethany-world"),
};

describe("AreaRuntime", () => {
  it("cleans backgrounds, obstacles, and actors before entering a new area", () => {
    const destroyed: string[] = [];
    const bounds: Array<readonly [number, number]> = [];
    const rebuilt: AreaId[] = [];
    let clearedActors = 0;
    const host: AreaHost = {
      setBounds: (width, height) => bounds.push([width, height]),
      createBackground: (config) => resource(destroyed, `background:${config.id}`),
      createObstacle: () => resource(destroyed, "obstacle"),
      clearActors: () => {
        clearedActors += 1;
      },
      rebuildNavigation: (config) => rebuilt.push(config.id),
    };
    const runtime = new AreaRuntime(host, areas);

    runtime.enter("lazarus-house");
    runtime.enter("bethany-world");

    expect(destroyed).toEqual(["background:lazarus-house", "obstacle"]);
    expect(clearedActors).toBe(2);
    expect(bounds).toEqual([
      [400, 300],
      [400, 300],
    ]);
    expect(rebuilt).toEqual(["lazarus-house", "bethany-world"]);
    expect(runtime.currentArea).toBe("bethany-world");
  });

  it("exposes the active area's live configuration", () => {
    const destroyed: string[] = [];
    const rebuilt: AreaId[] = [];
    const host: AreaHost = {
      setBounds: () => undefined,
      createBackground: (config) => resource(destroyed, `background:${config.id}`),
      createObstacle: () => resource(destroyed, "obstacle"),
      clearActors: () => undefined,
      rebuildNavigation: (config) => rebuilt.push(config.id),
    };
    const runtime = new AreaRuntime(host, areas);

    const config = runtime.enter("lazarus-house");

    expect(config.id).toBe("lazarus-house");
    expect(runtime.config).toBe(config);
    expect(runtime.currentArea).toBe("lazarus-house");
    expect(rebuilt).toEqual(["lazarus-house"]);
  });
});
