import type {
  ChoiceQuestion,
  DialogueLine,
  QuestionResult,
} from "../game/types";
import {
  PORTRAIT_ASSETS,
  type PortraitKey,
} from "../game/CharacterAssets";
import type { StageGoal } from "../game/StageGoals";

type VoidCallback = () => void;

export type TechnicalErrorKind = "browser" | "transition" | "unreachable";

export interface ToastPresentation {
  readonly message: string;
  readonly kind?: "info" | TechnicalErrorKind;
  readonly duration?: number;
}

interface VerseEchoBase {
  readonly text: string;
  readonly reference: string;
  readonly anchor: {
    readonly x: number;
    readonly y: number;
  };
  readonly duration?: number;
}

export type VerseEchoPresentation =
  | (VerseEchoBase & {
      readonly mode: "npc-scripture";
      readonly speaker: string;
    })
  | (VerseEchoBase & {
      readonly mode: "player-memory";
      readonly speaker?: never;
    })
  | (VerseEchoBase & {
      readonly mode: "natural-story";
      readonly speaker: string;
    });

export class GameUI {
  private dialogueLines: readonly DialogueLine[] = [];
  private dialogueIndex = 0;
  private dialogueComplete?: VoidCallback;
  private dialogueLineChanged?: (line: DialogueLine) => void;
  private dialogueReplay?: VoidCallback;
  private dialogueAdvance?: VoidCallback;
  private dialogueLocked = false;
  private dialogueTimer?: number;
  private toastTimer?: number;
  private verseEchoTimer?: number;
  private pauseHandlers?: {
    readonly resume: VoidCallback;
    readonly restart: VoidCallback;
    readonly exit: VoidCallback;
  };

  private readonly hud = this.element("hud");
  private readonly objectiveReference = this.element("objective-reference");
  private readonly stageGoal = this.element("stage-goal");
  private readonly stageGoalMode = this.element("stage-goal-mode");
  private readonly stageGoalText = this.element("stage-goal-text");
  private readonly score = this.element("score");
  private readonly musicToggle = this.button("music-toggle");
  private readonly interactionPrompt = this.element("interaction-prompt");
  private readonly dialogue = this.element("dialogue");
  private readonly dialoguePortrait = this.element("dialogue-portrait");
  private readonly dialogueKind = this.element("dialogue-kind");
  private readonly dialogueReference = this.element("dialogue-reference");
  private readonly dialogueSpeaker = this.element("dialogue-speaker");
  private readonly dialogueText = this.element("dialogue-text");
  private readonly dialogueAudio = this.button("dialogue-audio");
  private readonly dialogueNext = this.button("dialogue-next");
  private readonly technicalToast = this.element("technical-toast");
  private readonly verseEcho = this.element("verse-echo");
  private readonly verseEchoKind = this.element("verse-echo-kind");
  private readonly verseEchoSpeaker = this.element("verse-echo-speaker");
  private readonly verseEchoText = this.element("verse-echo-text");
  private readonly verseEchoReference = this.element("verse-echo-reference");
  private readonly choiceScreen = this.element("choice-screen");
  private readonly choiceQuestion = this.element("choice-question");
  private readonly choiceReference = this.element("choice-reference");
  private readonly choiceOptions = this.element("choice-options");
  private readonly choiceFeedback = this.element("choice-feedback");
  private readonly startScreen = this.element("start-screen");
  private readonly pauseScreen = this.element("pause-screen");
  private readonly resultScreen = this.element("result-screen");

  constructor() {
    this.dialogueNext.addEventListener("click", () => this.advanceDialogue());
    this.dialogueAudio.addEventListener("click", () => this.dialogueReplay?.());
    document.addEventListener("keydown", (event) =>
      this.handleChoiceKeyboard(event),
    );
    this.button("resume-game").addEventListener("click", () =>
      this.pauseHandlers?.resume(),
    );
    this.button("restart-game").addEventListener("click", () =>
      this.pauseHandlers?.restart(),
    );
    this.button("exit-game").addEventListener("click", () =>
      this.pauseHandlers?.exit(),
    );
  }

  bindStart(onStart: (fullscreen: boolean) => void): void {
    this.button("start-game").addEventListener("click", () => onStart(false));
    this.button("start-fullscreen").addEventListener("click", () =>
      onStart(true),
    );
  }

  bindMusicToggle(onToggle: () => boolean): void {
    this.musicToggle.addEventListener("click", () => {
      this.setMusicMuted(onToggle());
    });
  }

  setMusicMuted(muted: boolean): void {
    this.musicToggle.textContent = muted ? "声音：关" : "声音：开";
    this.musicToggle.setAttribute("aria-pressed", String(muted));
  }

  showGameHud(): void {
    this.startScreen.classList.add("is-hidden");
    this.hud.classList.remove("is-hidden");
  }

  setReference(reference: string): void {
    this.objectiveReference.textContent = reference;
  }

  setStageGoal(goal: StageGoal): void {
    this.stageGoal.dataset.mode = goal.mode;
    this.stageGoalMode.textContent =
      goal.mode === "watch" ? "观看阶段" : "当前目标";
    this.stageGoalText.textContent = goal.shortText;
    this.stageGoal.classList.remove("is-hidden");
  }

