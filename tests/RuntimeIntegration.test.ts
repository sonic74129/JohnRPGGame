import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const mainSource = readFileSync("src/main.ts", "utf8");
const html = readFileSync("index.html", "utf8");

describe("unified runtime integration", () => {
  it("wires MapSequence, labels, verse echo, and four world quadrants", () => {
    expect(sceneSource).toContain("new MapSequence");
    expect(sceneSource).toContain("createPhaserMapSequenceAdapters");
    expect(sceneSource).toContain("createActorLabel");
    expect(sceneSource).toContain("getLatestActorVerseEcho");
    expect(sceneSource).toContain('"world-nw"');
    expect(sceneSource).toContain('"world-ne"');
    expect(sceneSource).toContain('"world-sw"');
    expect(sceneSource).toContain('"world-se"');
  });

  it("uses linear rendering and technical errors", () => {
    expect(mainSource).toContain("LINEAR_RENDER_CONFIG");
    expect(sceneSource).toContain("applyLinearTextureFiltering");
    expect(sceneSource).not.toContain("FilterMode.NEAREST");
    expect(sceneSource).toContain("showTechnicalError");
  });

  it("keeps the result free of authored recap and objective guidance", () => {
    expect(html).not.toContain('id="result-summary"');
    expect(html).not.toContain("discussion-question");
    expect(html).not.toContain('id="objective"');
  });
});
