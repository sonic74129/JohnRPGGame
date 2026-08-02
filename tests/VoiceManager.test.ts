import { describe, expect, it, vi } from "vitest";

import {
  VoiceManager,
  type VoiceAudioAdapter,
  type VoiceDiagnostic,
  type VoiceDuckRequest,
  type VoiceFallbackEvent,
  type VoiceManagerOptions,
} from "../src/audio/VoiceManager";
import {
  VOICE_CUES,
  type VoiceCueId,
} from "../src/audio/VoiceManifest";

class FakeAudio implements VoiceAudioAdapter {
  readonly source: string;
  preload = "";
  muted = false;
  currentTime = 0;
  paused = true;
  ended = false;
  loadCalls = 0;
  playCalls = 0;
  private readonly endedListeners = new Set<EventListener>();
  private readonly playQueue: Array<() => Promise<void>> = [];

  constructor(source: string) {
    this.source = source;
  }

  load(): void {
    this.loadCalls += 1;
  }

  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    return this.playQueue.shift()?.() ?? Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(_type: "ended", listener: EventListener): void {
    this.endedListeners.add(listener);
  }

  removeEventListener(_type: "ended", listener: EventListener): void {
    this.endedListeners.delete(listener);
  }

  queuePlay(result: Promise<void>): void {
    this.playQueue.push(() => result);
  }

  finish(): void {
    this.ended = true;
    for (const listener of this.endedListeners) {
      listener(new Event("ended"));
    }
  }
}

