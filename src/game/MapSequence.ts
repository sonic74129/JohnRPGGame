export interface MapSequencePoint {
  readonly x: number;
  readonly y: number;
}

export interface MapSequenceSchema {
  readonly actor: string;
  readonly point: MapSequencePoint;
  readonly facing: unknown;
  readonly ordinaryPose: unknown;
  readonly specialPose: unknown;
  readonly cameraTarget: unknown;
  readonly environment: unknown;
  readonly dialogue: unknown;
  readonly choice: unknown;
  readonly music: unknown;
  readonly finalState: unknown;
  readonly handoff: unknown;
  readonly finalize: unknown;
}

export interface MapSequenceOperation {
  readonly finished: Promise<void>;
  cancel(reason: Error): Promise<void> | void;
}

export interface MapSequenceClock {
  wait(durationMs: number): MapSequenceOperation;
}

export type MapSequenceInputSignal =
  | {
      readonly kind: "key";
      readonly key: string;
    }
  | {
      readonly kind: "pointer";
    };

export interface MapSequenceInputSource {
  subscribe(
    listener: (signal: MapSequenceInputSignal) => void,
  ): () => void;
}

export interface MapSequenceActorAdapter<
  Schema extends MapSequenceSchema,
> {
  moveTo(
    actor: Schema["actor"],
    point: Schema["point"],
    durationMs: number,
  ): MapSequenceOperation;
  setFacing(actor: Schema["actor"], facing: Schema["facing"]): void;
  setOrdinaryPose(
    actor: Schema["actor"],
    pose: Schema["ordinaryPose"],
  ): void;
  setSpecialPose(
    actor: Schema["actor"],
    pose: Schema["specialPose"],
  ): void;
  setVisible(actor: Schema["actor"], visible: boolean): void;
}

export interface MapSequenceCameraAdapter<
  Schema extends MapSequenceSchema,
> {
  stopFollow(): void;
  panTo(
    target: Schema["cameraTarget"],
    durationMs: number,
  ): MapSequenceOperation;
  follow(target: Schema["cameraTarget"]): void;
  hold(durationMs: number): MapSequenceOperation;
}

export interface MapSequenceEnvironmentAdapter<
  Schema extends MapSequenceSchema,
> {
  transitionTo(
    state: Schema["environment"],
    durationMs: number,
  ): MapSequenceOperation;
}

export interface MapSequenceDialogueAdapter<
  Schema extends MapSequenceSchema,
> {
  invokeDialogue(dialogue: Schema["dialogue"]): MapSequenceOperation;
  invokeChoice(choice: Schema["choice"]): MapSequenceOperation;
}

export interface MapSequenceMusicAdapter<
  Schema extends MapSequenceSchema,
> {
  setState(
    state: Schema["music"],
    durationMs: number,
  ): MapSequenceOperation;
}

export interface MapSequenceLifecycleAdapter<
  Schema extends MapSequenceSchema,
> {
  applyFinalState(state: Schema["finalState"]): Promise<void> | void;
  handoff(value: Schema["handoff"]): Promise<void> | void;
  finalize(value: Schema["finalize"]): Promise<void> | void;
}

export interface MapSequenceAdapters<
  Schema extends MapSequenceSchema,
> {
  readonly actor: MapSequenceActorAdapter<Schema>;
  readonly camera: MapSequenceCameraAdapter<Schema>;
  readonly clock: MapSequenceClock;
  readonly environment: MapSequenceEnvironmentAdapter<Schema>;
  readonly dialogue: MapSequenceDialogueAdapter<Schema>;
  readonly music: MapSequenceMusicAdapter<Schema>;
  readonly lifecycle: MapSequenceLifecycleAdapter<Schema>;
  readonly acquireInputLock: () => () => void;
  readonly inputSource?: MapSequenceInputSource;
}

export interface MapSequencePathPoint<Point> {
  readonly point: Point;
  readonly durationMs: number;
}

