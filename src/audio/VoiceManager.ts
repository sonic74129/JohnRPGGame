/// <reference types="vite/client" />

import {
  computeVoiceTextHash,
  VOICE_CUES,
  VOICE_CUE_IDS,
  type VoiceCue,
  type VoiceCueId,
} from "./VoiceManifest";

export type VoicePauseReason = "game" | "visibility";
export type VoicePlayResult =
  | "playing"
  | "paused"
  | "muted"
  | "fallback"
  | "cancelled";

export interface VoiceAudioAdapter {
  preload: string;
  muted: boolean;
  currentTime: number;
  readonly paused: boolean;
  readonly ended: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: "ended", listener: EventListener): void;
  removeEventListener(type: "ended", listener: EventListener): void;
}

export type VoiceAudioFactory = (source: string) => VoiceAudioAdapter;

export interface VoiceDuckRequest {
  readonly cueId: VoiceCueId;
  readonly active: boolean;
  readonly musicVolume: number;
}

export interface VoiceFallbackEvent {
  readonly cue: VoiceCue;
  readonly reason: "play-failed" | "stale-text" | "hash-unavailable";
  readonly actualTextHash?: string;
  readonly error?: unknown;
}

export interface VoiceDiagnostic {
  readonly cueId: VoiceCueId;
  readonly type: "stale-voice-asset" | "voice-hash-unavailable";
  readonly expectedTextHash: string;
  readonly actualTextHash?: string;
  readonly message: string;
}

export interface VoiceManagerOptions {
  readonly manifest?: Readonly<Record<VoiceCueId, VoiceCue>>;
  readonly createAudio?: VoiceAudioFactory;
  readonly computeTextHash?: (cue: VoiceCue) => Promise<string>;
  readonly development?: boolean;
  readonly onDuckRequest?: (request: VoiceDuckRequest) => void;
  readonly onFallback?: (event: VoiceFallbackEvent) => void;
  readonly onDiagnostic?: (diagnostic: VoiceDiagnostic) => void;
}

interface ActiveVoice {
  readonly cueId: VoiceCueId;
  readonly audio: VoiceAudioAdapter;
  token: number;
}

interface VoiceVerification {
  readonly valid: boolean;
  readonly actualTextHash?: string;
  readonly error?: unknown;
}

const createBrowserAudio: VoiceAudioFactory = (source) => new Audio(source);
const computeCurrentTextHash = (cue: VoiceCue): Promise<string> =>
  computeVoiceTextHash(cue.verseKeys);
const reportToConsole = (diagnostic: VoiceDiagnostic): void => {
  console.warn(diagnostic.message, diagnostic);
};

export class VoiceManager {
  private readonly manifest: Readonly<Record<VoiceCueId, VoiceCue>>;
  private readonly createAudio: VoiceAudioFactory;
  private readonly computeTextHash: (cue: VoiceCue) => Promise<string>;
  private readonly development: boolean;
  private readonly onDuckRequest?: (request: VoiceDuckRequest) => void;
  private readonly onFallback?: (event: VoiceFallbackEvent) => void;
  private readonly onDiagnostic: (diagnostic: VoiceDiagnostic) => void;
  private readonly audioByCue = new Map<VoiceCueId, VoiceAudioAdapter>();
  private readonly endedHandlers = new Map<VoiceCueId, EventListener>();
  private readonly pauseReasons = new Set<VoicePauseReason>();
  private active?: ActiveVoice;
  private duckedCueId?: VoiceCueId;
  private playbackToken = 0;
  private unlocked = false;
  private muted = false;

  constructor(options: VoiceManagerOptions = {}) {
    this.manifest = options.manifest ?? VOICE_CUES;
    this.createAudio = options.createAudio ?? createBrowserAudio;
    this.computeTextHash = options.computeTextHash ?? computeCurrentTextHash;
    this.development = options.development ?? import.meta.env.DEV;
    this.onDuckRequest = options.onDuckRequest;
    this.onFallback = options.onFallback;
    this.onDiagnostic = options.onDiagnostic ?? reportToConsole;
  }

