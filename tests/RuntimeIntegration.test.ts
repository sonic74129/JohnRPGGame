import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sceneSource = readFileSync("src/game/BethanyScene.ts", "utf8");
const worldLayoutSource = readFileSync("src/game/WorldLayout.ts", "utf8");
const mainSource = readFileSync("src/main.ts", "utf8");
const html = readFileSync("index.html", "utf8");

const sceneMethodSource = (name: string, nextName: string): string => {
  const start = sceneSource.indexOf(`  private ${name}(`);
  const end = sceneSource.indexOf(`\n  private ${nextName}(`, start + 1);
  if (start < 0 || end < 0) {
    throw new Error(`Unable to isolate BethanyScene.${name}().`);
  }
  return sceneSource.slice(start, end);
};

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

  it("walks the camp group off-map before the full-screen two-day card", () => {
    expect(sceneSource).toContain("TWO_DAY_EXIT_POINTS[actor]");
    expect(sceneSource).toContain('state: "time-skip-black"');
    expect(sceneSource).toContain('state: "time-skip-title"');
    expect(sceneSource).toContain('state: "time-skip-return"');
    expect(sceneSource).toContain('"两天后"');
    expect(sceneSource).toContain("this.restoreTwoDayCamp()");
    expect(sceneSource).not.toContain('state: "wait-dusk"');
  });

  it("keeps sick Lazarus above the bed during per-frame depth updates", () => {
    expect(
      sceneSource.match(/this\.lazarus\.setDepth\(HOUSE_SICK_LAZARUS_DEPTH\)/g),
    ).toHaveLength(1);
    expect(sceneSource).not.toContain("this.lazarus.setDepth(this.lazarus.y)");
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
    expect(sceneSource).toContain("WORLD_HOUSE_EXIT_SPAWN");
    expect(sceneSource).not.toContain("FIND_JESUS_STORY_CONTRACT.playerStart");
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

  it("cleans up world collisions before rebuilding the house", () => {
    expect(sceneSource).toMatch(
      /enterHouse[\s\S]{0,180}this\.worldRuntime\?\.cleanup\(\)[\s\S]{0,120}this\.clearSceneResources\(\)/,
    );
  });

  it("uses actual tomb anchors for normal and skipped sequence final states", () => {
    expect(sceneSource).toContain("TOMB_ANCHORS.tombMouth.center");
    expect(sceneSource).toContain("TOMB_ANCHORS.stone.initialBounds");
    expect(sceneSource).toContain("TOMB_ANCHORS.stone.rolledTarget.center");
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

  it("creates the tomb stone with the world and fades Lazarus from the mouth", () => {
    const enterWorld = sceneMethodSource("enterWorld", "createWorldHost");
    const createTombElements = sceneMethodSource(
      "createTombElements",
      "placeActor",
    );
    const environmentOperation = sceneMethodSource(
      "environmentOperation",
      "tweenGameObject",
    );

    expect(enterWorld).toContain("this.worldRuntime?.activate();");
    expect(enterWorld).toContain("this.createTombElements();");
    expect(enterWorld.indexOf("this.createTombElements();")).toBeGreaterThan(
      enterWorld.indexOf("this.worldRuntime?.activate();"),
    );
    expect(createTombElements).toContain("TOMB_PROP_ASSETS.stone.key");
    expect(createTombElements).toContain("this.setStoneOpen(false);");
    expect(environmentOperation).toContain('state === "lazarus-emerge"');
    expect(environmentOperation).toContain("TOMB_ANCHORS.lazarus.hiddenStart.x");
    expect(environmentOperation).toContain("TOMB_ANCHORS.lazarus.hiddenStart.y");
    expect(environmentOperation).toContain(
      ".setAlpha(TOMB_ANCHORS.lazarus.entranceFade.fromAlpha)",
    );
    expect(environmentOperation).toContain(
      "alpha: TOMB_ANCHORS.lazarus.entranceFade.toAlpha",
    );
    expect(environmentOperation).not.toContain(
      "TOMB_ANCHORS.lazarus.path.slice(1)",
    );
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
