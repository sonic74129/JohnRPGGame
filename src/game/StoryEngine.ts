import {
  FIND_JESUS_CONTRACT,
  FIND_JESUS_MEMORIES,
  RECALL_QUESTIONS,
  type ActorId,
  type MemoryCarrierId,
  type RecallQuestionId,
} from "./ScriptureContent";
import {
  VERSE_BEATS,
  VERSE_BEAT_BY_ID,
  type VerseBeat,
  type VerseBeatId,
} from "./VerseBeats";

export interface RecallAnswerResult {
  readonly correct: boolean;
  readonly penalty: number;
  readonly message: string;
}

export type FindJesusResult =
  | {
      readonly kind: "memory";
      readonly memory: (typeof FIND_JESUS_MEMORIES)[keyof typeof FIND_JESUS_MEMORIES];
      readonly penalty: 0;
    }
  | {
      readonly kind: "identified";
      readonly actorId: "jesus";
      readonly penalty: 0;
    };

const MEMORY_BY_CARRIER: Readonly<
  Record<MemoryCarrierId, (typeof FIND_JESUS_MEMORIES)[keyof typeof FIND_JESUS_MEMORIES]>
> = Object.fromEntries(
  Object.values(FIND_JESUS_MEMORIES).map((memory) => [
    memory.carrierId,
    memory,
  ]),
) as Record<
  MemoryCarrierId,
  (typeof FIND_JESUS_MEMORIES)[keyof typeof FIND_JESUS_MEMORIES]
>;

export class StoryEngine {
  private currentBeatIndex = 0;
  private currentScore = 100;
  private readonly completed = new Set<VerseBeatId>();
  private readonly penalizedAnswers = new Set<string>();

  get beat(): VerseBeat {
    const beat = VERSE_BEATS[this.currentBeatIndex];
    if (!beat) {
      throw new Error("Story has no active verse beat.");
    }
    return beat;
  }

  get beatId(): VerseBeatId {
    return this.beat.id;
  }

  get score(): number {
    return this.currentScore;
  }

  get isComplete(): boolean {
    return this.completed.has("responses");
  }

  get completedBeatIds(): readonly VerseBeatId[] {
    return VERSE_BEATS.filter((beat) => this.completed.has(beat.id)).map(
      (beat) => beat.id,
    );
  }

  hasCompleted(beatId: VerseBeatId): boolean {
    return this.completed.has(beatId);
  }

  canTrigger(actorId?: ActorId): boolean {
    const actorIds = this.beat.trigger.actorIds;
    return actorIds === undefined || actorId === undefined
      ? actorIds === undefined
      : actorIds.includes(actorId);
  }

  answerRecall(questionId: RecallQuestionId, optionId: string): RecallAnswerResult {
    const question = RECALL_QUESTIONS[questionId];
    if (optionId === question.correctOption) {
      return { correct: true, penalty: 0, message: "经文依据已经确认。" };
    }

    const attemptKey = `${questionId}:${optionId}`;
    const firstAttempt = !this.penalizedAnswers.has(attemptKey);
    if (firstAttempt) {
      this.penalizedAnswers.add(attemptKey);
      this.currentScore = Math.max(
        0,
        this.currentScore - question.wrongAnswer.penalty,
      );
    }
    return {
      correct: false,
      penalty: firstAttempt ? question.wrongAnswer.penalty : 0,
      message: `请再查看${question.reference}。`,
    };
  }

  identifyJesus(actorId: ActorId): FindJesusResult {
    if (this.beatId !== "find-jesus") {
      throw new Error("Jesus identification is only available during find-jesus.");
    }
    if (actorId === FIND_JESUS_CONTRACT.correctActorId) {
      return { kind: "identified", actorId: "jesus", penalty: 0 };
    }
    const memory = MEMORY_BY_CARRIER[actorId as MemoryCarrierId];
    if (!memory) {
      throw new Error(`Actor ${actorId} is not part of the findJesus bridge.`);
    }
    return { kind: "memory", memory, penalty: 0 };
  }

  completeCurrent(expectedBeatId: VerseBeatId): VerseBeat {
    if (this.beatId !== expectedBeatId) {
      throw new Error(
        `Cannot complete ${expectedBeatId}; active beat is ${this.beatId}.`,
      );
    }
    const beat = this.beat;
    this.completed.add(beat.id);
    if (beat.handoff.nextBeatId) {
      const nextIndex = VERSE_BEATS.findIndex(
        (candidate) => candidate.id === beat.handoff.nextBeatId,
      );
      if (nextIndex < 0) {
        throw new Error(`Missing next verse beat ${beat.handoff.nextBeatId}.`);
      }
      this.currentBeatIndex = nextIndex;
    }
    return beat;
  }

  finalStateFor(beatId: VerseBeatId): VerseBeat["finalState"] {
    return VERSE_BEAT_BY_ID[beatId].finalState;
  }

  resultLabel(): string {
    return this.currentScore >= 90
      ? "经文脉络清楚"
      : this.currentScore >= 70
        ? "已掌握主要事件顺序"
        : "请按经文次序回看";
  }
}
