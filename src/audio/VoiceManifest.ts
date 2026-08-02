import {
  JOHN_11_VERSES,
  type John11VerseKey,
} from "../game/ScriptureContent";

export const VOICE_CUE_IDS = [
  "opening-john11-1-3",
  "jesus-resurrection-life",
] as const;

export type VoiceCueId = (typeof VOICE_CUE_IDS)[number];
export type VoiceSpeaker = "narrator" | "jesus";
export type VoiceStatus = "GA" | "Preview";

export interface VoiceSentenceCue {
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

export interface VoiceCue {
  readonly id: VoiceCueId;
  readonly speaker: VoiceSpeaker;
  readonly verseKeys: readonly John11VerseKey[];
  readonly exactText: string;
  readonly textHash: string;
  readonly url: string;
  readonly mimeType: "audio/mpeg";
  readonly durationMs: number;
  readonly sentenceCues: readonly VoiceSentenceCue[];
  readonly provider: "Azure AI Speech";
  readonly region: "eastus";
  readonly voice: string;
  readonly voiceStatus: VoiceStatus;
  readonly musicDuckLevel: 0.3;
  readonly fallback: {
    readonly mode: "silent-scripture-text";
    readonly synthesisFallbackUsed: boolean;
  };
}

export type VoiceTextPair = readonly [John11VerseKey, string];

const OPENING_VERSE_KEYS = [
  "john11:1",
  "john11:2",
  "john11:3",
] as const satisfies readonly John11VerseKey[];

const JESUS_VERSE_KEYS = [
  "john11:25",
  "john11:26",
] as const satisfies readonly John11VerseKey[];

export const voiceTextPairsFor = (
  verseKeys: readonly John11VerseKey[],
): readonly VoiceTextPair[] =>
  verseKeys.map((key) => [key, JOHN_11_VERSES[key].text] as const);

export const serializeVoiceText = (
  verseKeys: readonly John11VerseKey[],
): string => JSON.stringify(voiceTextPairsFor(verseKeys));

export const computeVoiceTextHash = async (
  verseKeys: readonly John11VerseKey[],
): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable for voice text verification");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serializeVoiceText(verseKeys)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const exactTextFor = (verseKeys: readonly John11VerseKey[]): string =>
  voiceTextPairsFor(verseKeys)
    .map(([, text]) => text)
    .join("");

const sentenceParts = (text: string): readonly string[] =>
  text.match(/[^。；？]+[。；？](?:”)?/gu) ?? [text];

const timedCues = (
  parts: readonly string[],
  boundariesMs: readonly number[],
): readonly VoiceSentenceCue[] => {
  if (boundariesMs.length !== parts.length + 1) {
    throw new Error("Voice sentence timing count does not match scripture text");
  }

  return parts.map((text, index) => ({
    startMs: boundariesMs[index] ?? 0,
    endMs: boundariesMs[index + 1] ?? boundariesMs[index] ?? 0,
    text,
  }));
};

const openingExactText = exactTextFor(OPENING_VERSE_KEYS);
const jesusExactText = exactTextFor(JESUS_VERSE_KEYS);

export const VOICE_CUES: Readonly<Record<VoiceCueId, VoiceCue>> = {
  "opening-john11-1-3": {
    id: "opening-john11-1-3",
    speaker: "narrator",
    verseKeys: OPENING_VERSE_KEYS,
    exactText: openingExactText,
    textHash:
      "1d9eadf6dc886a15abb456f24657c90079d0a428a6cde37f49f7b474bdba3f49",
    url: "assets/audio/voice/opening-john11-1-3.mp3",
    mimeType: "audio/mpeg",
    durationMs: 18_447,
    sentenceCues: timedCues(
      OPENING_VERSE_KEYS.map((key) => JOHN_11_VERSES[key].text),
      [0, 6_098, 13_233, 18_447],
    ),
    provider: "Azure AI Speech",
    region: "eastus",
    voice: "zh-CN-YunyangNeural",
    voiceStatus: "GA",
    musicDuckLevel: 0.3,
    fallback: {
      mode: "silent-scripture-text",
      synthesisFallbackUsed: false,
    },
  },
  "jesus-resurrection-life": {
    id: "jesus-resurrection-life",
    speaker: "jesus",
    verseKeys: JESUS_VERSE_KEYS,
    exactText: jesusExactText,
    textHash:
      "dd3b271aa70d0aca9f740848409e0772a77017fe0f4290109353efc3f35acafb",
    url: "assets/audio/voice/jesus-resurrection-life.mp3",
    mimeType: "audio/mpeg",
    durationMs: 16_619,
    sentenceCues: timedCues(sentenceParts(jesusExactText), [
      0, 6_131, 10_490, 14_794, 16_619,
    ]),
    provider: "Azure AI Speech",
    region: "eastus",
    voice: "zh-CN-Bo:MAI-Voice-2",
    voiceStatus: "Preview",
    musicDuckLevel: 0.3,
    fallback: {
      mode: "silent-scripture-text",
      synthesisFallbackUsed: false,
    },
  },
};
