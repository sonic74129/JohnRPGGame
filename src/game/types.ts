import type { PortraitKey } from "./CharacterAssets";
import type { ActorId as ScriptureActorId } from "./ScriptureContent";

export type ActorId = Exclude<ScriptureActorId, "player" | "lazarus">;

export type MusicState =
  | "exploration"
  | "dialogue"
  | "revelation"
  | "silence";

export interface DialogueLine {
  readonly speaker: string;
  readonly text: string;
  readonly reference?: string;
  readonly kind: "scripture";
  readonly portrait?: PortraitKey;
  readonly secondaryPortrait?: PortraitKey;
  readonly pauseMs?: number;
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
