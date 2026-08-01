import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

interface Actor {
  id: string;
  displayName: string | null;
}

interface Beat {
  verseRefs: string[];
  action?: string;
  line?: string;
  actor?: string;
  actors?: string[];
}

interface Sequence {
  id: string;
  verseRefs: string[];
  initialState: {
    visibility: { visible: string[]; hidden: string[] };
  };
  beats: Beat[];
  finalState: JsonObject;
  skipResultEqualsFinalState: boolean;
}

interface InteractionGate {
  id: string;
  prompt: string;
  reference: string;
  answer: string;
  preAnswer: {
    answerDisclosed: boolean;
    emphasizedActors: string[];
    actorsMoveTowardAnswer: string[];
  };
}

interface StoryContract {
  policies: Record<string, boolean>;
  actors: Actor[];
  internalRuntimeAliases: Record<string, string>;
  interactionGates: InteractionGate[];
  sequences: Sequence[];
}

const contract = JSON.parse(
  readFileSync("art/story-sequences.json", "utf8"),
) as StoryContract;

const sequence = (id: string): Sequence => {
  const value = contract.sequences.find((candidate) => candidate.id === id);
  expect(value, `Missing sequence ${id}`).toBeDefined();
  return value as Sequence;
};

const gate = (id: string): InteractionGate => {
  const value = contract.interactionGates.find((candidate) => candidate.id === id);
  expect(value, `Missing interaction gate ${id}`).toBeDefined();
  return value as InteractionGate;
};

describe("John 11 story sequence contract", () => {
  it("limits visible identities to Scripture names and group terms", () => {
    const allowedLabels = new Set([
      null,
      "马大",
      "马利亚",
      "耶稣",
      "多马",
      "门徒",
      "来安慰的犹太人",
      "犹太人",
      "拉撒路",
    ]);
    expect(contract.actors).toHaveLength(12);
    expect(contract.actors.find((actor) => actor.id === "player")?.displayName).toBe(
      null,
    );
    for (const actor of contract.actors) {
      expect(allowedLabels.has(actor.displayName), actor.id).toBe(true);
    }

    expect(contract.internalRuntimeAliases).toMatchObject({
      "older-disciple": "disciple-a",
      "younger-disciple": "disciple-b",
      mourner: "jew-comforter-a",
      "mourner-woman": "jew-comforter-b",
      guide: "jew-witness-a",
      "older-witness": "jew-witness-b",
    });
    expect(JSON.stringify(contract.sequences)).not.toMatch(/"guide"/);
  });

  it("defines all eight sequences with verse-supported beats and deterministic skips", () => {
    expect(contract.sequences.map(({ id }) => id)).toEqual([
      "opening-sickroom",
      "message-two-days-journey",
      "martha-meets-jesus",
      "martha-calls-mary",
      "mary-and-jesus",
      "plural-response-tomb-route",
      "tomb",
      "aftermath",
    ]);

    const actorIds = new Set(contract.actors.map(({ id }) => id));
    for (const item of contract.sequences) {
      expect(item.verseRefs.length, item.id).toBeGreaterThan(0);
      expect(item.beats.length, item.id).toBeGreaterThan(0);
      expect(item.finalState, item.id).toBeTruthy();
      expect(item.skipResultEqualsFinalState, item.id).toBe(true);
      for (const beat of item.beats) {
        expect(beat.verseRefs.length, item.id).toBeGreaterThan(0);
        if (beat.actor !== undefined) {
          expect(actorIds.has(beat.actor), `${item.id}:${beat.actor}`).toBe(true);
        }
        for (const actor of beat.actors ?? []) {
          expect(actorIds.has(actor), `${item.id}:${actor}`).toBe(true);
        }
      }
      for (const actor of [
        ...item.initialState.visibility.visible,
        ...item.initialState.visibility.hidden,
      ]) {
        expect(actorIds.has(actor), `${item.id}:${actor}`).toBe(true);
      }
    }
  });

  it("keeps mourners out of the opening and introduces Jews only under 11:19", () => {
    const opening = sequence("opening-sickroom");
    expect(opening.initialState.visibility.visible).toEqual([
      "player",
      "martha",
      "mary",
      "lazarus",
    ]);
    expect(opening.initialState.visibility.hidden).toEqual(
      expect.arrayContaining([
        "jew-comforter-a",
        "jew-comforter-b",
        "jew-witness-a",
        "jew-witness-b",
      ]),
    );

    const arrival = sequence("message-two-days-journey");
    const jewishArrival = arrival.beats.find(
      (beat) =>
        beat.actors?.includes("jew-comforter-a") &&
        beat.verseRefs.includes("11:19"),
    );
    expect(jewishArrival).toMatchObject({
      action: "appear-at-village-after-jesus-arrives",
      verseRefs: ["11:19"],
    });
  });

  it("replaces point-to-Mary and unique-guide choices with recall questions", () => {
    const mary = gate("mary-response-recall");
    expect(mary.prompt).toBe("马利亚听见以后怎样？");
    expect(mary.answer).toBe("就急忙起来，到耶稣那里去。");

    const crowd = gate("crowd-response-recall");
    expect(crowd.prompt).toBe("众人怎样回答耶稣？");
    expect(crowd.answer).toBe("请主来看。");

    const route = sequence("plural-response-tomb-route");
    const response = route.beats.find((beat) => beat.line === "请主来看。");
    expect(response?.actors).toHaveLength(4);
    const leaders = route.beats.find(
      (beat) => beat.action === "lead-together-to-tomb",
    );
    expect(leaders?.actors).toEqual(["jew-witness-a", "jew-witness-b"]);
  });

  it("locks pre-answer non-disclosure and excludes invented observations", () => {
    expect(contract.policies).toMatchObject({
      scriptureSupportRequiredForNpcNamesLinesPresencePosesAndActions: true,
      forbidInferenceBeyondJohn11: true,
      forbidInventedNpcDemographicsOrStoryRoles: true,
      preAnswerNonDisclosureRequired: true,
      normalAndSkipFinalStatesMustMatch: true,
      runtimeImplementationDeferredToSessionC: true,
    });

    for (const item of contract.interactionGates) {
      expect(item.preAnswer).toEqual({
        answerDisclosed: false,
        emphasizedActors: [],
        actorsMoveTowardAnswer: [],
      });
    }

    const visibleLines = contract.sequences.flatMap((item) =>
      item.beats.flatMap((beat) => (beat.line === undefined ? [] : [beat.line])),
    );
    expect(visibleLines.join("\n")).not.toMatch(
      /红眼|失眠|等待|照料|照顾|迟疑|犹豫|好像|似乎/,
    );
  });
});
