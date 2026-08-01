export type ActorId = "martha" | "mary" | "jesus" | "mourner" | "guide";

export type StoryStage =
  | "opening"
  | "deliverMessage"
  | "journey"
  | "chooseMartha"
  | "followMartha"
  | "marthaDialogue"
  | "chooseMary"
  | "followMary"
  | "maryDialogue"
  | "chooseGuide"
  | "followGuide"
  | "tomb"
  | "epilogue"
  | "complete";

export type ContentKind =
  | "scripture"
  | "narration"
  | "dramatization"
  | "instruction";

export type MusicState =
  | "exploration"
  | "dialogue"
  | "revelation"
  | "silence";

export interface DialogueLine {
  readonly speaker: string;
  readonly text: string;
  readonly reference?: string;
  readonly kind: ContentKind;
  readonly portrait?: string;
  readonly pauseMs?: number;
  readonly music?: MusicState;
}

export interface InteractionResult {
  readonly kind: "correct" | "wrong" | "neutral" | "unavailable";
  readonly message: string;
  readonly reference?: string;
  readonly penalty: number;
  readonly revealHint: boolean;
  readonly nextStage: StoryStage;
}

export interface Objective {
  readonly text: string;
  readonly reference: string;
}

export interface ChoiceOption {
  readonly id: string;
  readonly text: string;
}

export interface ChoiceQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly reference: string;
  readonly correctOption: string;
  readonly options: readonly ChoiceOption[];
}

export interface QuestionResult {
  readonly correct: boolean;
  readonly penalty: number;
  readonly message: string;
}
