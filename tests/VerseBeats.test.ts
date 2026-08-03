import { describe, expect, it } from "vitest";

import {
  ACTOR_IDS,
  ACTOR_LABELS,
  JOHN_11_VERSE_KEYS,
  MEMORY_CARRIER_IDS,
} from "../src/game/ScriptureContent";
import {
  VERSE_BEAT_BY_ID,
  VERSE_BEAT_IDS,
  VERSE_BEATS,
  getActorLabel,
  getActorVisibility,
  getFinalActorLabel,
  getFinalActorVisibility,
  getHiddenActorIds,
  type VerseBeatId,
} from "../src/game/VerseBeats";

const EXPECTED_VERSES: Readonly<
  Record<VerseBeatId, readonly string[]>
> = {
  illness: ["john11:1", "john11:2"],
  "sisters-send": ["john11:3"],
  "find-jesus": [],
  message: ["john11:3", "john11:4"],
  "two-day-wait": ["john11:5", "john11:6"],
  "return-to-judea": [
    "john11:7",
    "john11:8",
    "john11:9",
    "john11:10",
    "john11:11",
    "john11:12",
    "john11:13",
    "john11:14",
    "john11:15",
  ],
  thomas: ["john11:16"],
  "four-days": ["john11:17", "john11:18", "john11:19"],
  "martha-goes": ["john11:20"],
  "martha-hope": ["john11:21", "john11:22", "john11:23", "john11:24"],
  "resurrection-life": ["john11:25", "john11:26"],
  "martha-confession": ["john11:27"],
  "martha-calls": ["john11:28"],
  "mary-rises": ["john11:29", "john11:30", "john11:31"],
  "mary-at-feet": ["john11:32", "john11:33"],
  "jesus-weeps": ["john11:34", "john11:35", "john11:36", "john11:37"],
  "come-and-see": ["john11:34", "john11:38"],
  "tomb-arrival": ["john11:38"],
  "stone-dialogue": ["john11:39", "john11:40"],
  "stone-and-prayer": ["john11:41", "john11:42"],
  "call-and-emergence": ["john11:43", "john11:44"],
  responses: ["john11:45", "john11:46"],
};