describe("VoiceManager", () => {
  it("preloads both cues and exposes a silent start unlock", async () => {
    const { manager, audios } = setup();

    await manager.preload();
    expect(audios.size).toBe(2);
    expect([...audios.values()].every((audio) => audio.preload === "auto")).toBe(
      true,
    );
    expect([...audios.values()].every((audio) => audio.loadCalls === 1)).toBe(
      true,
    );

    expect(await manager.unlock()).toBe(true);
    const opening = audioFor(audios, "opening-john11-1-3");
    expect(opening.playCalls).toBe(1);
    expect(opening.paused).toBe(true);
    expect(opening.currentTime).toBe(0);
    expect(opening.muted).toBe(false);
    expect(manager.isUnlocked).toBe(true);
  });

  it("autoplays, replays from zero, and never overlaps active cues", async () => {
    const { manager, audios, duckRequests } = setup();

    expect(await manager.autoplay("opening-john11-1-3")).toBe("playing");
    const opening = audioFor(audios, "opening-john11-1-3");
    opening.currentTime = 4;

    expect(await manager.autoplay("jesus-resurrection-life")).toBe("playing");
    const jesus = audioFor(audios, "jesus-resurrection-life");
    expect(opening.paused).toBe(true);
    expect(opening.currentTime).toBe(0);
    expect(jesus.paused).toBe(false);
    expect(manager.currentCueId).toBe("jesus-resurrection-life");

    jesus.currentTime = 5;
    expect(await manager.replay("jesus-resurrection-life")).toBe("playing");
    expect(jesus.currentTime).toBe(0);
    expect(jesus.playCalls).toBe(2);
    expect(duckRequests.at(-1)).toEqual({
      cueId: "jesus-resurrection-life",
      active: true,
      musicVolume: 0.3,
    });
  });

  it("cancels a pending autoplay without disturbing the replacement cue", async () => {
    const { manager, audios, fallbackEvents } = setup();
    await manager.preload("opening-john11-1-3");
    const opening = audioFor(audios, "opening-john11-1-3");
    const pending = deferred();
    opening.queuePlay(pending.promise);

    const openingResult = manager.autoplay("opening-john11-1-3");
    await vi.waitFor(() => expect(opening.playCalls).toBe(1));
    expect(await manager.autoplay("jesus-resurrection-life")).toBe("playing");
    pending.resolve();

    expect(await openingResult).toBe("cancelled");
    expect(opening.paused).toBe(true);
    expect(opening.currentTime).toBe(0);
    expect(manager.currentCueId).toBe("jesus-resurrection-life");
    expect(fallbackEvents).toHaveLength(0);
  });

  it("waits for every pause reason and releases ducking while paused", async () => {
    const { manager, audios, duckRequests } = setup();
    await manager.autoplay("opening-john11-1-3");
    const opening = audioFor(audios, "opening-john11-1-3");

    manager.pause("game");
    manager.pause("visibility");
    expect(opening.paused).toBe(true);
    expect(duckRequests.at(-1)?.active).toBe(false);

    expect(await manager.resume("visibility")).toBe("paused");
    expect(opening.playCalls).toBe(1);
    expect(await manager.resume("game")).toBe("playing");
    expect(opening.playCalls).toBe(2);
    expect(duckRequests.at(-1)?.musicVolume).toBe(0.3);
  });

  it("mutes without advancing and resumes the same cue when unmuted", async () => {
    const { manager, audios, duckRequests } = setup();
    await manager.autoplay("opening-john11-1-3");
    const opening = audioFor(audios, "opening-john11-1-3");
    opening.currentTime = 7;

    expect(await manager.setMuted(true)).toBe("muted");
    expect(manager.isMuted).toBe(true);
    expect(opening.paused).toBe(true);
    expect(opening.currentTime).toBe(7);
    expect(duckRequests.at(-1)?.active).toBe(false);

    expect(await manager.setMuted(false)).toBe("playing");
    expect(opening.currentTime).toBe(7);
    expect(opening.playCalls).toBe(2);
    expect(duckRequests.at(-1)?.active).toBe(true);
  });

  it("uses a nonblocking text fallback and releases ducking on play failure", async () => {
    const { manager, audios, duckRequests, fallbackEvents } = setup();
    await manager.preload("jesus-resurrection-life");
    const jesus = audioFor(audios, "jesus-resurrection-life");
    jesus.queuePlay(Promise.reject(new Error("autoplay blocked")));

    expect(await manager.autoplay("jesus-resurrection-life")).toBe("fallback");
    expect(manager.currentCueId).toBeUndefined();
    expect(jesus.paused).toBe(true);
    expect(jesus.currentTime).toBe(0);
    expect(duckRequests.map(({ active }) => active)).toEqual([true, false]);
    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0]?.cue.exactText).toBe(
      VOICE_CUES["jesus-resurrection-life"].exactText,
    );
  });

  it("stops and resets on advance, skip, scene change, and natural end", async () => {
    const { manager, audios, duckRequests } = setup();
    const actions = [
      () => manager.handleAdvance(),
      () => manager.handleSkip(),
      () => manager.handleSceneChange(),
    ];

    for (const action of actions) {
      await manager.replay("opening-john11-1-3");
      const opening = audioFor(audios, "opening-john11-1-3");
      opening.currentTime = 3;
      action();
      expect(opening.paused).toBe(true);
      expect(opening.currentTime).toBe(0);
      expect(manager.currentCueId).toBeUndefined();
      expect(duckRequests.at(-1)?.active).toBe(false);
    }

    await manager.replay("opening-john11-1-3");
    const opening = audioFor(audios, "opening-john11-1-3");
    opening.currentTime = 18;
    opening.finish();
    expect(opening.currentTime).toBe(0);
    expect(manager.currentCueId).toBeUndefined();
    expect(duckRequests.at(-1)?.active).toBe(false);
  });

  it("skips stale audio and falls back to the full current scripture text", async () => {
    const cueId = "opening-john11-1-3";
    const currentHash = VOICE_CUES[cueId].textHash;
    const staleManifest = {
      ...VOICE_CUES,
      [cueId]: {
        ...VOICE_CUES[cueId],
        textHash: "0".repeat(64),
      },
    };
    const {
      manager,
      audios,
      diagnostics,
      duckRequests,
      fallbackEvents,
    } = setup({
      manifest: staleManifest,
      development: true,
      computeTextHash: async (cue) =>
        cue.id === cueId ? currentHash : cue.textHash,
    });

    expect(await manager.preload(cueId)).toEqual([]);
    expect(audios.has(VOICE_CUES[cueId].url)).toBe(false);
    expect(await manager.unlock(cueId)).toBe(false);

    expect(await manager.autoplay("jesus-resurrection-life")).toBe("playing");
    expect(await manager.autoplay(cueId)).toBe("fallback");

    expect(audios.has(VOICE_CUES[cueId].url)).toBe(false);
    expect(manager.currentCueId).toBeUndefined();
    expect(duckRequests.map(({ active }) => active)).toEqual([true, false]);
    expect(fallbackEvents.at(-1)).toMatchObject({
      reason: "stale-text",
      actualTextHash: currentHash,
    });
    expect(fallbackEvents.at(-1)?.cue.exactText).toBe(
      VOICE_CUES[cueId].exactText,
    );
    expect(diagnostics.at(-1)).toMatchObject({
      cueId,
      type: "stale-voice-asset",
      expectedTextHash: "0".repeat(64),
      actualTextHash: currentHash,
    });
  });
});

function setup(options: HashTestOptions = {}): {
  manager: VoiceManager;
  audios: Map<string, FakeAudio>;
  duckRequests: VoiceDuckRequest[];
  fallbackEvents: VoiceFallbackEvent[];
  diagnostics: VoiceDiagnostic[];
} {
  const audios = new Map<string, FakeAudio>();
  const duckRequests: VoiceDuckRequest[] = [];
  const fallbackEvents: VoiceFallbackEvent[] = [];
  const diagnostics: VoiceDiagnostic[] = [];
  const manager = new VoiceManager({
    manifest: options.manifest,
    development: options.development ?? false,
    computeTextHash:
      options.computeTextHash ?? (async (cue) => cue.textHash),
    createAudio: (source) => {
      const audio = new FakeAudio(source);
      audios.set(source, audio);
      return audio;
    },
    onDuckRequest: (request) => duckRequests.push(request),
    onFallback: (event) => fallbackEvents.push(event),
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  });
  return { manager, audios, duckRequests, fallbackEvents, diagnostics };
}

type HashTestOptions = Pick<
  VoiceManagerOptions,
  "manifest" | "development" | "computeTextHash"
>;

function audioFor(
  audios: Map<string, FakeAudio>,
  cueId: VoiceCueId,
): FakeAudio {
  const audio = audios.get(VOICE_CUES[cueId].url);
  if (!audio) {
    throw new Error(`Missing fake audio for ${cueId}`);
  }
  return audio;
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
