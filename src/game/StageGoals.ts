import { VERSE_BEAT_IDS, type VerseBeatId } from "./VerseBeats";

export type StageGoalMode = "manual" | "watch";

export interface StageGoal {
  readonly beatId: VerseBeatId;
  readonly mode: StageGoalMode;
  readonly shortText: string;
  readonly hideDuringBlockingUI: boolean;
}

export const STAGE_GOAL_TEXT_MAX_LENGTH = 8;
export const STAGE_GOAL_IDS = VERSE_BEAT_IDS;

export const STAGE_GOALS = {
  illness: goal("illness", "manual", "走近拉撒路"),
  "sisters-send": goal("sisters-send", "manual", "与马大交谈"),
  "find-jesus": goal("find-jesus", "manual", "寻找耶稣"),
  message: goal("message", "manual", "传达口信"),
  "two-day-wait": goal("two-day-wait", "watch", "观看"),
  "return-to-judea": goal("return-to-judea", "manual", "跟随耶稣"),
  thomas: goal("thomas", "watch", "聆听多马"),
  "four-days": goal("four-days", "manual", "回到伯大尼"),
  "martha-goes": goal("martha-goes", "manual", "寻找马大"),
  "martha-hope": goal("martha-hope", "manual", "与马大交谈"),
  "resurrection-life": goal("resurrection-life", "watch", "聆听耶稣"),
  "martha-confession": goal("martha-confession", "watch", "聆听马大"),
  "martha-calls": goal("martha-calls", "manual", "寻找马利亚"),
  "mary-rises": goal("mary-rises", "manual", "跟随马利亚"),
  "mary-at-feet": goal("mary-at-feet", "manual", "走近马利亚"),
  "jesus-weeps": goal("jesus-weeps", "manual", "跟随众人"),
  "come-and-see": goal("come-and-see", "manual", "前往墓园"),
  "tomb-arrival": goal("tomb-arrival", "manual", "走近洞口"),
  "stone-dialogue": goal("stone-dialogue", "watch", "聆听耶稣"),
  "stone-and-prayer": goal("stone-and-prayer", "manual", "移开石头"),
  "call-and-emergence": goal("call-and-emergence", "watch", "看向洞口"),
  responses: goal("responses", "manual", "与众人交谈"),
} satisfies Readonly<Record<VerseBeatId, StageGoal>>;

function goal(
  beatId: VerseBeatId,
  mode: StageGoalMode,
  shortText: string,
): StageGoal {
  return {
    beatId,
    mode,
    shortText,
    hideDuringBlockingUI: true,
  };
}