  setStageGoalSuppressed(suppressed: boolean): void {
    this.stageGoal.classList.toggle("is-suppressed", suppressed);
    this.stageGoal.setAttribute("aria-hidden", String(suppressed));
  }

  setScore(value: number): void {
    this.score.textContent = String(value);
  }

  setInteractionPrompt(visible: boolean, label = "SPACE / 互动"): void {
    this.interactionPrompt.textContent = label;
    this.interactionPrompt.classList.toggle("is-hidden", !visible);
  }

  showDialogue(
    lines: readonly DialogueLine[],
    onComplete: VoidCallback,
    onLineChanged?: (line: DialogueLine) => void,
    onReplay?: VoidCallback,
    onAdvance?: VoidCallback,
  ): void {
    if (lines.length === 0) {
      onComplete();
      return;
    }

    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueComplete = onComplete;
    this.dialogueLineChanged = onLineChanged;
    this.dialogueReplay = onReplay;
    this.dialogueAdvance = onAdvance;
    this.dialogueAudio.classList.toggle("is-hidden", !onReplay);
    this.dialogue.classList.remove("is-hidden");
    this.setStageGoalSuppressed(true);
    this.interactionPrompt.classList.add("is-hidden");
    this.renderDialogueLine();
    this.dialogueNext.focus();
  }

  advanceDialogue(): boolean {
    if (!this.isDialogueOpen()) {
      return false;
    }
    this.dialogueAdvance?.();
    if (this.dialogueLocked) {
      return true;
    }

    this.dialogueIndex += 1;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      this.dialogue.classList.add("is-hidden");
      this.hud.classList.remove("is-hidden");
      const callback = this.dialogueComplete;
      this.dialogueComplete = undefined;
      this.dialogueLineChanged = undefined;
      this.dialogueReplay = undefined;
      this.dialogueAdvance = undefined;
      this.setStageGoalSuppressed(false);
      this.focusGame();
      callback?.();
      return true;
    }

