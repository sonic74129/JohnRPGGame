import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const worldLayoutSource = readFileSync("src/game/WorldLayout.ts", "utf8");
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
    expect(sceneSource).toContain("MEMORY_CLUE_FRAMES");
    expect(sceneSource).toContain("createMemoryClueProp");
  });

  it("uses linear rendering and technical errors", () => {
    expect(mainSource).toContain("LINEAR_RENDER_CONFIG");
    expect(sceneSource).toContain("applyLinearTextureFiltering");
    expect(sceneSource).not.toContain("FilterMode.NEAREST");
    expect(sceneSource).toContain("showTechnicalError");
  });

  it("normalizes the two-day waiting overlay in the shared final state", () => {
    expect(sceneSource).toMatch(
      /beatId === "two-day-wait"[\s\S]{0,120}daylightOverlay\?\.setAlpha\(0\)/,
    );
  });

  it("restores player camera follow through the shared final state", () => {
    expect(sceneSource).toMatch(
      /applySequenceFinalState[\s\S]{0,1800}this\.followPlayerCamera\(\)/,
    );
    expect(sceneSource).toContain(
      "this.cameras.main.startFollow(this.player, true, 0.09, 0.09)",
    );
  });

  it("keeps the result free of authored recap and objective guidance", () => {
    expect(html).not.toContain('id="result-summary"');
    expect(html).not.toContain("discussion-question");
    expect(html).not.toContain('id="objective"');
  });

  it("wires the dispersed Find Jesus contract without legacy clustering", () => {
    expect(sceneSource).toContain("FIND_JESUS_STORY_CONTRACT.playerStart");
    expect(sceneSource).toContain("FIND_JESUS_MEMORY_CARRIERS[nearest]");
    expect(sceneSource).toContain('mode: "natural-story"');
    expect(sceneSource).toContain("carrier.interactionStory.join");
    expect(sceneSource).toContain("carrier.proximityObservation");
    expect(sceneSource).toContain(
      "FIND_JESUS_MEMORY_CARRIERS[id].temporaryLabel",
    );
    expect(sceneSource).toContain("FIND_JESUS_STORY_CONTRACT.onJesusSelected");
    expect(sceneSource).not.toContain("{ x: 2100, y: 1160 }");
    expect(sceneSource).not.toContain("{ x: 2260, y: 1130 }");
    expect(sceneSource).not.toContain("{ x: 2440, y: 1170 }");
  });

  it("uses actual tomb anchors for normal and skipped sequence final states", () => {
    expect(sceneSource).toContain("TOMB_ANCHORS.tombMouth.center");
    expect(sceneSource).toContain("TOMB_ANCHORS.stone.initialBounds");
    expect(sceneSource).toContain("TOMB_ANCHORS.stone.rolledTarget.center");
    expect(sceneSource).toContain("TOMB_ANCHORS.lazarus.path.slice(1)");
    expect(sceneSource).toContain("TOMB_ANCHORS.lazarus.emergenceTarget");
    expect(sceneSource).toContain("return TOMB_ANCHORS.cameraFocus");
    expect(sceneSource).toMatch(
      /environmentOperation[\s\S]*setStoneOpen\(true\)[\s\S]*applySequenceFinalState[\s\S]*setStoneOpen\(true\)/,
    );
    expect(sceneSource).toMatch(
      /environmentOperation[\s\S]*setLazarusEmerged\(false\)[\s\S]*applySequenceFinalState[\s\S]*setLazarusEmerged\(true\)/,
    );
    expect(sceneSource).toContain("stone.body.enable = !open");
    expect(sceneSource).toContain("lazarus.body.enable = false");
    expect(sceneSource).toContain("lazarus.body.enable = true");
    expect(worldLayoutSource).not.toContain("tombEntrance");
  });

  it("integrates approved voice cues with lifecycle stops and a hash gate", () => {
    expect(mainSource).toContain("validateVoiceManifest");
    expect(mainSource).toContain("textHash mismatch");
    expect(mainSource).toContain("voice.unlock");
    expect(sceneSource).toContain('beatId === "illness"');
    expect(sceneSource).toContain('beatId === "resurrection-life"');
    expect(sceneSource).toContain("this.voice.handleAdvance()");
    expect(sceneSource).toMatch(
      /showDialogue\([\s\S]{0,500}\(\) => this\.voice\.handleAdvance\(\)/,
    );
    expect(sceneSource).toContain("this.voice.handleSkip()");
    expect(sceneSource).toContain("this.voice.handleSceneChange()");
    expect(sceneSource).not.toMatch(/memory-carrier[\s\S]{0,120}(autoplay|replay)/);
  });
});
