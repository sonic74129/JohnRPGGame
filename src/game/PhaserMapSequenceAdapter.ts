import type {
  MapSequenceAdapters,
  MapSequenceInputSignal,
  MapSequenceInputSource,
  MapSequenceOperation,
  MapSequenceSchema,
} from "./MapSequence";

export type PhaserSequenceInputKind = "space" | "enter" | "pointer";

export interface PhaserSequenceInputState {
  readonly dialogueOpen: boolean;
  readonly choiceOpen: boolean;
  readonly sequenceRunning: boolean;
  readonly sequenceSkippable?: boolean;
  readonly uiPointer?: boolean;
}

export type PhaserSequenceInputRoute =
  | "advance-dialogue"
  | "choice"
  | "skip"
  | "gameplay"
  | "ui";

const UI_POINTER_SELECTOR = [
  "#hud",
  "#dialogue",
  "#choice-screen",
  "#start-screen",
  "#pause-screen",
  "#result-screen",
  "#technical-toast",
  "#verse-echo",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
].join(",");

export const isUiEventTarget = (target: unknown): boolean => {
  if (!target || typeof target !== "object") {
    return false;
  }
  const closest = Reflect.get(target, "closest");
  return (
    typeof closest === "function" &&
    Boolean(closest.call(target, UI_POINTER_SELECTOR))
  );
};

export const routePhaserSequenceInput = (
  kind: PhaserSequenceInputKind,
  state: PhaserSequenceInputState,
): PhaserSequenceInputRoute => {
  if (kind === "pointer" && state.uiPointer) {
    return "ui";
  }
  if (state.dialogueOpen) {
    return kind === "space" ? "advance-dialogue" : "ui";
  }
  if (state.choiceOpen) {
    return "choice";
  }
  if (state.sequenceRunning) {
    return state.sequenceSkippable === false ? "ui" : "skip";
  }
  return "gameplay";
};

export class PhaserMapSequenceInputSource implements MapSequenceInputSource {
  private readonly listeners = new Set<
    (signal: MapSequenceInputSignal) => void
  >();

  constructor(private readonly canEmit: () => boolean) {}

  subscribe(listener: (signal: MapSequenceInputSignal) => void): () => void {
    this.listeners.add(listener);
    let subscribed = true;
    return () => {
      if (!subscribed) {
        return;
      }
      subscribed = false;
      this.listeners.delete(listener);
    };
  }

  emit(signal: MapSequenceInputSignal): boolean {
    if (!this.canEmit() || this.listeners.size === 0) {
      return false;
    }
    for (const listener of this.listeners) {
      listener(signal);
    }
    return true;
  }
}

export interface PhaserSequenceHost<Schema extends MapSequenceSchema> {
  readonly inputSource: MapSequenceInputSource;
  moveActor(
    actor: Schema["actor"],
    point: Schema["point"],
    durationMs: number,
  ): MapSequenceOperation;
  setActorFacing(actor: Schema["actor"], facing: Schema["facing"]): void;
  setActorOrdinaryPose(
    actor: Schema["actor"],
    pose: Schema["ordinaryPose"],
  ): void;
  setActorSpecialPose(
    actor: Schema["actor"],
    pose: Schema["specialPose"],
  ): void;
  setActorVisible(actor: Schema["actor"], visible: boolean): void;
  stopCameraFollow(): void;
  panCamera(
    target: Schema["cameraTarget"],
    durationMs: number,
  ): MapSequenceOperation;
  followCamera(target: Schema["cameraTarget"]): void;
  wait(durationMs: number): MapSequenceOperation;
  transitionEnvironment(
    state: Schema["environment"],
    durationMs: number,
  ): MapSequenceOperation;
  showDialogue(dialogue: Schema["dialogue"]): MapSequenceOperation;
  showChoice(choice: Schema["choice"]): MapSequenceOperation;
  setMusic(state: Schema["music"], durationMs: number): MapSequenceOperation;
  applyFinalState(state: Schema["finalState"]): Promise<void> | void;
  handoff(value: Schema["handoff"]): Promise<void> | void;
  finalize(value: Schema["finalize"]): Promise<void> | void;
  acquireInputLock(): () => void;
}

export const createPhaserMapSequenceAdapters = <
  Schema extends MapSequenceSchema,
>(
  host: PhaserSequenceHost<Schema>,
): MapSequenceAdapters<Schema> => ({
  actor: {
    moveTo: (actor, point, durationMs) =>
      host.moveActor(actor, point, durationMs),
    setFacing: (actor, facing) => host.setActorFacing(actor, facing),
    setOrdinaryPose: (actor, pose) => host.setActorOrdinaryPose(actor, pose),
    setSpecialPose: (actor, pose) => host.setActorSpecialPose(actor, pose),
    setVisible: (actor, visible) => host.setActorVisible(actor, visible),
  },
  camera: {
    stopFollow: () => host.stopCameraFollow(),
    panTo: (target, durationMs) => host.panCamera(target, durationMs),
    follow: (target) => host.followCamera(target),
    hold: (durationMs) => host.wait(durationMs),
  },
  clock: {
    wait: (durationMs) => host.wait(durationMs),
  },
  environment: {
    transitionTo: (state, durationMs) =>
      host.transitionEnvironment(state, durationMs),
  },
  dialogue: {
    invokeDialogue: (dialogue) => host.showDialogue(dialogue),
    invokeChoice: (choice) => host.showChoice(choice),
  },
  music: {
    setState: (state, durationMs) => host.setMusic(state, durationMs),
  },
  lifecycle: {
    applyFinalState: (state) => host.applyFinalState(state),
    handoff: (value) => host.handoff(value),
    finalize: (value) => host.finalize(value),
  },
  acquireInputLock: () => host.acquireInputLock(),
  inputSource: host.inputSource,
});
