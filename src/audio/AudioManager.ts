import type { MusicState } from "../game/types";

interface TrackConfig {
  readonly source: string;
  readonly loop: boolean;
  readonly volume: number;
  readonly preload: "auto" | "none";
}

type PlayableMusicState = Exclude<MusicState, "silence">;
export type AudioPauseReason = "game" | "visibility";

const TRACKS: Record<PlayableMusicState, TrackConfig> = {
  exploration: {
    source: "assets/audio/theme-1-morning-loop.mp3",
    loop: true,
    volume: 0.34,
    preload: "auto",
  },
  dialogue: {
    source: "assets/audio/theme-2-between-lines-loop.mp3",
    loop: true,
    volume: 0.24,
    preload: "auto",
  },
  revelation: {
    source: "assets/audio/theme-3-quiet-before-dawn.mp3",
    loop: false,
    volume: 0.16,
    preload: "none",
  },
};

export class AudioManager {
  private readonly tracks = new Map<PlayableMusicState, HTMLAudioElement>();
  private readonly pauseReasons = new Set<AudioPauseReason>();
  private state: MusicState = "silence";
  private unlocked = false;
  private muted = false;
  private voiceDuckLevel = 1;
  private fadeFrame?: number;
  private transitionToken = 0;

  constructor() {
    for (const [state, config] of Object.entries(TRACKS) as [
      PlayableMusicState,
      TrackConfig,
    ][]) {
      const audio = new Audio(config.source);
      audio.loop = config.loop;
      audio.preload = config.preload;
      audio.volume = 0;
      this.tracks.set(state, audio);
    }
  }

  get currentState(): MusicState {
    return this.state;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked) {
      return true;
    }

    const exploration = this.tracks.get("exploration");
    if (!exploration) {
      return false;
    }

    try {
      exploration.volume = 0;
      await exploration.play();
      exploration.pause();
      exploration.currentTime = 0;
      this.unlocked = true;
      this.applyState(0);
      return true;
    } catch {
      this.unlocked = false;
      return false;
    }
  }

  setState(nextState: MusicState, durationMs = 2000): void {
    this.state = nextState;
    this.applyState(durationMs);
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    this.applyState(this.muted ? 500 : 700);
    return this.muted;
  }

  setVoiceDuck(active: boolean, musicVolume = 0.3): void {
    this.voiceDuckLevel = active
      ? Math.max(0, Math.min(1, musicVolume))
      : 1;
    this.applyState(180);
  }

  pause(reason: AudioPauseReason = "game"): void {
    this.pauseReasons.add(reason);
    this.applyState(0);
  }

  resume(reason: AudioPauseReason = "game"): void {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size > 0) {
      return;
    }
    this.applyState(500);
  }

  stop(): void {
    this.state = "silence";
    this.pauseReasons.clear();
    this.voiceDuckLevel = 1;
    this.applyState(0);
    for (const track of this.tracks.values()) {
      track.currentTime = 0;
    }
  }

  private applyState(durationMs: number): void {
    this.cancelFade();
    const activeState = this.activeState();
    const active = activeState ? this.tracks.get(activeState) : undefined;

    if (active) {
      if (active.ended) {
        active.currentTime = 0;
      }
      void active.play().catch(() => {
        active.pause();
        active.volume = 0;
      });
    }

    const startingVolumes = new Map<PlayableMusicState, number>();
    for (const [state, track] of this.tracks) {
      startingVolumes.set(state, track.volume);
    }

    const token = ++this.transitionToken;
    const startedAt = performance.now();

    const update = (now: number): void => {
      if (token !== this.transitionToken) {
        return;
      }

      const progress = Math.max(
        0,
        Math.min(1, (now - startedAt) / Math.max(1, durationMs)),
      );
      for (const [state, track] of this.tracks) {
        const start = startingVolumes.get(state) ?? 0;
        const target =
          state === activeState
            ? TRACKS[state].volume * this.voiceDuckLevel
            : 0;
        track.volume = start + (target - start) * progress;
      }

      if (progress < 1) {
        this.fadeFrame = requestAnimationFrame(update);
        return;
      }

      for (const [state, track] of this.tracks) {
        if (state !== activeState) {
          track.pause();
          track.volume = 0;
        }
      }
      this.fadeFrame = undefined;
    };

    if (durationMs <= 0) {
      update(startedAt + 1);
    } else {
      this.fadeFrame = requestAnimationFrame(update);
    }
  }

  private activeState(): PlayableMusicState | undefined {
    if (
      !this.unlocked ||
      this.muted ||
      this.pauseReasons.size > 0 ||
      this.state === "silence"
    ) {
      return undefined;
    }
    return this.state;
  }

  private cancelFade(): void {
    this.transitionToken += 1;
    if (this.fadeFrame !== undefined) {
      cancelAnimationFrame(this.fadeFrame);
      this.fadeFrame = undefined;
    }
  }
}
