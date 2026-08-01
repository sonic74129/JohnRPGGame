import { describe, expect, it } from "vitest";

import { DIALOGUES } from "../src/game/content";
import { partitionTombDialogue } from "../src/game/StoryEvents";

describe("StoryEvents", () => {
  it("orders physical tomb events between their dialogue beats", () => {
    const beats = partitionTombDialogue(DIALOGUES.tomb);

    expect(beats.beforeStone.at(-1)?.text).toContain("神的荣耀");
    expect(beats.stoneRemoval[0]?.text).toContain("把石头挪开");
    expect(beats.callLazarus[0]?.text).toContain("拉撒路出来");
    expect(beats.emergence[0]?.text).toContain("那死人就出来了");
    expect(beats.emergence.at(-1)?.text).toContain("解开");
  });

  it("rejects dialogue that cannot drive the map event", () => {
    expect(() => partitionTombDialogue(DIALOGUES.opening)).toThrow(
      "ordered in-world event beats",
    );
  });
});
