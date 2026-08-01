import { describe, expect, it } from "vitest";

import {
  dialogueLinesForBeat,
  dialogueLinesForVerse,
} from "../src/game/ScriptureDialogue";
import { JOHN_11_VERSES } from "../src/game/ScriptureContent";
import { VERSE_BEATS } from "../src/game/VerseBeats";

describe("Scripture dialogue attribution", () => {
  it.each([
    ["john11:34", ["耶稣", "众人"]],
    ["john11:39", ["耶稣", "马大"]],
  ] as const)("splits %s without changing its original text", (key, speakers) => {
    const lines = dialogueLinesForVerse(key);

    expect(lines.map((line) => line.speaker)).toEqual(speakers);
    expect(lines.map((line) => line.text).join("")).toBe(
      JOHN_11_VERSES[key].text,
    );
    expect(new Set(lines.map((line) => line.reference))).toEqual(
      new Set([JOHN_11_VERSES[key].reference]),
    );
  });

  it("retains every beat verse in exact order and with full coverage", () => {
    for (const beat of VERSE_BEATS) {
      const lines = dialogueLinesForBeat(beat);
      const groupedText = beat.verseKeys.map((key) =>
        lines
          .filter(
            (line) => line.reference === JOHN_11_VERSES[key].reference,
          )
          .map((line) => line.text)
          .join(""),
      );

      expect(groupedText).toEqual(
        beat.verseKeys.map((key) => JOHN_11_VERSES[key].text),
      );
    }
  });
});