describe("VerseBeats", () => {
  it("encodes the exact ordered 22-beat sequence and linear prerequisites", () => {
    expect(VERSE_BEATS.map((beat) => beat.id)).toEqual(VERSE_BEAT_IDS);
    expect(VERSE_BEATS).toHaveLength(22);

    VERSE_BEATS.forEach((beat, index) => {
      expect(beat.order).toBe(index);
      expect(beat.verseKeys).toEqual(EXPECTED_VERSES[beat.id]);
      if (index === 0) {
        expect(beat.prerequisite).toEqual({ kind: "story-start" });
      } else {
        expect(beat.prerequisite).toEqual({
          kind: "beat-completed",
          beatId: VERSE_BEAT_IDS[index - 1],
        });
      }
      expect(beat.handoff.nextBeatId).toBe(VERSE_BEAT_IDS[index + 1] ?? null);
    });
  });

  it("covers every John 11 verse and keeps action evidence inside each beat", () => {
    const covered = new Set(VERSE_BEATS.flatMap((beat) => beat.verseKeys));
    expect([...covered]).toEqual(JOHN_11_VERSE_KEYS);

    VERSE_BEATS.forEach((beat) => {
      beat.supportedActions.forEach((action) => {
        if (action.source === "scripture") {
          action.verseKeys.forEach((verseKey) => {
            expect(beat.verseKeys).toContain(verseKey);
          });
        } else {
          expect(beat.id).toBe("find-jesus");
          expect(action.verseKeys).toEqual([]);
        }
      });
    });
  });

  it("places every recall before its concealed action is revealed", () => {
    const recalls = VERSE_BEATS.flatMap((beat) =>
      beat.recallBeforeReveal.kind === "required"
        ? [[beat.id, beat.recallBeforeReveal.questionId] as const]
        : [],
    );
    expect(recalls).toEqual([
      ["message", "message"],
      ["martha-goes", "choose-martha"],
      ["martha-hope", "martha-resurrection"],
      ["mary-rises", "mary-response"],
      ["jesus-weeps", "crowd-response"],
      ["responses", "aftermath"],
    ]);

    VERSE_BEATS.forEach((beat) => {
      if (beat.recallBeforeReveal.kind !== "required") {
        return;
      }
      const actionVerses = beat.supportedActions.flatMap(
        (action) => action.verseKeys,
      );
      beat.recallBeforeReveal.concealedVerseKeys.forEach((verseKey) => {
        expect(actionVerses).toContain(verseKey);
      });
    });
  });

  it("keeps comforting Jews absent until 11:19 and Lazarus chronology exact", () => {
    const jewishActors = [
      "mourner",
      "mourner-woman",
      "guide",
      "older-witness",
    ] as const;
    const beforeArrival: VerseBeatId[] = [
      "illness",
      "sisters-send",
      "find-jesus",
      "message",
      "two-day-wait",
      "return-to-judea",
      "thomas",
    ];

    beforeArrival.forEach((beatId) => {
      jewishActors.forEach((actorId) => {
        expect(getActorVisibility(beatId, actorId)).toBe("hidden");
        expect(getActorLabel(beatId, actorId)).toBeNull();
      });
    });
    jewishActors.forEach((actorId) => {
      expect(getActorVisibility("four-days", actorId)).toBe("visible");
      expect(getActorLabel("four-days", actorId)).toBe(ACTOR_LABELS[actorId]);
    });

    expect(getActorVisibility("illness", "lazarus")).toBe("visible");
    expect(getActorVisibility("sisters-send", "lazarus")).toBe("visible");
    expect(getActorVisibility("find-jesus", "lazarus")).toBe("hidden");
    expect(getActorVisibility("stone-and-prayer", "lazarus")).toBe("hidden");
    expect(getActorVisibility("call-and-emergence", "lazarus")).toBe("visible");
    expect(getActorLabel("call-and-emergence", "lazarus")).toBe("拉撒路");
  });

  it("applies findJesus temporary labels and removes carriers before message", () => {
    expect(getActorLabel("find-jesus", "jesus")).toBe("陌生旅人");
    const carrierLabels = [
      "提饼篮的人",
      "守水缸的村民",
      "端泥碗的村民",
    ];
    MEMORY_CARRIER_IDS.forEach((actorId, index) => {
      expect(getActorVisibility("find-jesus", actorId)).toBe("visible");
      expect(getActorLabel("find-jesus", actorId)).toBe(carrierLabels[index]);
      expect(getFinalActorVisibility("find-jesus", actorId)).toBe("hidden");
      expect(getFinalActorLabel("find-jesus", actorId)).toBeNull();
      expect(getActorVisibility("message", actorId)).toBe("hidden");
    });
    expect(getActorLabel("find-jesus", "thomas")).toBe("多马");
    expect(getActorLabel("find-jesus", "older-disciple")).toBe("门徒");
    expect(getFinalActorLabel("find-jesus", "jesus")).toBe("耶稣");
    expect(getActorLabel("message", "jesus")).toBe("耶稣");
  });

  it("defines complete deterministic visibility and label snapshots", () => {
    VERSE_BEATS.forEach((beat) => {
      const visible = beat.duringBeatActors?.visibleActorIds ??
        beat.finalState.actors.visibleActorIds;
      const hidden = getHiddenActorIds(beat.id);
      expect(new Set([...visible, ...hidden])).toEqual(new Set(ACTOR_IDS));
      expect(new Set(visible).size).toBe(visible.length);
      expect(beat.finalState.stateFacts.length).toBeGreaterThan(0);

      visible.forEach((actorId) => {
        if (actorId === "player") {
          expect(getActorLabel(beat.id, actorId)).toBeNull();
        } else {
          expect(getActorLabel(beat.id, actorId)).not.toBeNull();
        }
      });
    });
  });

  it("uses plural crowd actions instead of assigning a unique guide", () => {
    expect(
      VERSE_BEAT_BY_ID["come-and-see"].supportedActions,
    ).toContainEqual(
      expect.objectContaining({
        source: "scripture",
        actor: "jews-group",
        kind: "lead-as-group",
      }),
    );
    expect(
      VERSE_BEAT_BY_ID["stone-and-prayer"].supportedActions,
    ).toContainEqual(
      expect.objectContaining({
        source: "scripture",
        actor: "jews-group",
        kind: "move-stone",
      }),
    );
    expect(
      VERSE_BEAT_BY_ID.responses.supportedActions.every(
        (action) => action.actor === "jews-group",
      ),
    ).toBe(true);
    expect(
      VERSE_BEATS.flatMap((beat) => beat.supportedActions).some(
        (action) => action.actor === "guide",
      ),
    ).toBe(false);
  });

  it("contains no prohibited visible dramatization or invented labels", () => {
    const serialized = JSON.stringify(VERSE_BEATS);
    [
      "姐姐……拉撒路还是很虚弱",
      "红眼",
      "失眠",
      "照料",
      "迟疑",
      "女安慰者",
      "带路的人",
      "年长门徒",
      "年轻门徒",
      "年长见证人",
    ].forEach((prohibited) => {
      expect(serialized).not.toContain(prohibited);
    });
  });
});
