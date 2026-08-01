import { describe, expect, it } from "vitest";

import { getLatestActorVerseEcho } from "../src/game/ActorVerseEcho";
import { JOHN_11_VERSES } from "../src/game/ScriptureContent";
import { VERSE_BEATS, type VerseBeatId } from "../src/game/VerseBeats";

describe("ActorVerseEcho", () => {
  it("never exposes Martha or Mary 11:20 before chooseMartha completes", () => {
    expect(getLatestActorVerseEcho("martha", "four-days")).toBeNull();
    expect(getLatestActorVerseEcho("mary", "four-days")).toBeNull();

    expect(
      getLatestActorVerseEcho("martha", "martha-goes"),
    ).toMatchObject({
      unlockedByBeatId: "martha-goes",
      verseKeys: ["john11:20"],
      text: "马大听见耶稣来了，就出去迎接他",
    });
    expect(getLatestActorVerseEcho("mary", "martha-goes")).toMatchObject({
      unlockedByBeatId: "martha-goes",
      verseKeys: ["john11:20"],
      text: "马利亚却仍然坐在家里",
    });
  });

  it("never exposes Thomas 11:16 before his beat completes", () => {
    expect(getLatestActorVerseEcho("thomas", "return-to-judea")).toBeNull();
    expect(getLatestActorVerseEcho("thomas", "thomas")).toMatchObject({
      unlockedByBeatId: "thomas",
      verseKeys: ["john11:16"],
      text: "我们也去和他同死吧。",
    });
  });

  it("advances Jesus, Martha, and Mary only through completed beats", () => {
    expect(getLatestActorVerseEcho("jesus", "message")?.verseKeys).toEqual([
      "john11:4",
    ]);
    expect(
      getLatestActorVerseEcho("jesus", "resurrection-life")?.verseKeys,
    ).toEqual(["john11:25", "john11:26"]);
    expect(
      getLatestActorVerseEcho("jesus", "call-and-emergence")?.verseKeys,
    ).toEqual(["john11:43", "john11:44"]);

    expect(
      getLatestActorVerseEcho("martha", "martha-confession")?.verseKeys,
    ).toEqual(["john11:27"]);
    expect(
      getLatestActorVerseEcho("martha", "martha-calls")?.text,
    ).toBe("夫子来了，叫你。");
    expect(getLatestActorVerseEcho("mary", "mary-rises")?.text).toBe(
      "马利亚听见了，就急忙起来",
    );
    expect(
      getLatestActorVerseEcho("mary", "mary-at-feet")?.verseKeys,
    ).toEqual(["john11:32"]);
  });

  it("keeps generic disciple and Jewish echoes shared rather than personal", () => {
    const olderDisciple = getLatestActorVerseEcho(
      "older-disciple",
      "return-to-judea",
    );
    const youngerDisciple = getLatestActorVerseEcho(
      "younger-disciple",
      "return-to-judea",
    );
    expect(olderDisciple?.scope).toBe("shared-group");
    expect(youngerDisciple).toEqual({
      ...olderDisciple,
      actorId: "younger-disciple",
    });

    const jewishActors = [
      "mourner",
      "mourner-woman",
      "guide",
      "older-witness",
    ] as const;
    const checkpoints: readonly [VerseBeatId, readonly string[]][] = [
      ["four-days", ["john11:19"]],
      ["mary-rises", ["john11:31"]],
      ["jesus-weeps", ["john11:36", "john11:37"]],
      ["stone-and-prayer", ["john11:41"]],
      ["responses", ["john11:45", "john11:46"]],
    ];

    checkpoints.forEach(([beatId, verseKeys]) => {
      jewishActors.forEach((actorId) => {
        expect(getLatestActorVerseEcho(actorId, beatId)).toMatchObject({
          scope: "shared-group",
          verseKeys,
        });
      });
    });
  });

  it("gives Lazarus no dialogue or verse echo at any point", () => {
    VERSE_BEATS.forEach((beat) => {
      expect(getLatestActorVerseEcho("lazarus", beat.id)).toBeNull();
    });
  });

  it("keeps every selected excerpt exact to its original verse text", () => {
    VERSE_BEATS.flatMap((beat) => beat.echoGrants).forEach((grant) => {
      if (grant.exactExcerpt === undefined) {
        return;
      }
      const original = grant.verseKeys
        .map((verseKey) => JOHN_11_VERSES[verseKey].text)
        .join("");
      expect(original).toContain(grant.exactExcerpt);
    });
  });
});
