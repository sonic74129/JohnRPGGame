import type { PortraitKey } from "./CharacterAssets";
import type { John11VerseKey } from "./ScriptureContent";
import type { VerseBeatId } from "./VerseBeats";

export interface DialoguePortraitAssignment {
  readonly beatId: VerseBeatId;
  readonly verseKey: John11VerseKey;
  readonly sourceSpeaker: string;
  readonly portrait: PortraitKey;
  readonly displayedSpeaker?: string;
}

export const DIALOGUE_PORTRAIT_ASSIGNMENTS = [
  {
    beatId: "message",
    verseKey: "john11:3",
    sourceSpeaker: "姐妹二人",
    displayedSpeaker: "报信者",
    portrait: "messenger",
  },
  {
    beatId: "message",
    verseKey: "john11:4",
    sourceSpeaker: "耶稣",
    portrait: "jesus-listening",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:7",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:9",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:10",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:11",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:14",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:15",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "thomas",
    verseKey: "john11:16",
    sourceSpeaker: "多马",
    portrait: "thomas",
  },
  {
    beatId: "martha-hope",
    verseKey: "john11:21",
    sourceSpeaker: "马大",
    portrait: "martha-grieving",
  },
  {
    beatId: "martha-hope",
    verseKey: "john11:22",
    sourceSpeaker: "马大",
    portrait: "martha-grieving",
  },
  {
    beatId: "martha-hope",
    verseKey: "john11:23",
    sourceSpeaker: "耶稣",
    portrait: "jesus-listening",
  },
  {
    beatId: "martha-hope",
    verseKey: "john11:24",
    sourceSpeaker: "马大",
    portrait: "martha-faith",
  },
  {
    beatId: "resurrection-life",
    verseKey: "john11:25",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "resurrection-life",
    verseKey: "john11:26",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "martha-confession",
    verseKey: "john11:27",
    sourceSpeaker: "马大",
    portrait: "martha-faith",
  },
  {
    beatId: "martha-calls",
    verseKey: "john11:28",
    sourceSpeaker: "马大",
    portrait: "martha-faith",
  },
  {
    beatId: "mary-rises",
    verseKey: "john11:29",
    sourceSpeaker: "经文",
    portrait: "mary-urgent",
  },
  {
    beatId: "mary-at-feet",
    verseKey: "john11:32",
    sourceSpeaker: "马利亚",
    portrait: "mary-grieving",
  },
  {
    beatId: "jesus-weeps",
    verseKey: "john11:34",
    sourceSpeaker: "耶稣",
    portrait: "jesus-weeping",
  },
  {
    beatId: "jesus-weeps",
    verseKey: "john11:34",
    sourceSpeaker: "众人",
    portrait: "witness",
  },
  {
    beatId: "jesus-weeps",
    verseKey: "john11:35",
    sourceSpeaker: "耶稣",
    portrait: "jesus-weeping",
  },
  {
    beatId: "jesus-weeps",
    verseKey: "john11:36",
    sourceSpeaker: "众人",
    portrait: "witness",
  },
  {
    beatId: "jesus-weeps",
    verseKey: "john11:37",
    sourceSpeaker: "众人",
    portrait: "witness",
  },
  {
    beatId: "stone-dialogue",
    verseKey: "john11:39",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "stone-dialogue",
    verseKey: "john11:39",
    sourceSpeaker: "马大",
    portrait: "martha-grieving",
  },
  {
    beatId: "stone-dialogue",
    verseKey: "john11:40",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "stone-and-prayer",
    verseKey: "john11:41",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "stone-and-prayer",
    verseKey: "john11:42",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "call-and-emergence",
    verseKey: "john11:43",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "call-and-emergence",
    verseKey: "john11:44",
    sourceSpeaker: "耶稣",
    portrait: "jesus-declaration",
  },
  {
    beatId: "illness",
    verseKey: "john11:1",
    sourceSpeaker: "经文",
    portrait: "martha-worried",
  },
  {
    beatId: "illness",
    verseKey: "john11:2",
    sourceSpeaker: "经文",
    portrait: "mary-worried",
  },
  {
    beatId: "sisters-send",
    verseKey: "john11:3",
    sourceSpeaker: "姐妹二人",
    portrait: "martha-worried",
  },
  {
    beatId: "two-day-wait",
    verseKey: "john11:5",
    sourceSpeaker: "经文",
    portrait: "jesus-listening",
  },
  {
    beatId: "two-day-wait",
    verseKey: "john11:6",
    sourceSpeaker: "经文",
    portrait: "jesus-listening",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:8",
    sourceSpeaker: "门徒",
    portrait: "thomas",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:12",
    sourceSpeaker: "门徒",
    portrait: "thomas",
  },
  {
    beatId: "return-to-judea",
    verseKey: "john11:13",
    sourceSpeaker: "经文",
    portrait: "jesus-listening",
  },
  {
    beatId: "four-days",
    verseKey: "john11:17",
    sourceSpeaker: "经文",
    portrait: "martha-grieving",
  },
  {
    beatId: "four-days",
    verseKey: "john11:18",
    sourceSpeaker: "经文",
    portrait: "martha-grieving",
  },
  {
    beatId: "four-days",
    verseKey: "john11:19",
    sourceSpeaker: "经文",
    portrait: "witness",
  },
  {
    beatId: "martha-goes",
    verseKey: "john11:20",
    sourceSpeaker: "经文",
    portrait: "martha-grieving",
  },
  {
    beatId: "mary-rises",
    verseKey: "john11:30",
    sourceSpeaker: "经文",
    portrait: "jesus-listening",
  },
  {
    beatId: "mary-rises",
    verseKey: "john11:31",
    sourceSpeaker: "经文",
    portrait: "witness",
  },
  {
    beatId: "mary-at-feet",
    verseKey: "john11:33",
    sourceSpeaker: "经文",
    portrait: "jesus-weeping",
  },
  {
    beatId: "come-and-see",
    verseKey: "john11:34",
    sourceSpeaker: "耶稣",
    portrait: "jesus-weeping",
  },
  {
    beatId: "come-and-see",
    verseKey: "john11:34",
    sourceSpeaker: "众人",
    portrait: "witness",
  },
  {
    beatId: "come-and-see",
    verseKey: "john11:38",
    sourceSpeaker: "经文",
    portrait: "jesus-weeping",
  },
  {
    beatId: "tomb-arrival",
    verseKey: "john11:38",
    sourceSpeaker: "经文",
    portrait: "jesus-weeping",
  },
  {
    beatId: "call-and-emergence",
    verseKey: "john11:44",
    sourceSpeaker: "经文",
    portrait: "witness",
  },
  {
    beatId: "responses",
    verseKey: "john11:45",
    sourceSpeaker: "经文",
    portrait: "witness",
  },
  {
    beatId: "responses",
    verseKey: "john11:46",
    sourceSpeaker: "经文",
    portrait: "witness",
  },
] as const satisfies readonly DialoguePortraitAssignment[];

const assignmentKey = (
  beatId: VerseBeatId,
  verseKey: John11VerseKey,
  sourceSpeaker: string,
): string => `${beatId}\u0000${verseKey}\u0000${sourceSpeaker}`;

const ASSIGNMENT_BY_LINE = new Map(
  DIALOGUE_PORTRAIT_ASSIGNMENTS.map((assignment) => [
    assignmentKey(
      assignment.beatId,
      assignment.verseKey,
      assignment.sourceSpeaker,
    ),
    assignment,
  ]),
);

export const dialoguePortraitAssignment = (
  beatId: VerseBeatId,
  verseKey: John11VerseKey,
  sourceSpeaker: string,
): DialoguePortraitAssignment | undefined =>
  ASSIGNMENT_BY_LINE.get(assignmentKey(beatId, verseKey, sourceSpeaker));
