import { describe, expect, it } from "vitest";

import { PROTOTYPE_TRANSLATION_NOTE } from "../src/game/content";
import {
  ACTOR_LABELS,
  FIND_JESUS_CONTRACT,
  FIND_JESUS_MEMORIES,
  JOHN_11_VERSE_KEYS,
  JOHN_11_VERSES,
  MEMORY_CARRIER_IDS,
  RECALL_QUESTIONS,
  SCRIPTURE_TRANSLATION,
} from "../src/game/ScriptureContent";

describe("ScriptureContent", () => {
  it("preserves the existing translation metadata on all 46 original verses", () => {
    expect(SCRIPTURE_TRANSLATION.note).toBe(PROTOTYPE_TRANSLATION_NOTE);
    expect(JOHN_11_VERSE_KEYS).toHaveLength(46);

    JOHN_11_VERSE_KEYS.forEach((key, index) => {
      const verse = JOHN_11_VERSES[key];
      expect(verse.key).toBe(key);
      expect(verse.verse).toBe(index + 1);
      expect(verse.reference).toBe(`约翰福音 11:${index + 1}`);
      expect(verse.translationId).toBe(SCRIPTURE_TRANSLATION.id);
      expect(verse.textKind).toBe("original-verse");
      expect(verse.text.length).toBeGreaterThan(0);
    });
  });

  it("uses only the approved visible labels", () => {
    expect(ACTOR_LABELS).toEqual({
      player: null,
      martha: "马大",
      mary: "马利亚",
      jesus: "耶稣",
      thomas: "多马",
      "older-disciple": "门徒",
      "younger-disciple": "门徒",
      mourner: "来安慰的犹太人",
      "mourner-woman": "来安慰的犹太人",
      guide: "犹太人",
      "older-witness": "犹太人",
      lazarus: "拉撒路",
      "memory-carrier-bread": null,
      "memory-carrier-water": null,
      "memory-carrier-mud": null,
    });
  });

  it("defines the preserved and replacement recall questions", () => {
    expect(Object.keys(RECALL_QUESTIONS)).toEqual([
      "message",
      "choose-martha",
      "martha-resurrection",
      "mary-response",
      "crowd-response",
      "aftermath",
    ]);
    expect(RECALL_QUESTIONS["choose-martha"].kind).toBe(
      "spatial-actor-choice",
    );
    expect(RECALL_QUESTIONS["mary-response"].prompt).toBe(
      "马利亚听见以后怎样？",
    );
    expect(RECALL_QUESTIONS["crowd-response"].prompt).toBe(
      "众人怎样回答耶稣？",
    );

    Object.values(RECALL_QUESTIONS).forEach((question) => {
      expect(question.wrongAnswer).toEqual({
        penalty: 5,
        revealCorrectAnswer: false,
        referenceOnlyFeedback: true,
      });
    });
  });

  it("types findJesus as optional player memory rather than NPC dialogue", () => {
    expect(FIND_JESUS_CONTRACT.chronology).toBe("outside-john-11");
    expect(FIND_JESUS_CONTRACT.disguisedActorIds).toEqual([
      "jesus",
      ...MEMORY_CARRIER_IDS,
    ]);
    expect(FIND_JESUS_CONTRACT.normallyLabeledActorIds).toEqual([
      "thomas",
      "older-disciple",
      "younger-disciple",
    ]);
    expect(FIND_JESUS_CONTRACT.wrongSelectionPenalty).toBe(0);
    expect(FIND_JESUS_CONTRACT.requireAllClues).toBe(false);
    expect(FIND_JESUS_CONTRACT.correctSelection).toEqual({
      revealLabel: "耶稣",
      removeActorIds: MEMORY_CARRIER_IDS,
      beforeBeatId: "message",
    });

    expect(Object.values(FIND_JESUS_MEMORIES).map((memory) => memory.references))
      .toEqual([
        ["约翰福音 6:9"],
        ["约翰福音 2:7", "约翰福音 2:8", "约翰福音 2:9"],
        ["约翰福音 9:6", "约翰福音 9:7"],
      ]);

    Object.values(FIND_JESUS_MEMORIES).forEach((memory) => {
      expect(memory.kind).toBe("player-memory");
      expect(memory.followUp).toEqual({
        kind: "player-thought",
        text: "不是我要找的人。",
      });
      expect("speaker" in memory).toBe(false);
      expect("dialogue" in memory).toBe(false);
    });
  });
});
