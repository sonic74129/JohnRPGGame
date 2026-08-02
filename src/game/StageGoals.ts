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
  illness: goal("illness", "manual", "查看床边"),
  "sisters-send": goal("sisters-send", "manual", "听取口信"),
  "find-jesus": goal("find-jesus", "manual", "查看四周"),
  message: goal("message", "manual", "传达口信"),
  "two-day-wait": goal("two-day-wait", "watch", "观看"),
  "return-to-judea": goal("return-to-judea", "manual", "继续前行"),
  thomas: goal("thomas", "watch", "留心聆听"),
  "four-days": goal("four-days", "manual", "回到村中"),
  "martha-goes": goal("martha-goes", "manual", "查看周围"),
  "martha-hope": goal("martha-hope", "manual", "继续交谈"),
  "resurrection-life": goal("resurrection-life", "watch", "留心聆听"),
  "martha-confession": goal("martha-confession", "watch", "留心聆听"),
  "martha-calls": goal("martha-calls", "manual", "留心聆听"),
  "mary-rises": goal("mary-rises", "manual", "留心观察"),
  "mary-at-feet": goal("mary-at-feet", "manual", "走近相聚处"),
  "jesus-weeps": goal("jesus-weeps", "manual", "跟随众人"),
  "come-and-see": goal("come-and-see", "manual", "继续前行"),
  "tomb-arrival": goal("tomb-arrival", "manual", "走近洞口"),
  "stone-dialogue": goal("stone-dialogue", "watch", "留心聆听"),
  "stone-and-prayer": goal("stone-and-prayer", "manual", "查看洞口"),
  "call-and-emergence": goal("call-and-emergence", "watch", "看向洞口"),
  responses: goal("responses", "manual", "查看周围"),
} satisfies Readonly<Record<VerseBeatId, StageGoal>>;

const HOUSE_EXIT_GOAL = goal("find-jesus", "manual", "走向门口");

export const resolveStageGoal = (
  beatId: VerseBeatId,
  context: { readonly inWorld: boolean },
): StageGoal =>
  beatId === "find-jesus" && !context.inWorld
    ? HOUSE_EXIT_GOAL
    : STAGE_GOALS[beatId];

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
