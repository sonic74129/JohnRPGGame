import { describe, expect, it } from "vitest";

import { StoryEngine } from "../src/game/StoryEngine";

describe("StoryEngine", () => {
  it("follows the John 11 sequence from Martha to Mary to the tomb guide", () => {
    const story = new StoryEngine();

    story.completeOpening();
    expect(story.stage).toBe("deliverMessage");
    expect(story.score).toBe(100);

    story.deliverMessage();
    expect(story.stage).toBe("journey");
    story.arriveAtBethany();
    expect(story.stage).toBe("chooseMartha");

    expect(story.interact("martha").kind).toBe("correct");
    expect(story.stage).toBe("followMartha");

    story.arriveAtMartha();
    story.completeMarthaDialogue();
    expect(story.stage).toBe("chooseMary");

    expect(story.interact("mary").kind).toBe("correct");
    story.arriveAtMary();
    story.completeMaryDialogue();
    expect(story.stage).toBe("chooseGuide");

    expect(story.interact("guide").kind).toBe("correct");
    story.arriveAtTomb();
    story.completeTomb();
    story.completeEpilogue();

    expect(story.stage).toBe("complete");
    expect(story.score).toBe(100);
  });

  it("deducts points only once for the same explicit wrong choice", () => {
    const story = new StoryEngine();
    story.completeOpening();
    story.deliverMessage();
    story.arriveAtBethany();

    const firstAttempt = story.interact("mary");
    const repeatedAttempt = story.interact("mary");

    expect(firstAttempt.kind).toBe("wrong");
    expect(firstAttempt.penalty).toBe(5);
    expect(repeatedAttempt.penalty).toBe(0);
    expect(repeatedAttempt.revealHint).toBe(true);
    expect(story.score).toBe(95);
    expect(story.stage).toBe("chooseMartha");
  });

  it("does not deduct points for optional exploration", () => {
    const story = new StoryEngine();
    story.completeOpening();
    story.deliverMessage();
    story.arriveAtBethany();

    const result = story.interact("mourner");

    expect(result.kind).toBe("neutral");
    expect(result.penalty).toBe(0);
    expect(story.score).toBe(100);
  });

  it("scores Scripture questions from the opening message onward", () => {
    const story = new StoryEngine();

    const wrong = story.answerQuestion(
      "message",
      "comeHeal",
      "belovedIsSick",
    );
    const repeated = story.answerQuestion(
      "message",
      "comeHeal",
      "belovedIsSick",
    );
    const correct = story.answerQuestion(
      "message",
      "belovedIsSick",
      "belovedIsSick",
    );

    expect(wrong.penalty).toBe(5);
    expect(repeated.penalty).toBe(0);
    expect(correct.correct).toBe(true);
    expect(story.score).toBe(95);
  });

  it("never blocks progression after wrong choices", () => {
    const story = new StoryEngine();
    story.completeOpening();
    story.deliverMessage();
    story.arriveAtBethany();
    story.interact("mary");

    const correction = story.interact("martha");

    expect(correction.kind).toBe("correct");
    expect(story.stage).toBe("followMartha");
    expect(story.score).toBe(95);
  });

  it("labels the result without assigning a faith rank", () => {
    const story = new StoryEngine();
    story.completeOpening();
    story.deliverMessage();
    story.arriveAtBethany();
    story.interact("mary");

    expect(story.resultLabel()).toBe("经文脉络清楚");
  });
});
