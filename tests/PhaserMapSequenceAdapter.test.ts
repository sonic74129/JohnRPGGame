import { describe, expect, it, vi } from "vitest";

import {
  isUiEventTarget,
  PhaserMapSequenceInputSource,
  routePhaserSequenceInput,
} from "../src/game/PhaserMapSequenceAdapter";
import { JOHN_11_VERSES } from "../src/game/ScriptureContent";
import { VERSE_BEATS } from "../src/game/VerseBeats";

describe("Phaser MapSequence input routing", () => {
  it("advances one dialogue line before considering a cinematic skip", () => {
    expect(
      routePhaserSequenceInput("space", {
        dialogueOpen: true,
        choiceOpen: false,
        sequenceRunning: true,
      }),
    ).toBe("advance-dialogue");
    expect(
      routePhaserSequenceInput("enter", {
        dialogueOpen: true,
        choiceOpen: false,
        sequenceRunning: true,
      }),
    ).toBe("ui");
    expect(
      routePhaserSequenceInput("space", {
        dialogueOpen: false,
        choiceOpen: true,
        sequenceRunning: true,
      }),
    ).toBe("choice");
  });

  it.each([
    ["illness", "11:1", "11:2"],
    ["message", "11:3", "11:4"],
  ] as const)(
    "keeps both %s Scripture lines visible before beat completion",
    (beatId, firstReference, secondReference) => {
      const beat = VERSE_BEATS.find((candidate) => candidate.id === beatId);
      if (!beat) {
        throw new Error(`Missing beat ${beatId}.`);
      }
      const lines = beat.verseKeys.map((key) => JOHN_11_VERSES[key]);
      let lineIndex = 0;
      let beatCompleted = false;
      let skipRequests = 0;

      expect(lines[lineIndex]?.reference).toContain(firstReference);
      const route = routePhaserSequenceInput("space", {
        dialogueOpen: true,
        choiceOpen: false,
        sequenceRunning: true,
      });
      if (route === "advance-dialogue") {
        lineIndex += 1;
      } else if (route === "skip") {
        skipRequests += 1;
        beatCompleted = true;
      }

      expect(lines[lineIndex]?.reference).toContain(secondReference);
      expect(beatCompleted).toBe(false);
      expect(skipRequests).toBe(0);
    },
  );

  it("routes Enter, Space, and non-UI pointer input to active cinematics", () => {
    for (const kind of ["enter", "space", "pointer"] as const) {
      expect(
        routePhaserSequenceInput(kind, {
          dialogueOpen: false,
          choiceOpen: false,
          sequenceRunning: true,
        }),
      ).toBe("skip");
    }
    expect(
      routePhaserSequenceInput("pointer", {
        dialogueOpen: false,
        choiceOpen: false,
        sequenceRunning: true,
        uiPointer: true,
      }),
    ).toBe("ui");
    expect(
      isUiEventTarget({
        closest: (selector: string) =>
          selector.includes("#dialogue") ? { id: "dialogue" } : null,
      }),
    ).toBe(true);
    expect(isUiEventTarget({ closest: () => null })).toBe(false);
  });

  it("does not skip a cinematic marked as unskippable", () => {
    for (const kind of ["enter", "space", "pointer"] as const) {
      expect(
        routePhaserSequenceInput(kind, {
          dialogueOpen: false,
          choiceOpen: false,
          sequenceRunning: true,
          sequenceSkippable: false,
        }),
      ).toBe("ui");
    }
  });

  it("filters blocked signals and unsubscribes idempotently", () => {
    let blocking = true;
    const source = new PhaserMapSequenceInputSource(() => !blocking);
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);

    expect(source.emit({ kind: "key", key: "Enter" })).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    blocking = false;
    expect(source.emit({ kind: "pointer" })).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    unsubscribe();
    expect(source.emit({ kind: "key", key: "Space" })).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });
});
