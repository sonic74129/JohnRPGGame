import { describe, expect, it } from "vitest";

import {
  dialogueLinesForBeat,
  dialogueLinesForVerse,
} from "../src/game/ScriptureDialogue";
import { PORTRAIT_ASSETS } from "../src/game/CharacterAssets";
import { DIALOGUE_PORTRAIT_ASSIGNMENTS } from "../src/game/DialoguePortraits";
import { JOHN_11_VERSES } from "../src/game/ScriptureContent";
import {
  VERSE_BEATS,
  VERSE_BEAT_BY_ID,
} from "../src/game/VerseBeats";

describe("Scripture dialogue attribution", () => {
  it.each([
    ["john11:34", ["耶稣", "众人"]],
    ["john11:39", ["耶稣", "马大"]],
    ["john11:44", ["经文", "耶稣"]],
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

  it("maps approved portraits by beat context without changing Scripture text", () => {
    const message = dialogueLinesForBeat(VERSE_BEAT_BY_ID.message);
    expect(message[0]).toMatchObject({
      speaker: "报信者",
      portrait: "messenger",
      text: JOHN_11_VERSES["john11:3"].text,
    });
    expect(message[1]).toMatchObject({
      speaker: "耶稣",
      portrait: "jesus-listening",
    });

    const entrusted = dialogueLinesForBeat(VERSE_BEAT_BY_ID["sisters-send"]);
    expect(entrusted[0]).toMatchObject({
      speaker: "姐妹二人",
      portrait: "martha-worried",
      secondaryPortrait: "mary-worried",
    });

    const returnDialogue = dialogueLinesForBeat(
      VERSE_BEAT_BY_ID["return-to-judea"],
    );
    expect(
      returnDialogue.find(
        (line) => line.reference === JOHN_11_VERSES["john11:8"].reference,
      )?.portrait,
    ).toBe("thomas");
    expect(
      returnDialogue.find(
        (line) => line.reference === JOHN_11_VERSES["john11:14"].reference,
      )?.portrait,
    ).toBe("jesus-declaration");

    expect(dialogueLinesForBeat(VERSE_BEAT_BY_ID["mary-rises"])[0]?.portrait).toBe(
      "mary-urgent",
    );
  });

  it("shows an approved portrait beside every Scripture dialogue line", () => {
    for (const beat of VERSE_BEATS) {
      for (const line of dialogueLinesForBeat(beat)) {
        if (!line.portrait) {
          throw new Error(
            `Missing portrait for ${beat.id}:${line.reference}:${line.speaker}`,
          );
        }
        expect(PORTRAIT_ASSETS).toHaveProperty(line.portrait);
      }
    }
  });

  it("keeps the bounded portrait plan unique and resolvable", () => {
    const keys = DIALOGUE_PORTRAIT_ASSIGNMENTS.map(
      ({ beatId, verseKey, sourceSpeaker }) =>
        `${beatId}:${verseKey}:${sourceSpeaker}`,
    );
    expect(new Set(keys).size).toBe(keys.length);

    for (const assignment of DIALOGUE_PORTRAIT_ASSIGNMENTS) {
      expect(PORTRAIT_ASSETS).toHaveProperty(assignment.portrait);
      if ("secondaryPortrait" in assignment) {
        expect(PORTRAIT_ASSETS).toHaveProperty(assignment.secondaryPortrait);
      }
      const lines = dialogueLinesForBeat(
        VERSE_BEAT_BY_ID[assignment.beatId],
      );
      expect(
        lines.some(
          (line) =>
            line.reference === JOHN_11_VERSES[assignment.verseKey].reference &&
            line.portrait === assignment.portrait &&
            line.speaker ===
              ("displayedSpeaker" in assignment
                ? assignment.displayedSpeaker
                : assignment.sourceSpeaker),
        ),
        `${assignment.beatId}:${assignment.verseKey}:${assignment.sourceSpeaker}`,
      ).toBe(true);
    }

    expect(
      new Set(DIALOGUE_PORTRAIT_ASSIGNMENTS.map(({ portrait }) => portrait)),
    ).toEqual(
      new Set([
        "martha-worried",
        "martha-grieving",
        "martha-faith",
        "mary-worried",
        "mary-urgent",
        "mary-grieving",
        "jesus-listening",
        "jesus-declaration",
        "jesus-weeping",
        "messenger",
        "thomas",
        "witness",
      ]),
    );
  });
});