export type MapSequenceStep<Schema extends MapSequenceSchema> =
  | {
      readonly kind: "move";
      readonly actor: Schema["actor"];
      readonly points: readonly MapSequencePathPoint<Schema["point"]>[];
    }
  | {
      readonly kind: "facing";
      readonly actor: Schema["actor"];
      readonly facing: Schema["facing"];
    }
  | {
      readonly kind: "ordinary-pose";
      readonly actor: Schema["actor"];
      readonly pose: Schema["ordinaryPose"];
    }
  | {
      readonly kind: "special-pose";
      readonly actor: Schema["actor"];
      readonly pose: Schema["specialPose"];
    }
  | {
      readonly kind: "visibility";
      readonly actor: Schema["actor"];
      readonly visible: boolean;
    }
  | {
      readonly kind: "camera-stop-follow";
    }
  | {
      readonly kind: "camera-pan";
      readonly target: Schema["cameraTarget"];
      readonly durationMs: number;
    }
  | {
      readonly kind: "camera-follow";
      readonly target: Schema["cameraTarget"];
    }
  | {
      readonly kind: "camera-hold";
      readonly durationMs: number;
    }
  | {
      readonly kind: "wait";
      readonly durationMs: number;
    }
  | {
      readonly kind: "environment";
      readonly state: Schema["environment"];
      readonly durationMs: number;
    }
  | {
      readonly kind: "dialogue";
      readonly dialogue: Schema["dialogue"];
    }
  | {
      readonly kind: "choice";
      readonly choice: Schema["choice"];
    }
  | {
      readonly kind: "music";
      readonly state: Schema["music"];
      readonly durationMs: number;
    }
  | {
      readonly kind: "parallel";
      readonly branches: readonly (readonly MapSequenceStep<Schema>[])[];
    };

export interface MapSequenceDefinition<
  Schema extends MapSequenceSchema,
> {
  readonly steps: readonly MapSequenceStep<Schema>[];
  readonly finalState: Schema["finalState"];
  readonly handoff: Schema["handoff"];
  readonly finalize: Schema["finalize"];
}

export interface MapSequenceResult {
  readonly status: "completed" | "skipped";
}

export type MapSequenceCancellationReason = "skip" | "dispose";

export class MapSequenceCancelledError extends Error {
  constructor(readonly reason: MapSequenceCancellationReason) {
    super(
      reason === "skip"
        ? "Map sequence was skipped."
        : "Map sequence was disposed.",
    );
    this.name = "MapSequenceCancelledError";
  }
}

export class MapSequenceReentrancyError extends Error {
  constructor() {
    super("A map sequence is already running.");
    this.name = "MapSequenceReentrancyError";
  }
}

export class MapSequenceDisposedError extends Error {
  constructor() {
    super("The map sequence engine has been disposed.");
    this.name = "MapSequenceDisposedError";
  }
}

export class MapSequenceDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapSequenceDefinitionError";
  }
}

export class MapSequenceAdapterError extends Error {
  constructor(cause: unknown) {
    super("A map sequence adapter threw a non-Error value.", { cause });
    this.name = "MapSequenceAdapterError";
  }
}

export const isMapSequenceSkipSignal = (
  signal: MapSequenceInputSignal,
): boolean =>
  signal.kind === "pointer" ||
  signal.key === "Enter" ||
  signal.key === " " ||
  signal.key === "Space" ||
  signal.key === "Spacebar";

export class SystemMapSequenceClock implements MapSequenceClock {
  wait(durationMs: number): MapSequenceOperation {
    assertDuration(durationMs, "wait");

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resolveFinished = (): void => {};
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
      timer = setTimeout(() => {
        settled = true;
        resolve();
      }, durationMs);
    });

    return {
      finished,
      cancel: () => {
        if (settled) {
          return;
        }
        settled = true;
        if (timer !== undefined) {
          clearTimeout(timer);
        }
        resolveFinished();
      },
    };
  }
}

interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

