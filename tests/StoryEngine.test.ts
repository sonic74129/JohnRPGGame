import { describe, expect, it } from "vitest";

import { FIND_JESUS_CONTRACT } from "../src/game/ScriptureContent";
import { StoryEngine } from "../src/game/StoryEngine";
import { VERSE_BEAT_IDS } from "../src/game/VerseBeats";

describe("StoryEngine verse-beat runtime", () => {
  it("advances through all 22 VerseBeats in exact order", () => {
    const story = new StoryEngine();
    const visited: string[] = [];

    for (const beatId of VERSE_BEAT_IDS) {
      expect(story.beatId).toBe(beatId);
      visited.push(story.completeCurrent(beatId).id);
    }

    expect(visited).toEqual(VERSE_BEAT_IDS);
    expect(story.completedBeatIds).toEqual(VERSE_BEAT_IDS);
    expect(story.isComplete).toBe(true);
  });

  it("rejects out-of-order completion without changing the active beat", () => {
    const story = new StoryEngine();

    expect(() => story.completeCurrent("message")).toThrow(
      "Cannot complete message; active beat is illness.",
    );
    expect(story.beatId).toBe("illness");
  });

  it("uses the contract trigger actors for manual interactions", () => {
    const story = new StoryEngine();
    story.completeCurrent("illness");

    expect(story.canTrigger("martha")).toBe(true);
    expect(story.canTrigger("mary")).toBe(true);
    expect(story.canTrigger("jesus")).toBe(false);
  });

  it("keeps all findJesus mistakes at zero penalty", () => {
    const story = new StoryEngine();
    story.completeCurrent("illness");
    story.completeCurrent("sisters-send");

    for (const carrierId of FIND_JESUS_CONTRACT.clueCarrierIds) {
      const result = story.identifyJesus(carrierId);
      expect(result.kind).toBe("memory");
      expect(result.penalty).toBe(0);
      if (result.kind === "memory") {
        expect(result.memory.followUp.text).toBe("不是我要找的人。");
      }
    }
    expect(story.score).toBe(100);
    expect(story.identifyJesus("jesus")).toEqual({
      kind: "identified",
      actorId: "jesus",
      penalty: 0,
    });
  });

  it("deducts a recall mistake only once", () => {
    const story = new StoryEngine();

    const first = story.answerRecall("message", "come-heal");
    const repeated = story.answerRecall("message", "come-heal");
    const correct = story.answerRecall("message", "beloved-is-sick");

    expect(first.penalty).toBe(5);
    expect(repeated.penalty).toBe(0);
    expect(correct.correct).toBe(true);
    expect(story.score).toBe(95);
  });
});
