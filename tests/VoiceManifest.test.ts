import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  JOHN_11_VERSES,
  type John11VerseKey,
} from "../src/game/ScriptureContent";
import {
  VOICE_CUES,
  VOICE_CUE_IDS,
} from "../src/audio/VoiceManifest";

describe("voice manifest", () => {
  it("contains only the two approved exact-text cues", () => {
    expect(VOICE_CUE_IDS).toEqual([
      "opening-john11-1-3",
      "jesus-resurrection-life",
    ]);
    expect(Object.keys(VOICE_CUES)).toEqual(VOICE_CUE_IDS);

    for (const cue of Object.values(VOICE_CUES)) {
      const pairs = cue.verseKeys.map(
        (key) => [key, JOHN_11_VERSES[key].text] as const,
      );
      expect(cue.exactText).toBe(pairs.map(([, text]) => text).join(""));
      expect(cue.textHash).toBe(
        createHash("sha256")
          .update(JSON.stringify(pairs), "utf8")
          .digest("hex"),
      );
      expect(cue.sentenceCues.map(({ text }) => text).join("")).toBe(
        cue.exactText,
      );
      expect(cue.sentenceCues[0]?.startMs).toBe(0);
      expect(cue.sentenceCues.at(-1)?.endMs).toBe(cue.durationMs);
    }
  });

  it("ships matching MP3, SSML, duration, MIME, and source metadata", () => {
    for (const cue of Object.values(VOICE_CUES)) {
      const assetPath = resolve("public", cue.url);
      const sourceRoot = resolve("production/audio-source/voice");
      const ssmlPath = resolve(sourceRoot, `${cue.id}.ssml`);
      const metadataPath = resolve(sourceRoot, `${cue.id}.source.json`);

      expect(existsSync(assetPath)).toBe(true);
      expect(existsSync(ssmlPath)).toBe(true);
      expect(existsSync(metadataPath)).toBe(true);
      expect(cue.mimeType).toBe("audio/mpeg");
      expect(cue.durationMs).toBeGreaterThan(1_000);

      const metadata = JSON.parse(
        readFileSync(metadataPath, "utf8"),
      ) as SourceMetadata;
      expect(metadata.asset.url).toBe(cue.url);
      expect(metadata.asset.mimeType).toBe(cue.mimeType);
      expect(metadata.asset.durationMs).toBe(cue.durationMs);
      expect(metadata.synthesis.voice).toBe(cue.voice);
      expect(metadata.synthesis.voiceStatus).toBe(cue.voiceStatus);

      const ssmlText = readFileSync(ssmlPath, "utf8")
        .replace(/<break\b[^>]*\/>/gu, "")
        .replace(/<[^>]+>/gu, "")
        .replace(/\s+/gu, "");
      expect(ssmlText).toBe(cue.exactText);
    }
  });

  it("does not publish any retired preview recording", () => {
    expect(readdirSync(resolve("public/assets/audio/voice")).sort()).toEqual(
      VOICE_CUE_IDS.map((id) => `${id}.mp3`).sort(),
    );
  });
});

interface SourceMetadata {
  readonly verseKeys: readonly John11VerseKey[];
  readonly synthesis: {
    readonly voice: string;
    readonly voiceStatus: string;
  };
  readonly asset: {
    readonly url: string;
    readonly mimeType: string;
    readonly durationMs: number;
  };
}
