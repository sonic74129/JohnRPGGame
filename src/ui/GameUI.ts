import type {
  ChoiceQuestion,
  DialogueLine,
  Objective,
  QuestionResult,
} from "../game/types";

type VoidCallback = () => void;

export class GameUI {
  private dialogueLines: readonly DialogueLine[] = [];
  private dialogueIndex = 0;
  private dialogueComplete?: VoidCallback;
  private dialogueLineChanged?: (line: DialogueLine) => void;
  private dialogueLocked = false;
  private dialogueTimer?: number;
  private noticeTimer?: number;
  private pauseHandlers?: {
    readonly resume: VoidCallback;
    readonly restart: VoidCallback;
    readonly exit: VoidCallback;
  };

  private readonly hud = this.element("hud");
  private readonly objective = this.element("objective");
  private readonly objectiveReference = this.element("objective-reference");
  private readonly score = this.element("score");
  private readonly musicToggle = this.button("music-toggle");
  private readonly interactionPrompt = this.element("interaction-prompt");
  private readonly dialogue = this.element("dialogue");
  private readonly dialoguePortrait = this.element("dialogue-portrait");
  private readonly dialogueKind = this.element("dialogue-kind");
  private readonly dialogueReference = this.element("dialogue-reference");
  private readonly dialogueSpeaker = this.element("dialogue-speaker");
  private readonly dialogueText = this.element("dialogue-text");
  private readonly dialogueNext = this.button("dialogue-next");
  private readonly notice = this.element("notice");
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
    this.musicToggle.textContent = muted ? "音乐：关" : "音乐：开";
    this.musicToggle.setAttribute("aria-pressed", String(muted));
  }

  showGameHud(): void {
    this.startScreen.classList.add("is-hidden");
    this.hud.classList.remove("is-hidden");
  }

  setObjective(objective: Objective): void {
    this.objective.textContent = objective.text;
    this.objectiveReference.textContent = objective.reference;
  }

  setScore(value: number): void {
    this.score.textContent = String(value);
  }

  setInteractionPrompt(visible: boolean, label = "SPACE / 点击人物"): void {
    this.interactionPrompt.textContent = label;
    this.interactionPrompt.classList.toggle("is-hidden", !visible);
  }

  showDialogue(
    lines: readonly DialogueLine[],
    onComplete: VoidCallback,
    onLineChanged?: (line: DialogueLine) => void,
  ): void {
    if (lines.length === 0) {
      onComplete();
      return;
    }

    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueComplete = onComplete;
    this.dialogueLineChanged = onLineChanged;
    this.dialogue.classList.remove("is-hidden");
    this.interactionPrompt.classList.add("is-hidden");
    this.renderDialogueLine();
    this.dialogueNext.focus();
  }

  advanceDialogue(): boolean {
    if (!this.isDialogueOpen()) {
      return false;
    }
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
        this.focusGame();
        onCorrect();
      });
      this.choiceOptions.append(button);
    });

    this.hud.classList.add("is-hidden");
    this.interactionPrompt.classList.add("is-hidden");
    this.choiceScreen.classList.remove("is-hidden");
    this.choiceOptions.querySelector("button")?.focus();
  }

  showNotice(message: string, duration = 2800): void {
    if (this.noticeTimer !== undefined) {
      window.clearTimeout(this.noticeTimer);
    }
    this.notice.textContent = message;
    this.notice.classList.remove("is-hidden");
    this.noticeTimer = window.setTimeout(() => {
      this.notice.classList.add("is-hidden");
      this.noticeTimer = undefined;
    }, duration);
  }

  showPause(
    resume: VoidCallback,
    restart: VoidCallback,
    exit: VoidCallback,
  ): void {
    this.pauseHandlers = { resume, restart, exit };
    this.pauseScreen.classList.remove("is-hidden");
    this.button("resume-game").focus();
  }

  hidePause(): void {
    this.pauseScreen.classList.add("is-hidden");
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
    this.interactionPrompt.classList.add("is-hidden");
    this.element("final-score").textContent = String(score);
    this.element("result-title").textContent = title;
    this.element("result-summary").textContent =
      score >= 90
        ? "小组清楚掌握了马大、马利亚和众人前往坟墓的经文次序。"
        : "分数只反映本次经文观察，不代表任何人的信心或属灵程度。";
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

    this.dialogueKind.textContent =
      line.kind === "scripture"
        ? "和合本原文"
        : line.kind === "narration"
          ? "经文叙述"
          : line.kind === "dramatization"
            ? "情境重现"
            : "小组提示";
    this.dialogueKind.className = `content-kind ${line.kind}`;
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

  private renderPortrait(portrait?: string): void {
    const portraits: Record<
      string,
      { readonly image: string; readonly position: string }
    > = {
      "martha-worried": {
        image: "assets/art/portrait-martha.png",
        position: "0% center",
      },
      "martha-grieving": {
        image: "assets/art/portrait-martha.png",
        position: "50% center",
      },
      "martha-faith": {
        image: "assets/art/portrait-martha.png",
        position: "100% center",
      },
      "mary-worried": {
        image: "assets/art/portrait-mary.png",
        position: "0% center",
      },
      "mary-urgent": {
        image: "assets/art/portrait-mary.png",
        position: "50% center",
      },
      "mary-grieving": {
        image: "assets/art/portrait-mary.png",
        position: "100% center",
      },
      "jesus-listening": {
        image: "assets/art/portrait-jesus.png",
        position: "0% center",
      },
      "jesus-declaration": {
        image: "assets/art/portrait-jesus.png",
        position: "50% center",
      },
      "jesus-weeping": {
        image: "assets/art/portrait-jesus.png",
        position: "100% center",
      },
      messenger: {
        image: "assets/art/portrait-witnesses.png",
        position: "0% center",
      },
      thomas: {
        image: "assets/art/portrait-witnesses.png",
        position: "50% center",
      },
      witness: {
        image: "assets/art/portrait-witnesses.png",
        position: "100% center",
      },
    };
    const selected = portrait ? portraits[portrait] : undefined;
    this.dialogue.classList.toggle("dialogue--without-portrait", !selected);
    this.dialoguePortrait.classList.toggle("is-hidden", !selected);
    if (!selected) {
      return;
    }
    this.dialoguePortrait.style.backgroundImage = `url("${selected.image}")`;
    this.dialoguePortrait.style.backgroundPosition = selected.position;
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
