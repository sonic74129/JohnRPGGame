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