const createDeferred = (): Deferred => {
  let resolve = (): void => {};
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new MapSequenceAdapterError(value);

const assertDuration = (durationMs: number, step: string): void => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new MapSequenceDefinitionError(
      `${step} duration must be a finite non-negative number.`,
    );
  }
};

const assertNever = (value: never): never => {
  throw new MapSequenceDefinitionError(
    `Unsupported map sequence step: ${String(value)}`,
  );
};

class CancellationScope {
  private readonly activeOperations = new Set<MapSequenceOperation>();
  private readonly cancelledOperations = new Set<MapSequenceOperation>();
  private readonly cancellationTasks: Promise<void>[] = [];
  private readonly listeners = new Set<(reason: Error) => void>();
  private cancellationFailure: Error | undefined;
  private currentReason: Error | undefined;

  get reason(): Error | undefined {
    return this.currentReason;
  }

  get isCancelled(): boolean {
    return this.currentReason !== undefined;
  }

  throwIfCancelled(): void {
    if (this.currentReason) {
      throw this.currentReason;
    }
  }

  track(operation: MapSequenceOperation): () => void {
    this.activeOperations.add(operation);
    if (this.currentReason) {
      this.cancelOperation(operation, this.currentReason);
    }

    return () => {
      this.activeOperations.delete(operation);
    };
  }

  subscribe(listener: (reason: Error) => void): () => void {
    if (this.currentReason) {
      listener(this.currentReason);
      return () => {};
    }

    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  cancel(reason: Error): boolean {
    if (this.currentReason) {
      return false;
    }

    this.currentReason = reason;
    for (const operation of this.activeOperations) {
      this.cancelOperation(operation, reason);
    }
    for (const listener of this.listeners) {
      listener(reason);
    }
    this.listeners.clear();
    return true;
  }

  async settleCancellation(): Promise<void> {
    let settledCount = 0;
    while (settledCount < this.cancellationTasks.length) {
      const pending = this.cancellationTasks.slice(settledCount);
      settledCount = this.cancellationTasks.length;
      await Promise.all(pending);
    }
    if (this.cancellationFailure) {
      throw this.cancellationFailure;
    }
  }

  private cancelOperation(
    operation: MapSequenceOperation,
    reason: Error,
  ): void {
    if (this.cancelledOperations.has(operation)) {
      return;
    }

    this.cancelledOperations.add(operation);
    const task = Promise.resolve()
      .then(() => operation.cancel(reason))
      .catch((error: unknown) => {
        this.cancellationFailure ??= asError(error);
      });
    this.cancellationTasks.push(task);
  }
}

export class MapSequence<Schema extends MapSequenceSchema> {
  private activeScope: CancellationScope | undefined;
  private activeRunSettled: Promise<void> | undefined;
  private acceptingSkip = false;
  private disposed = false;
  private disposePromise: Promise<void> | undefined;
  private running = false;

  constructor(private readonly adapters: MapSequenceAdapters<Schema>) {}

