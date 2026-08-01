import type {
  ActorId,
  InteractionResult,
  QuestionResult,
  StoryStage,
} from "./types";

interface Decision {
  readonly expected: ActorId;
  readonly wrongCandidates: readonly ActorId[];
  readonly correctMessage: string;
  readonly reference: string;
  readonly nextStage: StoryStage;
}

const DECISIONS: Partial<Record<StoryStage, Decision>> = {
  chooseMartha: {
    expected: "martha",
    wrongCandidates: ["mary"],
    correctMessage: "正确。马大听见耶稣来了，就出去迎接他。",
    reference: "约翰福音 11:20",
    nextStage: "followMartha",
  },
  chooseMary: {
    expected: "mary",
    wrongCandidates: ["martha"],
    correctMessage: "正确。马利亚听见了，就急忙起来，到耶稣那里去。",
    reference: "约翰福音 11:28–29",
    nextStage: "followMary",
  },
  chooseGuide: {
    expected: "guide",
    wrongCandidates: ["martha", "mary", "jesus"],
    correctMessage: "正确。众人回答“请主来看”，随后来到坟墓前。",
    reference: "约翰福音 11:34、38",
    nextStage: "followGuide",
  },
};

const WRONG_MESSAGES: Partial<Record<ActorId, string>> = {
  martha: "这一阶段不是马大先行动。请再查看当前经文线索。",
  mary: "马利亚此时仍然坐在家里。请留意谁先出去迎接耶稣。",
  jesus: "玩家不能控制耶稣；请寻找经文中负责带路的人。",
};

export class StoryEngine {
  private currentStage: StoryStage = "opening";
  private currentScore = 100;
  private readonly penalizedAttempts = new Set<string>();
  private wrongCountForStage = 0;

  get stage(): StoryStage {
    return this.currentStage;
  }

  get score(): number {
    return this.currentScore;
  }

  answerQuestion(
    questionId: string,
    answerId: string,
    correctAnswerId: string,
  ): QuestionResult {
    if (answerId === correctAnswerId) {
      return {
        correct: true,
        penalty: 0,
        message: "正确。经文依据已经确认。",
      };
    }

    const attemptKey = `question:${questionId}:${answerId}`;
    const alreadyPenalized = this.penalizedAttempts.has(attemptKey);
    const penalty = alreadyPenalized ? 0 : 5;
    if (!alreadyPenalized) {
      this.penalizedAttempts.add(attemptKey);
      this.currentScore = Math.max(0, this.currentScore - penalty);
    }

    return {
      correct: false,
      penalty,
      message:
        penalty > 0
          ? "这不是经文记载的答案。经文观察分 -5，请根据出处再试一次。"
          : "这个答案已经尝试过，请根据经文出处再试一次。",
    };
  }

  completeOpening(): void {
    this.requireStage("opening");
    this.setStage("deliverMessage");
  }

  deliverMessage(): void {
    this.requireStage("deliverMessage");
    this.setStage("journey");
  }

  arriveAtBethany(): void {
    this.requireStage("journey");
    this.setStage("chooseMartha");
  }

  interact(actor: ActorId): InteractionResult {
    const decision = DECISIONS[this.currentStage];

    if (!decision) {
      return {
        kind: "unavailable",
        message: "这里没有需要作答的人物，请按照当前经文线索继续。",
        penalty: 0,
        revealHint: false,
        nextStage: this.currentStage,
      };
    }

    if (actor === decision.expected) {
      const nextStage = decision.nextStage;
      this.setStage(nextStage);
      return {
        kind: "correct",
        message: decision.correctMessage,
        reference: decision.reference,
        penalty: 0,
        revealHint: false,
        nextStage,
      };
    }

    if (!decision.wrongCandidates.includes(actor)) {
      return {
        kind: "neutral",
        message: this.neutralMessage(actor),
        penalty: 0,
        revealHint: false,
        nextStage: this.currentStage,
      };
    }

    const attemptKey = `${this.currentStage}:${actor}`;
    const alreadyPenalized = this.penalizedAttempts.has(attemptKey);
    const penalty = alreadyPenalized ? 0 : 5;
    this.wrongCountForStage += 1;

    if (!alreadyPenalized) {
      this.penalizedAttempts.add(attemptKey);
      this.currentScore = Math.max(0, this.currentScore - penalty);
    }

    return {
      kind: "wrong",
      message:
        WRONG_MESSAGES[actor] ??
        "这不是经文记载的下一位人物，请再查看经文线索。",
      reference: decision.reference,
      penalty,
      revealHint: this.wrongCountForStage >= 2,
      nextStage: this.currentStage,
    };
  }

  arriveAtMartha(): void {
    this.requireStage("followMartha");
    this.setStage("marthaDialogue");
  }

  completeMarthaDialogue(): void {
    this.requireStage("marthaDialogue");
    this.setStage("chooseMary");
  }

  arriveAtMary(): void {
    this.requireStage("followMary");
    this.setStage("maryDialogue");
  }

  completeMaryDialogue(): void {
    this.requireStage("maryDialogue");
    this.setStage("chooseGuide");
  }

  arriveAtTomb(): void {
    this.requireStage("followGuide");
    this.setStage("tomb");
  }

  completeTomb(): void {
    this.requireStage("tomb");
    this.setStage("epilogue");
  }

  completeEpilogue(): void {
    this.requireStage("epilogue");
    this.setStage("complete");
  }

  resultLabel(): string {
    if (this.currentScore >= 90) {
      return "经文脉络清楚";
    }
    if (this.currentScore >= 70) {
      return "已掌握主要事件顺序";
    }
    if (this.currentScore >= 50) {
      return "建议一起回看关键经节";
    }
    return "让我们从经文重新整理事件";
  }

  private neutralMessage(actor: ActorId): string {
    if (actor === "mourner" || actor === "guide") {
      return "好些犹太人来安慰马大和马利亚。与他们交谈属于探索，不扣分。";
    }
    return "可以观察这位人物，但当前经文线索指向另一位先行动的人。";
  }

  private setStage(stage: StoryStage): void {
    this.currentStage = stage;
    this.wrongCountForStage = 0;
  }

  private requireStage(expected: StoryStage): void {
    if (this.currentStage !== expected) {
      throw new Error(
        `Cannot advance story from ${this.currentStage}; expected ${expected}.`,
      );
    }
  }
}
