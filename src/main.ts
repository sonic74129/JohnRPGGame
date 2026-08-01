import Phaser from "phaser";

import { AudioManager } from "./audio/AudioManager";
import { BethanyScene } from "./game/BethanyScene";
import { GameUI } from "./ui/GameUI";
import "./styles.css";

const ui = new GameUI();
const audio = new AudioManager();

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
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [BethanyScene],
  callbacks: {
    preBoot: (bootingGame) => {
      bootingGame.registry.set("ui", ui);
      bootingGame.registry.set("audio", audio);
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
  const enterFullscreen =
    fullscreen && !document.fullscreenElement
      ? document.documentElement.requestFullscreen().then(
          () => true,
          () => false,
        )
      : Promise.resolve(true);
  const [audioUnlocked, fullscreenEntered] = await Promise.all([
    unlockAudio,
    enterFullscreen,
  ]);

  if (!audioUnlocked) {
    ui.showNotice("浏览器未能启动音乐；游戏仍可继续。");
  } else if (!fullscreenEntered) {
    ui.showNotice("浏览器未能进入全屏，游戏仍可正常进行。");
  }

  await sceneReady;
  document.getElementById("game-root")?.focus();
  game.events.emit("start-story");
});

ui.bindMusicToggle(() => audio.toggleMuted());

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio.pause("visibility");
  } else {
    audio.resume("visibility");
  }
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
