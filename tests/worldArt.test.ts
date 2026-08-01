import { describe, expect, it } from "vitest";

import objectManifest from "../public/assets/art/world/objects-bethany-world.json";
import tileManifest from "../public/assets/art/world/tileset-bethany-ground.json";

describe("unified Bethany world art", () => {
  it("provides the complete named ground tileset", () => {
    expect(tileManifest.tileWidth).toBe(32);
    expect(tileManifest.tileHeight).toBe(32);
    expect(tileManifest.tiles).toHaveLength(16);
    expect(new Set(tileManifest.tiles.map(({ name }) => name)).size).toBe(16);
  });

  it("provides every editable world object as a transparent image", () => {
    expect(objectManifest.objects).toHaveLength(16);
    for (const object of objectManifest.objects) {
      expect(object.width).toBeGreaterThan(0);
      expect(object.height).toBeGreaterThan(0);
      expect(object.file).toBe(`objects/${object.name}.png`);
    }
  });
});
