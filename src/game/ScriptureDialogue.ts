import { JOHN_11_VERSES, type John11VerseKey } from "./ScriptureContent";
import type { DialogueLine } from "./types";
import type { VerseBeat } from "./VerseBeats";

interface ScriptureExcerpt {
  readonly speaker: string;
  readonly text: string;
}

const MIXED_SPEAKER_EXCERPTS: Readonly<
  Partial<Record<John11VerseKey, readonly ScriptureExcerpt[]>>
> = {
  "john11:34": [
    {
      speaker: "耶稣",
      text: "便说：“你们把他安放在哪里？”",
    },
    {
      speaker: "众人",
      text: "他们回答说：“请主来看。”",
    },
  ],
  "john11:39": [
    {
      speaker: "耶稣",
      text: "耶稣说：“你们把石头挪开。”",
    },
    {
      speaker: "马大",
      text: "那死人的姐姐马大对他说：“主啊，他现在必是臭了，因为他死了已经四天了。”",
    },
  ],
};

const verseSpeaker = (verse: number): string => {
  if ([4, 7, 9, 10, 11, 14, 15, 23, 25, 26, 35, 40, 41, 42, 43].includes(verse)) {
    return "耶稣";
  }
  if ([21, 22, 24, 27, 28, 39].includes(verse)) {
    return "马大";
  }
  if (verse === 32) {
    return "马利亚";
  }
  if (verse === 16) {
    return "多马";
  }
  if ([8, 12].includes(verse)) {
    return "门徒";
  }
  if ([34, 36, 37].includes(verse)) {
    return "众人";
  }
  if (verse === 3) {
    return "姐妹二人";
  }
  return "经文";
};

export const dialogueLinesForVerse = (
  key: John11VerseKey,
): readonly DialogueLine[] => {
  const verse = JOHN_11_VERSES[key];
  const excerpts = MIXED_SPEAKER_EXCERPTS[key] ?? [
    { speaker: verseSpeaker(verse.verse), text: verse.text },
  ];
  return excerpts.map((excerpt) => ({
    ...excerpt,
    reference: verse.reference,
    kind: "scripture",
  }));
};

export const dialogueLinesForBeat = (
  beat: Pick<VerseBeat, "verseKeys">,
): readonly DialogueLine[] =>
  beat.verseKeys.flatMap((key) => dialogueLinesForVerse(key));