    this.renderDialogueLine();
    return true;
  }

  isDialogueOpen(): boolean {
    return !this.dialogue.classList.contains("is-hidden");
  }

  isChoiceOpen(): boolean {
    return !this.choiceScreen.classList.contains("is-hidden");
  }

  isBlockingOpen(): boolean {
    return this.isDialogueOpen() || this.isChoiceOpen();
  }

  showChoice(
    question: ChoiceQuestion,
    onSelect: (optionId: string) => QuestionResult,
    onCorrect: VoidCallback,
  ): void {
    this.choiceQuestion.textContent = question.prompt;
    this.choiceReference.textContent = question.reference;
    this.choiceFeedback.textContent = "";
    this.choiceOptions.replaceChildren();

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-option";
      button.dataset.key = String(index + 1);
      button.textContent = option.text;
      button.addEventListener("click", () => {
        const result = onSelect(option.id);
        this.choiceFeedback.textContent = result.message;
        if (!result.correct) {
          return;
        }
        this.choiceScreen.classList.add("is-hidden");
        this.hud.classList.remove("is-hidden");
        this.setStageGoalSuppressed(false);
        this.focusGame();
        onCorrect();
      });
      this.choiceOptions.append(button);
    });

    this.hud.classList.add("is-hidden");
    this.setStageGoalSuppressed(true);
    this.interactionPrompt.classList.add("is-hidden");
    this.choiceScreen.classList.remove("is-hidden");
    this.choiceOptions.querySelector("button")?.focus();
  }

  showNotice(message: string, duration = 2800): void {
    this.showToast({ message, duration });
  }

  showTechnicalError(
    message: string,
    kind: TechnicalErrorKind,
    duration = 3200,
  ): void {
    this.showToast({ message, kind, duration });
  }

  showToast(presentation: ToastPresentation): void {
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
    this.technicalToast.textContent = presentation.message;
    this.technicalToast.dataset.kind = presentation.kind ?? "info";
    this.technicalToast.classList.remove("is-hidden");
    this.toastTimer = window.setTimeout(() => {
      this.technicalToast.classList.add("is-hidden");
      this.toastTimer = undefined;
    }, presentation.duration ?? 2800);
  }

  showVerseEcho(presentation: VerseEchoPresentation): void {
    if (this.verseEchoTimer !== undefined) {
      window.clearTimeout(this.verseEchoTimer);
    }

    const x = Math.min(
      window.innerWidth - 16,
      Math.max(16, presentation.anchor.x),
    );
    const y = Math.min(
      window.innerHeight - 16,
      Math.max(16, presentation.anchor.y),
    );
    this.verseEcho.dataset.mode = presentation.mode;
    this.verseEcho.style.left = `${x}px`;
    this.verseEcho.style.top = `${y}px`;
    this.verseEchoKind.textContent =
      presentation.mode === "player-memory"
        ? "玩家回想"
        : presentation.mode === "natural-story"
          ? "路人所述"
          : "经文回看";
    this.verseEchoSpeaker.textContent =
      presentation.mode === "player-memory" ? "" : presentation.speaker;
    this.verseEchoText.textContent = presentation.text;
    this.verseEchoReference.textContent = presentation.reference;
    this.verseEcho.classList.remove("is-hidden");
    this.verseEchoTimer = window.setTimeout(
      () => this.hideVerseEcho(),
      presentation.duration ?? 4200,
    );
  }

  hideVerseEcho(): void {
    if (this.verseEchoTimer !== undefined) {
      window.clearTimeout(this.verseEchoTimer);
      this.verseEchoTimer = undefined;
    }
    this.verseEcho.classList.add("is-hidden");
  }

  dismissBlocking(): void {
    if (this.dialogueTimer !== undefined) {
      window.clearTimeout(this.dialogueTimer);
      this.dialogueTimer = undefined;
    }
    this.dialogue.classList.add("is-hidden");
    this.choiceScreen.classList.add("is-hidden");
    this.dialogueComplete = undefined;
    this.dialogueLineChanged = undefined;
    this.dialogueReplay = undefined;
    this.dialogueAdvance = undefined;
    this.dialogueLocked = false;
    this.setStageGoalSuppressed(false);
  }

  showPause(
    resume: VoidCallback,
    restart: VoidCallback,
    exit: VoidCallback,
  ): void {
    this.pauseHandlers = { resume, restart, exit };
    this.setStageGoalSuppressed(true);
    this.pauseScreen.classList.remove("is-hidden");
    this.button("resume-game").focus();
  }

  hidePause(): void {
    this.pauseScreen.classList.add("is-hidden");
    this.setStageGoalSuppressed(false);
  }

  isPauseOpen(): boolean {
    return !this.pauseScreen.classList.contains("is-hidden");
  }

  showResult(
    score: number,
    title: string,
    onRestart: VoidCallback,
    onExit: VoidCallback,
  ): void {
    this.hud.classList.add("is-hidden");
    this.setStageGoalSuppressed(true);
    this.interactionPrompt.classList.add("is-hidden");
    this.element("final-score").textContent = String(score);
    this.element("result-title").textContent = title;
    this.resultScreen.classList.remove("is-hidden");
    this.button("result-restart").onclick = onRestart;
    this.button("result-exit").onclick = onExit;
    this.button("result-exit").focus();
  }

  private handleChoiceKeyboard(event: KeyboardEvent): void {
    if (!this.isChoiceOpen()) {
      return;
    }

    const buttons = Array.from(
      this.choiceOptions.querySelectorAll<HTMLButtonElement>("button"),
    );
    if (buttons.length === 0) {
      return;
    }

    const currentIndex = Math.max(
      0,
      buttons.findIndex((button) => button === document.activeElement),
    );
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopImmediatePropagation();
      buttons[(currentIndex + 1) % buttons.length]?.focus();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();
      buttons[(currentIndex - 1 + buttons.length) % buttons.length]?.focus();
      return;
    }

    const numericIndex = Number(event.key) - 1;
    if (numericIndex >= 0 && numericIndex < buttons.length) {
      event.preventDefault();
      event.stopImmediatePropagation();
      buttons[numericIndex]?.click();
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      buttons[currentIndex]?.click();
    }
  }

  private renderDialogueLine(): void {
    const line = this.dialogueLines[this.dialogueIndex];
    if (!line) {
      return;
    }
    this.dialogueLineChanged?.(line);

    this.dialogueKind.textContent = "和合本原文";
    this.dialogueKind.className = "content-kind scripture";
    this.dialogueReference.textContent = line.reference ?? "";
    this.dialogueSpeaker.textContent = line.speaker;
    this.dialogueText.textContent = line.text;
    this.renderPortrait(line.portrait);
    this.dialogueLocked = Boolean(line.pauseMs);
    this.dialogueNext.toggleAttribute("disabled", this.dialogueLocked);
    if (this.dialogueTimer !== undefined) {
      window.clearTimeout(this.dialogueTimer);
    }
    if (line.pauseMs) {
      this.dialogueTimer = window.setTimeout(() => {
        this.dialogueLocked = false;
        this.dialogueNext.removeAttribute("disabled");
        this.dialogueNext.focus();
        this.dialogueTimer = undefined;
      }, line.pauseMs);
    }
    this.dialogueNext.textContent =
      this.dialogueIndex === this.dialogueLines.length - 1
        ? "完成　SPACE"
        : "继续　SPACE";
  }

  private renderPortrait(portrait?: PortraitKey): void {
    const selected = portrait ? PORTRAIT_ASSETS[portrait] : undefined;
    this.dialogue.classList.toggle("dialogue--without-portrait", !selected);
    this.dialoguePortrait.classList.toggle("is-hidden", !selected);
    if (!selected) {
      return;
    }
    this.dialoguePortrait.style.backgroundImage = `url("${selected}")`;
  }

  private focusGame(): void {
    this.element("game-root").focus();
  }

  private element(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing UI element #${id}.`);
    }

    return element;
  }

  private button(id: string): HTMLButtonElement {
    const element = this.element(id);
    if (!(element instanceof HTMLButtonElement)) {
      throw new Error(`#${id} must be a button.`);
    }
    return element;
  }
}
