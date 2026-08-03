import { describe, expect, it } from "vitest";

import {
  STAGE_GOALS,
  STAGE_GOAL_IDS,
  STAGE_GOAL_TEXT_MAX_LENGTH,
  type StageGoalMode,
} from "../src/game/StageGoals";
import { VERSE_BEAT_IDS, type VerseBeatId } from "../src/game/VerseBeats";

const EXPECTED_GOALS: Readonly<
  Record<VerseBeatId, { mode: StageGoalMode; shortText: string }>
> = {
  illness: { mode: "manual", shortText: "走近拉撒路" },
  "sisters-send": { mode: "manual", shortText: "与马大交谈" },
  "find-jesus": { mode: "manual", shortText: "寻找耶稣" },
  message: { mode: "manual", shortText: "传达口信" },
  "two-day-wait": { mode: "watch", shortText: "观看" },
  "return-to-judea": { mode: "manual", shortText: "跟随耶稣" },
  thomas: { mode: "watch", shortText: "聆听多马" },
  "four-days": { mode: "manual", shortText: "回到伯大尼" },
  "martha-goes": { mode: "manual", shortText: "寻找马大" },
  "martha-hope": { mode: "manual", shortText: "与马大交谈" },
  "resurrection-life": { mode: "watch", shortText: "聆听耶稣" },
  "martha-confession": { mode: "watch", shortText: "聆听马大" },
  "martha-calls": { mode: "manual", shortText: "寻找马利亚" },
  "mary-rises": { mode: "manual", shortText: "跟随马利亚" },
  "mary-at-feet": { mode: "manual", shortText: "走近马利亚" },
  "jesus-weeps": { mode: "manual", shortText: "跟随众人" },
  "come-and-see": { mode: "manual", shortText: "前往墓园" },
  "tomb-arrival": { mode: "manual", shortText: "走近洞口" },
  "stone-dialogue": { mode: "watch", shortText: "聆听耶稣" },
  "stone-and-prayer": { mode: "manual", shortText: "移开石头" },
  "call-and-emergence": { mode: "watch", shortText: "看向洞口" },
  responses: { mode: "manual", shortText: "与众人交谈" },
};

describe("StageGoals", () => {
  it("covers the exact 22 beat IDs with no extras", () => {
    expect(STAGE_GOAL_IDS).toEqual(VERSE_BEAT_IDS);
    expect(Object.keys(STAGE_GOALS)).toEqual(VERSE_BEAT_IDS);
    expect(Object.keys(STAGE_GOALS)).toHaveLength(22);
  });

  it("maps every beat to the requested mode and short text", () => {
    VERSE_BEAT_IDS.forEach((beatId) => {
      expect(STAGE_GOALS[beatId]).toEqual({
        beatId,
        ...EXPECTED_GOALS[beatId],
        hideDuringBlockingUI: true,
      });
    });
  });

  it("keeps visible goals short, single-line, and non-directional", () => {
    VERSE_BEAT_IDS.forEach((beatId) => {
      const text = STAGE_GOALS[beatId].shortText;
      expect([...text].length).toBeLessThanOrEqual(STAGE_GOAL_TEXT_MAX_LENGTH);
      expect(text).not.toMatch(/[\r\n]/);
      expect(text).not.toMatch(/(?:--?|==?)>|<(?:--?|==?)|[←→↑↓↔⇢➜➡]/);
      expect(text).not.toMatch(/\d/);
    });
  });

  it("contains no recall answers or explanatory identity leaks", () => {
    const serialized = VERSE_BEAT_IDS.map(
      (beatId) => STAGE_GOALS[beatId].shortText,
    ).join("|");
    [
      "主啊，你所爱的人病了",
      "末日复活",
      "急忙起来",
      "请主来看",
      "有人相信",
      "正确",
      "答案",
      "就是",
      "其实",
      "伪装",
      "路人",
    ].forEach((leak) => {
      expect(serialized).not.toContain(leak);
    });
  });
});
