import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PORTRAIT_ASSETS } from "../src/game/CharacterAssets";
import { DIALOGUES } from "../src/game/content";
import type { DialogueLine, MapPoseCue } from "../src/game/types";

const lineContaining = (
  lines: readonly DialogueLine[],
  text: string,
): DialogueLine => {
  const line = lines.find((candidate) => candidate.text.includes(text));
  if (!line) {
    throw new Error(`Missing dialogue line containing ${text}.`);
  }
  return line;
};

const expectCue = (line: DialogueLine, cue: MapPoseCue): void => {
  expect(line.mapPoses).toContainEqual(cue);
};

describe("in-map story pose selection", () => {
  it("uses care, concern, calling, rising, kneeling, and grief poses", () => {
    expectCue(lineContaining(DIALOGUES.opening, "还是很虚弱"), {
      kind: "core",
      actor: "mary",
      pose: "care",
    });
    expectCue(lineContaining(DIALOGUES.opening, "把消息告诉耶稣"), {
      kind: "core",
      actor: "martha",
      pose: "worried-idle",
    });
    expectCue(lineContaining(DIALOGUES.marthaReturns, "夫子来了"), {
      kind: "core",
      actor: "martha",
      pose: "quiet-call",
    });
    expectCue(lineContaining(DIALOGUES.marthaReturns, "急忙起来"), {
      kind: "core",
      actor: "mary",
      pose: "urgent-rise",
    });
    expectCue(lineContaining(DIALOGUES.mary, "你若早在这里"), {
      kind: "core",
      actor: "mary",
      pose: "kneeling-grief",
    });
    expectCue(lineContaining(DIALOGUES.mary, "看见她哭"), {
      kind: "core",
      actor: "mary",
      pose: "quiet-weeping",
    });
  });

  it("uses Jesus listening, grief, prayer, and call poses", () => {
    expectCue(lineContaining(DIALOGUES.messageJourney, "你所爱的人病了"), {
      kind: "core",
      actor: "jesus",
      pose: "listening",
    });
    expectCue(lineContaining(DIALOGUES.mary, "耶稣哭了"), {
      kind: "core",
      actor: "jesus",
      pose: "visible-grief",
    });
    expectCue(lineContaining(DIALOGUES.tomb, "举目望天祷告"), {
      kind: "core",
      actor: "jesus",
      pose: "restrained-prayer",
    });
    expectCue(lineContaining(DIALOGUES.tomb, "拉撒路出来"), {
      kind: "core",
      actor: "jesus",
      pose: "authoritative-call",
    });
  });

  it("uses composite stone movement and restrained reaction poses", () => {
    expectCue(lineContaining(DIALOGUES.tomb, "举目望天祷告"), {
      kind: "supporting",
      actor: "guide",
      pose: "stone-moving",
      hideActors: ["thomas"],
    });
    expectCue(lineContaining(DIALOGUES.tomb, "那死人就出来了"), {
      kind: "supporting",
      actor: "older-witness",
      pose: "restrained-group-reaction",
      hideActors: ["thomas", "mourner", "mourner-woman"],
    });
  });
});

describe("individual dialogue portraits", () => {
  it("uses every approved portrait key in existing dialogue", () => {
    const used = new Set(
      Object.values(DIALOGUES)
        .flat()
        .flatMap((line) => (line.portrait ? [line.portrait] : [])),
    );
    expect([...used].sort()).toEqual(Object.keys(PORTRAIT_ASSETS).sort());
  });

  it("maps GameUI to individual portraits with centered cover framing", () => {
    const ui = readFileSync("src/ui/GameUI.ts", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");
    expect(ui).toContain("PORTRAIT_ASSETS[portrait]");
    expect(ui).not.toMatch(/portrait-(martha|mary|jesus|witnesses)\.png/);
    expect(styles).toMatch(/background-position: center/);
    expect(styles).toMatch(/background-size: cover/);
    expect(styles).not.toMatch(/background-size: 300% 100%/);
  });
});