  get isRunning(): boolean {
    return this.running;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  async run(
    definition: MapSequenceDefinition<Schema>,
  ): Promise<MapSequenceResult> {
    if (this.disposed) {
      throw new MapSequenceDisposedError();
    }
    if (this.running) {
      throw new MapSequenceReentrancyError();
    }
    validateSteps(definition.steps);

    this.running = true;
    this.acceptingSkip = true;
    const runSettled = createDeferred();
    const scope = new CancellationScope();
    this.activeRunSettled = runSettled.promise;
    this.activeScope = scope;

    let releaseInput: (() => void) | undefined;
    let unsubscribeInput: (() => void) | undefined;
    let result: MapSequenceResult | undefined;
    let runFailure: Error | undefined;

    try {
      releaseInput = this.adapters.acquireInputLock();
      unsubscribeInput = this.adapters.inputSource?.subscribe((signal) => {
        if (isMapSequenceSkipSignal(signal)) {
          this.requestSkip();
        }
      });
      result = await this.execute(definition, scope);
    } catch (error: unknown) {
      runFailure = asError(error);
    }

    const cleanupFailure = this.cleanupRun(
      unsubscribeInput,
      releaseInput,
      scope,
      runSettled,
    );

    if (runFailure && cleanupFailure) {
      throw new AggregateError(
        [runFailure, cleanupFailure],
        "Map sequence execution and cleanup both failed.",
      );
    }
    if (runFailure) {
      throw runFailure;
    }
    if (cleanupFailure) {
      throw cleanupFailure;
    }
    if (!result) {
      throw new MapSequenceDefinitionError(
        "Map sequence finished without a result.",
      );
    }
    return result;
  }

  requestSkip(): boolean {
    if (!this.acceptingSkip || !this.activeScope) {
      return false;
    }
    return this.activeScope.cancel(new MapSequenceCancelledError("skip"));
  }

  dispose(): Promise<void> {
    if (this.disposePromise) {
      return this.disposePromise;
    }

    this.disposed = true;
    this.acceptingSkip = false;
    this.activeScope?.cancel(new MapSequenceCancelledError("dispose"));
    this.disposePromise = this.activeRunSettled ?? Promise.resolve();
    return this.disposePromise;
  }

  private async execute(
    definition: MapSequenceDefinition<Schema>,
    scope: CancellationScope,
  ): Promise<MapSequenceResult> {
    let status: MapSequenceResult["status"] = "completed";

    try {
      await this.executeSteps(definition.steps, scope);
      scope.throwIfCancelled();
    } catch (error: unknown) {
      const failure = asError(error);
      scope.cancel(failure);

      let cancellationFailure: Error | undefined;
      try {
        await scope.settleCancellation();
      } catch (cancellationError: unknown) {
        cancellationFailure = asError(cancellationError);
      }
      if (cancellationFailure) {
        throw new AggregateError(
          [failure, cancellationFailure],
          "Map sequence execution and cancellation both failed.",
        );
      }

      if (
        failure === scope.reason &&
        failure instanceof MapSequenceCancelledError &&
        failure.reason === "skip"
      ) {
        status = "skipped";
      } else {
        throw failure;
      }
    }

    this.acceptingSkip = false;
    await this.adapters.lifecycle.applyFinalState(definition.finalState);
    await this.adapters.lifecycle.handoff(definition.handoff);
    await this.adapters.lifecycle.finalize(definition.finalize);
    return { status };
  }

  private async executeSteps(
    steps: readonly MapSequenceStep<Schema>[],
    scope: CancellationScope,
  ): Promise<void> {
    for (const step of steps) {
      scope.throwIfCancelled();
      await this.executeStep(step, scope);
    }
  }

  private async executeStep(
    step: MapSequenceStep<Schema>,
    scope: CancellationScope,
  ): Promise<void> {
    switch (step.kind) {
      case "move":
        for (const pathPoint of step.points) {
          scope.throwIfCancelled();
          await this.runOperation(
            this.adapters.actor.moveTo(
              step.actor,
              pathPoint.point,
              pathPoint.durationMs,
            ),
            scope,
          );
        }
        return;
      case "facing":
        this.adapters.actor.setFacing(step.actor, step.facing);
        return;
      case "ordinary-pose":
        this.adapters.actor.setOrdinaryPose(step.actor, step.pose);
        return;
      case "special-pose":
        this.adapters.actor.setSpecialPose(step.actor, step.pose);
        return;
      case "visibility":
        this.adapters.actor.setVisible(step.actor, step.visible);
        return;
      case "camera-stop-follow":
        this.adapters.camera.stopFollow();
        return;
      case "camera-pan":
        await this.runOperation(
          this.adapters.camera.panTo(step.target, step.durationMs),
          scope,
        );
        return;
      case "camera-follow":
        this.adapters.camera.follow(step.target);
        return;
      case "camera-hold":
        await this.runOperation(
          this.adapters.camera.hold(step.durationMs),
          scope,
        );
        return;
      case "wait":
        await this.runOperation(
          this.adapters.clock.wait(step.durationMs),
          scope,
        );
        return;
      case "environment":
        await this.runOperation(
          this.adapters.environment.transitionTo(
            step.state,
            step.durationMs,
          ),
          scope,
        );
        return;
      case "dialogue":
        await this.runOperation(
          this.adapters.dialogue.invokeDialogue(step.dialogue),
          scope,
        );
        return;
      case "choice":
        await this.runOperation(
          this.adapters.dialogue.invokeChoice(step.choice),
          scope,
        );
        return;
      case "music":
        await this.runOperation(
          this.adapters.music.setState(step.state, step.durationMs),
          scope,
        );
        return;
      case "parallel":
        await this.executeParallel(step.branches, scope);
        return;
      default:
        return assertNever(step);
    }
  }

  private async executeParallel(
    branches: readonly (readonly MapSequenceStep<Schema>[])[],
    scope: CancellationScope,
  ): Promise<void> {
    let firstFailure: Error | undefined;
    await Promise.all(
      branches.map(async (branch) => {
        try {
          await this.executeSteps(branch, scope);
        } catch (error: unknown) {
          const failure = asError(error);
          if (!firstFailure) {
            firstFailure = failure;
            scope.cancel(failure);
          }
        }
      }),
    );
    if (firstFailure) {
      throw firstFailure;
    }
  }

  private async runOperation(
    operation: MapSequenceOperation,
    scope: CancellationScope,
  ): Promise<void> {
    scope.throwIfCancelled();
    const untrack = scope.track(operation);
    let unsubscribeCancellation = (): void => {};
    const cancellation = new Promise<never>((_resolve, reject) => {
      unsubscribeCancellation = scope.subscribe(reject);
    });

    try {
      await Promise.race([operation.finished, cancellation]);
    } catch (error: unknown) {
      throw asError(error);
    } finally {
      unsubscribeCancellation();
      untrack();
    }
  }

  private cleanupRun(
    unsubscribeInput: (() => void) | undefined,
    releaseInput: (() => void) | undefined,
    scope: CancellationScope,
    runSettled: Deferred,
  ): Error | undefined {
    const failures: Error[] = [];
    try {
      unsubscribeInput?.();
    } catch (error: unknown) {
      failures.push(asError(error));
    }
    try {
      releaseInput?.();
    } catch (error: unknown) {
      failures.push(asError(error));
    }

    if (this.activeScope === scope) {
      this.activeScope = undefined;
    }
    if (this.activeRunSettled === runSettled.promise) {
      this.activeRunSettled = undefined;
    }
    this.acceptingSkip = false;
    this.running = false;
    runSettled.resolve();

    if (failures.length === 0) {
      return undefined;
    }
    if (failures.length === 1) {
      return failures[0];
    }
    return new AggregateError(failures, "Map sequence cleanup failed.");
  }
}

const validateSteps = <Schema extends MapSequenceSchema>(
  steps: readonly MapSequenceStep<Schema>[],
): void => {
  for (const step of steps) {
    switch (step.kind) {
      case "move":
        for (const point of step.points) {
          assertDuration(point.durationMs, "move");
        }
        break;
      case "camera-pan":
        assertDuration(step.durationMs, "camera pan");
        break;
      case "camera-hold":
        assertDuration(step.durationMs, "camera hold");
        break;
      case "wait":
        assertDuration(step.durationMs, "wait");
        break;
      case "environment":
        assertDuration(step.durationMs, "environment transition");
        break;
      case "music":
        assertDuration(step.durationMs, "music transition");
        break;
      case "parallel":
        for (const branch of step.branches) {
          validateSteps(branch);
        }
        break;
      case "facing":
      case "ordinary-pose":
      case "special-pose":
      case "visibility":
      case "camera-stop-follow":
      case "camera-follow":
      case "dialogue":
      case "choice":
        break;
      default:
        assertNever(step);
    }
  }
};