  get currentCueId(): VoiceCueId | undefined {
    return this.active?.cueId;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  async preload(cueId?: VoiceCueId): Promise<readonly VoiceCueId[]> {
    const cueIds = cueId ? [cueId] : VOICE_CUE_IDS;
    const loaded: VoiceCueId[] = [];
    for (const id of cueIds) {
      const cue = this.manifest[id];
      const verification = await this.verifyCue(cue);
      if (!verification.valid) {
        this.reportVerificationFailure(cue, verification, false);
        continue;
      }
      this.ensureAudio(id).load();
      loaded.push(id);
    }
    return loaded;
  }

  async unlock(cueId: VoiceCueId = VOICE_CUE_IDS[0]): Promise<boolean> {
    const cue = this.manifest[cueId];
    const verification = await this.verifyCue(cue);
    if (!verification.valid) {
      this.reportVerificationFailure(cue, verification, false);
      return false;
    }
    if (this.unlocked || this.active) {
      this.unlocked = true;
      return true;
    }

    const audio = this.ensureAudio(cueId);
    const wasMuted = audio.muted;
    audio.muted = true;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
      this.unlocked = true;
      return true;
    } catch {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
      this.unlocked = false;
      return false;
    }
  }

  autoplay(cueId: VoiceCueId): Promise<VoicePlayResult> {
    if (this.active?.cueId === cueId) {
      if (this.muted) {
        return Promise.resolve("muted");
      }
      if (this.pauseReasons.size > 0 || this.active.audio.paused) {
        return Promise.resolve("paused");
      }
      return Promise.resolve("playing");
    }

    return this.start(cueId);
  }

  replay(cueId: VoiceCueId): Promise<VoicePlayResult> {
    return this.start(cueId);
  }

  pause(reason: VoicePauseReason = "game"): void {
    this.pauseReasons.add(reason);
    if (!this.active) {
      return;
    }

    this.active.token = ++this.playbackToken;
    this.active.audio.pause();
    this.releaseDuck();
  }

  resume(reason: VoicePauseReason = "game"): Promise<VoicePlayResult | "idle"> {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size > 0) {
      return Promise.resolve("paused");
    }
    if (!this.active) {
      return Promise.resolve("idle");
    }
    if (this.muted) {
      return Promise.resolve("muted");
    }
    if (!this.active.audio.paused) {
      return Promise.resolve("playing");
    }

