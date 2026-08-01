import { describe, expect, it } from "vitest";

import { NavigationGrid } from "../src/game/NavigationGrid";

describe("NavigationGrid", () => {
  it("finds a route around an obstacle", () => {
    const grid = new NavigationGrid(400, 400, 40, [
      { x: 120, y: 0, width: 80, height: 280 },
    ]);

    const path = grid.findPath({ x: 40, y: 40 }, { x: 320, y: 40 });

    expect(path.length).toBeGreaterThan(0);
    expect(path.some((point) => point.y > 280)).toBe(true);
  });

  it("moves blocked click targets to the nearest walkable cell", () => {
    const grid = new NavigationGrid(320, 320, 40, [
      { x: 120, y: 120, width: 80, height: 80 },
    ]);

    const path = grid.findPath({ x: 40, y: 40 }, { x: 160, y: 160 });
    const destination = path.at(-1);

    expect(destination).toBeDefined();
    expect(
      destination &&
        destination.x >= 120 &&
        destination.x <= 200 &&
        destination.y >= 120 &&
        destination.y <= 200,
    ).toBe(false);
  });
});
