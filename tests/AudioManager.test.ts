import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AudioManager } from "../src/audio/AudioManager";

class FakeAudio {
  static instances: FakeAudio[] = [];

  readonly src: string;
  loop = false;
  preload = "";
  volume = 1;
  currentTime = 0;
  ended = false;
  paused = true;
  playCalls = 0;

  constructor(src = "") {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

describe("AudioManager", () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;

  beforeEach(() => {
    FakeAudio.instances = [];
    frames = new Map();
    nextFrameId = 1;
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preloads active themes but leaves the unused revelation track lazy", () => {
    new AudioManager();

    expect(track("theme-1").preload).toBe("auto");
    expect(track("theme-2").preload).toBe("auto");
    expect(track("theme-3").preload).toBe("none");
  });

  it("keeps only the latest theme playing after rapid transitions", async () => {
    const audio = new AudioManager();
    await audio.unlock();

    audio.setState("exploration", 0);
    audio.setState("dialogue", 1800);
    audio.setState("revelation", 1800);
    flushFrames();

    expect(track("theme-1").paused).toBe(true);
    expect(track("theme-1").volume).toBe(0);
    expect(track("theme-2").paused).toBe(true);
    expect(track("theme-2").volume).toBe(0);
    expect(track("theme-3").paused).toBe(false);
    expect(track("theme-3").volume).toBeCloseTo(0.16);
  });

  it("does not play a newly selected theme while music is muted", async () => {
    const audio = new AudioManager();
    await audio.unlock();
    audio.setState("exploration", 0);

    expect(audio.toggleMuted()).toBe(true);
    flushFrames();
    audio.setState("dialogue", 0);

    expect(track("theme-2").paused).toBe(true);
    expect(track("theme-2").volume).toBe(0);

    expect(audio.toggleMuted()).toBe(false);
    flushFrames();
    expect(track("theme-2").paused).toBe(false);
    expect(track("theme-2").volume).toBeCloseTo(0.24);
  });

  it("waits for every pause reason to clear before resuming", async () => {
    const audio = new AudioManager();
    await audio.unlock();
    audio.setState("exploration", 0);

    audio.pause("game");
    audio.pause("visibility");
    audio.resume("visibility");
    expect(track("theme-1").paused).toBe(true);

    audio.resume("game");
    flushFrames();
    expect(track("theme-1").paused).toBe(false);
    expect(track("theme-1").volume).toBeCloseTo(0.34);
  });

  it("clamps fade progress when a frame timestamp precedes the transition", async () => {
    const audio = new AudioManager();
    await audio.unlock();
    audio.setState("exploration", 1000);

    const callback = [...frames.values()][0];
    expect(callback).toBeDefined();
    callback?.(0);

    expect(FakeAudio.instances.every(({ volume }) => volume >= 0)).toBe(true);
  });

  function flushFrames(): void {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) {
      callback(performance.now() + 10_000);
    }
  }

  function track(fragment: string): FakeAudio {
    const match = FakeAudio.instances.find((audio) =>
      audio.src.includes(fragment),
    );
    if (!match) {
      throw new Error(`Missing fake audio track: ${fragment}`);
    }
    return match;
  }
});