    this.active.token = ++this.playbackToken;
    return this.playActive(this.active);
  }

  async setMuted(muted: boolean): Promise<VoicePlayResult | "idle"> {
    if (this.muted === muted) {
      return this.active ? (muted ? "muted" : "playing") : "idle";
    }

    this.muted = muted;
    for (const audio of this.audioByCue.values()) {
      audio.muted = muted;
    }

    if (!this.active) {
      return "idle";
    }

    this.active.token = ++this.playbackToken;
    if (muted) {
      this.active.audio.pause();
      this.releaseDuck();
      return "muted";
    }
    if (this.pauseReasons.size > 0) {
      return "paused";
    }

    return this.playActive(this.active);
  }

  toggleMuted(): Promise<VoicePlayResult | "idle"> {
    return this.setMuted(!this.muted);
  }

  stop(): void {
    this.stopActive();
  }

  handleAdvance(): void {
    this.stopActive();
  }

  handleSkip(): void {
    this.stopActive();
  }

  handleSceneChange(): void {
    this.stopActive();
  }

  dispose(): void {
    this.stopActive();
    for (const [cueId, audio] of this.audioByCue) {
      const handler = this.endedHandlers.get(cueId);
      if (handler) {
        audio.removeEventListener("ended", handler);
      }
    }
    this.endedHandlers.clear();
    this.audioByCue.clear();
  }

  private async start(cueId: VoiceCueId): Promise<VoicePlayResult> {
    this.stopActive();
    const requestToken = ++this.playbackToken;
    const cue = this.manifest[cueId];
    const verification = await this.verifyCue(cue);
    if (requestToken !== this.playbackToken) {
      return "cancelled";
    }
    if (!verification.valid) {
      this.reportVerificationFailure(cue, verification, true);
      return "fallback";
    }

    const audio = this.ensureAudio(cueId);
    audio.currentTime = 0;
    audio.muted = this.muted;
    const active: ActiveVoice = {
      cueId,
      audio,
      token: requestToken,
    };
    this.active = active;

    if (this.muted) {
      return Promise.resolve("muted");
    }
    if (this.pauseReasons.size > 0) {
      return Promise.resolve("paused");
    }

    return this.playActive(active);
  }

  private async playActive(active: ActiveVoice): Promise<VoicePlayResult> {
    const cue = this.manifest[active.cueId];
    const token = active.token;
    this.requestDuck(cue);
    try {
      await active.audio.play();
      return this.active?.token === token ? "playing" : "cancelled";
    } catch (error) {
      if (this.active?.token !== token) {
        return "cancelled";
      }
      this.stopActive();
      this.onFallback?.({
        cue,
        reason: "play-failed",
        error,
      });
      return "fallback";
    }
  }

  private async verifyCue(cue: VoiceCue): Promise<VoiceVerification> {
    try {
      const actualTextHash = await this.computeTextHash(cue);
      return {
        valid: actualTextHash === cue.textHash,
        actualTextHash,
      };
    } catch (error) {
      return {
        valid: false,
        error,
      };
    }
  }

  private reportVerificationFailure(
    cue: VoiceCue,
    verification: VoiceVerification,
    useSubtitleFallback: boolean,
  ): void {
    const unavailable = verification.actualTextHash === undefined;
    if (this.development) {
      this.onDiagnostic({
        cueId: cue.id,
        type: unavailable ? "voice-hash-unavailable" : "stale-voice-asset",
        expectedTextHash: cue.textHash,
        actualTextHash: verification.actualTextHash,
        message: unavailable
          ? `[VoiceManager] Cannot verify voice text hash for ${cue.id}; skipping audio.`
          : `[VoiceManager] Stale voice asset ${cue.id}: expected ${cue.textHash}, current ${verification.actualTextHash}; skipping audio.`,
      });
    }
    if (useSubtitleFallback) {
      this.onFallback?.({
        cue,
        reason: unavailable ? "hash-unavailable" : "stale-text",
        actualTextHash: verification.actualTextHash,
        error: verification.error,
      });
    }
  }

  private ensureAudio(cueId: VoiceCueId): VoiceAudioAdapter {
    const existing = this.audioByCue.get(cueId);
    if (existing) {
      return existing;
    }

    const audio = this.createAudio(this.manifest[cueId].url);
    audio.preload = "auto";
    audio.muted = this.muted;
    const endedHandler: EventListener = () => {
      if (this.active?.cueId !== cueId || this.active.audio !== audio) {
        return;
      }
      this.playbackToken += 1;
      this.active = undefined;
      audio.pause();
      audio.currentTime = 0;
      this.releaseDuck();
    };
    audio.addEventListener("ended", endedHandler);
    this.audioByCue.set(cueId, audio);
    this.endedHandlers.set(cueId, endedHandler);
    return audio;
  }

  private stopActive(): void {
    this.playbackToken += 1;
    const active = this.active;
    this.active = undefined;
    if (active) {
      active.audio.pause();
      active.audio.currentTime = 0;
    }
    this.releaseDuck();
  }

  private requestDuck(cue: VoiceCue): void {
    if (this.duckedCueId === cue.id) {
      return;
    }
    this.releaseDuck();
    this.duckedCueId = cue.id;
    this.onDuckRequest?.({
      cueId: cue.id,
      active: true,
      musicVolume: cue.musicDuckLevel,
    });
  }

  private releaseDuck(): void {
    if (!this.duckedCueId) {
      return;
    }
    const cueId = this.duckedCueId;
    this.duckedCueId = undefined;
    this.onDuckRequest?.({
      cueId,
      active: false,
      musicVolume: 1,
    });
  }
}
