import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  TechnicalErrorKind,
  VerseEchoPresentation,
} from "../src/ui/GameUI";

const html = readFileSync("index.html", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const uiSource = readFileSync("src/ui/GameUI.ts", "utf8");

const section = (id: string): string => {
  const match = html.match(
    new RegExp(`<section id="${id}"[\\s\\S]*?</section>`),
  );
  if (!match) {
    throw new Error(`Missing section #${id}.`);
  }
  return match[0];
};

describe("minimal UI contract", () => {
  it("keeps the start card to chapter, title, and two start actions", () => {
    const start = section("start-screen");

    expect(start).toContain("约翰福音第 11 章");
    expect(start).toContain("<h1>伯大尼见证者</h1>");
    expect(start).toContain('id="start-game"');
    expect(start).toContain('id="start-fullscreen"');
    expect(start).not.toMatch(
      /control-grid|prototype-warning|audio-note|报信者|操作说明/,
    );
  });

  it("renders only Scripture reference, score, and music in the HUD", () => {
    const hud = html.match(/<header id="hud"[\s\S]*?<\/header>/)?.[0] ?? "";

    expect(hud).toContain('id="objective-reference"');
    expect(hud).toContain('id="score"');
    expect(hud).toContain('id="music-toggle"');
    expect(hud).not.toContain('id="objective"');
    expect(uiSource).not.toContain("objective.textContent");
  });

  it("defaults interaction prompts to the generic action", () => {
    expect(html).toContain("SPACE / 互动");
    expect(uiSource).toMatch(
      /setInteractionPrompt\(visible: boolean, label = "SPACE \/ 互动"\)/,
    );
  });

  it("keeps the translation notice in a collapsed pause/about item", () => {
    const pause = section("pause-screen");

    expect(pause).toContain("<details");
    expect(pause).toContain("版本与文本说明");
    expect(pause).toContain("和合本简体原型文本");
  });

  it("provides non-blocking typed toast and verse echo modes", () => {
    const errorKind: TechnicalErrorKind = "unreachable";
    const npcEcho: VerseEchoPresentation = {
      mode: "npc-scripture",
      speaker: "speaker supplied by content",
      text: "text supplied by content",
      reference: "reference supplied by content",
      anchor: { x: 100, y: 120 },
    };
    const memoryEcho: VerseEchoPresentation = {
      mode: "player-memory",
      text: "text supplied by content",
      reference: "reference supplied by content",
      anchor: { x: 100, y: 120 },
    };

    expect(errorKind).toBe("unreachable");
    expect(npcEcho.mode).toBe("npc-scripture");
    expect(memoryEcho.mode).toBe("player-memory");
    expect(html).toContain('id="technical-toast"');
    expect(html).toContain('id="verse-echo"');
    expect(styles).toContain(".technical-toast");
    expect(styles).toContain('.verse-echo[data-mode="player-memory"]');
  });

  it("uses default canvas interpolation rather than pixelated CSS", () => {
    expect(styles).toContain("image-rendering: auto");
    expect(styles).not.toContain("image-rendering: pixelated");
    expect(styles).not.toContain("dramatization");
  });

  it("keeps narrow cards and portraitless dialogue within the viewport", () => {
    const narrowStyles =
      styles.match(/@media \(max-width: 720px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(narrowStyles).toMatch(
      /\.choice-card,\s*\.modal-card\s*\{\s*width: 100%;\s*\}/,
    );
    expect(narrowStyles).toMatch(
      /\.dialogue--without-portrait\s*\{\s*grid-template-columns: 1fr;\s*\}/,
    );
  });
});
