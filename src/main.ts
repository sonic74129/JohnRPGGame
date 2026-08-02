import Phaser from "phaser";

import { AudioManager } from "./audio/AudioManager";
import { VoiceManager } from "./audio/VoiceManager";
import {
  VOICE_CUES,
  VOICE_CUE_IDS,
  type VoiceCueId,
} from "./audio/VoiceManifest";
import { BethanyScene } from "./game/BethanyScene";
import { LINEAR_RENDER_CONFIG } from "./game/DisplayScale";
import { JOHN_11_VERSES } from "./game/ScriptureContent";
import { GameUI } from "./ui/GameUI";
import "./styles.css";

const ui = new GameUI();
const audio = new AudioManager();
const voice = new VoiceManager({
  onDuckRequest: ({ active, musicVolume }) =>
    audio.setVoiceDuck(active, musicVolume),
  onFallback: ({ cue, error }) => {
    console.warn(`Voice fallback for ${cue.id}.`, error);
    ui.showTechnicalError("语音不可用，已继续显示经文字幕。", "browser", 2200);
  },
});

const validVoiceCues = validateVoiceManifest().catch((error: unknown) => {
  console.warn("Voice manifest validation failed; voice will remain silent.", error);
  return new Set<VoiceCueId>();
});
void validVoiceCues.then((cueIds) => {
  cueIds.forEach((cueId) => voice.preload(cueId));
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1280,
  height: 720,
  backgroundColor: "#706348",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: LINEAR_RENDER_CONFIG,
  scene: [BethanyScene],
  callbacks: {
    preBoot: (bootingGame) => {
      bootingGame.registry.set("ui", ui);
      bootingGame.registry.set("audio", audio);
      bootingGame.registry.set("voice", voice);
      bootingGame.registry.set("valid-voice-cues", validVoiceCues);
    },
  },
});

const sceneReady = new Promise<void>((resolve) => {
  if (game.registry.get("bethany-ready") === true) {
    resolve();
    return;
  }
  game.events.once("bethany-ready", resolve);
});

let starting = false;
ui.bindStart(async (fullscreen) => {
  if (starting) {
    return;
  }
  starting = true;

  const unlockAudio = audio.unlock();
  const unlockVoice = validVoiceCues.then(async (cueIds) => {
    const cueId = VOICE_CUE_IDS.find((candidate) => cueIds.has(candidate));
    return cueId ? voice.unlock(cueId) : false;
  });
  const enterFullscreen =
    fullscreen && !document.fullscreenElement
      ? document.documentElement.requestFullscreen().then(
          () => true,
          () => false,
        )
      : Promise.resolve(true);
  const [audioUnlocked, voiceUnlocked, fullscreenEntered] = await Promise.all([
    unlockAudio,
    unlockVoice,
    enterFullscreen,
  ]);

  if (!audioUnlocked || !voiceUnlocked) {
    ui.showTechnicalError("浏览器未能启动全部声音；游戏仍可继续。", "browser");
  } else if (!fullscreenEntered) {
    ui.showTechnicalError(
      "浏览器未能进入全屏，游戏仍可正常进行。",
      "browser",
    );
  }

  await sceneReady;
  document.getElementById("game-root")?.focus();
  game.events.emit("start-story");
});

ui.bindMusicToggle(() => {
  const muted = audio.toggleMuted();
  void voice.setMuted(muted);
  return muted;
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio.pause("visibility");
    voice.pause("visibility");
  } else {
    audio.resume("visibility");
    void voice.resume("visibility");
  }
});

window.addEventListener("beforeunload", () => {
  voice.handleSceneChange();
  audio.stop();
});

window.addEventListener(
  "keydown",
  (event) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(
        event.key,
      )
    ) {
      event.preventDefault();
    }
  },
  { passive: false },
);

async function validateVoiceManifest(): Promise<ReadonlySet<VoiceCueId>> {
  const valid = new Set<VoiceCueId>();
  for (const cueId of VOICE_CUE_IDS) {
    const cue = VOICE_CUES[cueId];
    const payload = JSON.stringify(
      cue.verseKeys.map((key) => [key, JOHN_11_VERSES[key].text]),
    );
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(payload),
    );
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (hash === cue.textHash) {
      valid.add(cueId);
    } else {
      console.warn(
        `Voice cue ${cueId} is stale and will not be played: textHash mismatch.`,
      );
    }
  }
  return valid;
}
