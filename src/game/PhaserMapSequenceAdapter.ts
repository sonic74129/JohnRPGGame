import type {
  MapSequenceAdapters,
  MapSequenceOperation,
  MapSequenceSchema,
} from "./MapSequence";

export interface PhaserSequenceHost<Schema extends MapSequenceSchema> {
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
});
