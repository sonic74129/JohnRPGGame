import { describe, expect, it } from "vitest";

import {
  MapSequence,
  MapSequenceCancelledError,
  MapSequenceDisposedError,
  MapSequenceReentrancyError,
  isMapSequenceSkipSignal,
  type MapSequenceAdapters,
  type MapSequenceClock,
  type MapSequenceDefinition,
  type MapSequenceInputSignal,
  type MapSequenceInputSource,
  type MapSequenceOperation,
  type MapSequencePoint,
  type MapSequenceSchema,
  type MapSequenceStep,
} from "../src/game/MapSequence";

type TestActor = "actor-a" | "actor-b";

interface TestSchema extends MapSequenceSchema {
  readonly actor: TestActor;
  readonly point: MapSequencePoint;
  readonly facing: "left" | "right";
  readonly ordinaryPose: "idle" | "walk";
  readonly specialPose: "signal";
  readonly cameraTarget: "actor-a" | "group";
  readonly environment: "day" | "night";
  readonly dialogue: "line-a" | "line-b";
  readonly choice: "question-a";
  readonly music: "quiet" | "active";
  readonly finalState: {
    readonly id: string;
  };
  readonly handoff: "restore-control";
  readonly finalize: "advance-state";
}

interface ScheduledTask {
  readonly id: number;
  readonly dueAt: number;
  readonly label: string;
  readonly onComplete: () => void;
  readonly resolve: () => void;
  settled: boolean;
}

class FakeScheduler implements MapSequenceClock {
  private readonly tasks = new Set<ScheduledTask>();
  private nextId = 1;
  private now = 0;

  constructor(private readonly events: string[]) {}

  get pendingCount(): number {
    return this.tasks.size;
  }

  wait(durationMs: number): MapSequenceOperation {
    return this.operation(`wait:${durationMs}`, durationMs);
  }

  operation(
    label: string,
    durationMs: number,
    onComplete: () => void = () => {},
  ): MapSequenceOperation {
    let resolveFinished = (): void => {};
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const task: ScheduledTask = {
      id: this.nextId,
      dueAt: this.now + durationMs,
      label,
      onComplete,
      resolve: resolveFinished,
      settled: false,
    };
    this.nextId += 1;
    this.tasks.add(task);
    this.events.push(`start:${label}`);

    return {
      finished,
      cancel: () => {
        if (task.settled) {
          return;
        }
        task.settled = true;
        this.tasks.delete(task);
        this.events.push(`cancel:${label}`);
        task.resolve();
      },
    };
  }

  advanceBy(durationMs: number): void {
    const target = this.now + durationMs;
    while (true) {
      const task = this.nextTask();
      if (!task || task.dueAt > target) {
        break;
      }
      this.now = task.dueAt;
      this.finish(task);
    }
    this.now = target;
  }

  advanceNext(): void {
    const task = this.nextTask();
    if (!task) {
      throw new Error("No fake operation is pending.");
    }
    this.advanceBy(task.dueAt - this.now);
  }

  private nextTask(): ScheduledTask | undefined {
    return [...this.tasks].sort(
      (left, right) => left.dueAt - right.dueAt || left.id - right.id,
    )[0];
  }

  private finish(task: ScheduledTask): void {
    if (task.settled) {
      return;
    }
    task.settled = true;
    this.tasks.delete(task);
    this.events.push(`finish:${task.label}`);
    task.onComplete();
    task.resolve();
  }
}

class FakeInputSource implements MapSequenceInputSource {
  private listener:
    | ((signal: MapSequenceInputSignal) => void)
    | undefined;
  subscribeCount = 0;
  unsubscribeCount = 0;

  subscribe(
    listener: (signal: MapSequenceInputSignal) => void,
  ): () => void {
    this.subscribeCount += 1;
    this.listener = listener;
    let subscribed = true;
    return () => {
      if (!subscribed) {
        return;
      }
      subscribed = false;
      this.unsubscribeCount += 1;
      if (this.listener === listener) {
        this.listener = undefined;
      }
    };
  }

  emit(signal: MapSequenceInputSignal): void {
    this.listener?.(signal);
  }
}

interface Harness {
  readonly engine: MapSequence<TestSchema>;
  readonly events: string[];
  readonly scheduler: FakeScheduler;
  readonly input: FakeInputSource;
  readonly finalStates: TestSchema["finalState"][];
  readonly handoffs: TestSchema["handoff"][];
  readonly finalizations: TestSchema["finalize"][];
  readonly lockState: {
    acquired: number;
    released: number;
  };
  failFacingWith(error: Error | undefined): void;
}

const createHarness = (): Harness => {
  const events: string[] = [];
  const scheduler = new FakeScheduler(events);
  const input = new FakeInputSource();
  const finalStates: TestSchema["finalState"][] = [];
  const handoffs: TestSchema["handoff"][] = [];
  const finalizations: TestSchema["finalize"][] = [];
  const lockState = { acquired: 0, released: 0 };
  let facingFailure: Error | undefined;

  const adapters: MapSequenceAdapters<TestSchema> = {
    acquireInputLock: () => {
      lockState.acquired += 1;
      events.push("lock");
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        lockState.released += 1;
        events.push("unlock");
      };
    },
    inputSource: input,
    actor: {
      moveTo: (actor, point, durationMs) =>
        scheduler.operation(
          `move:${actor}:${point.x},${point.y}`,
          durationMs,
        ),
      setFacing: (actor, facing) => {
        if (facingFailure) {
          throw facingFailure;
        }
        events.push(`facing:${actor}:${facing}`);
      },
      setOrdinaryPose: (actor, pose) => {
        events.push(`ordinary:${actor}:${pose}`);
      },
      setSpecialPose: (actor, pose) => {
        events.push(`special:${actor}:${pose}`);
      },
      setVisible: (actor, visible) => {
        events.push(`visible:${actor}:${visible}`);
      },
    },
    camera: {
      stopFollow: () => {
        events.push("camera:stop");
      },
      panTo: (target, durationMs) =>
        scheduler.operation(`camera:pan:${target}`, durationMs),
      follow: (target) => {
        events.push(`camera:follow:${target}`);
      },
      hold: (durationMs) =>
        scheduler.operation(`camera:hold:${durationMs}`, durationMs),
    },
    environment: {
      transitionTo: (state, durationMs) =>
        scheduler.operation(`environment:${state}`, durationMs),
    },
    dialogue: {
      invokeDialogue: (dialogue) =>
        scheduler.operation(`dialogue:${dialogue}`, 20),
      invokeChoice: (choice) =>
        scheduler.operation(`choice:${choice}`, 20),
    },
    music: {
      setState: (state, durationMs) =>
        scheduler.operation(`music:${state}`, durationMs),
    },
    clock: scheduler,
    lifecycle: {
      applyFinalState: (state) => {
        finalStates.push(state);
        events.push(`final-state:${state.id}`);
      },
      handoff: (value) => {
        handoffs.push(value);
        events.push(`handoff:${value}`);
      },
      finalize: (value) => {
        finalizations.push(value);
        events.push(`finalize:${value}`);
      },
    },
  };

  return {
    engine: new MapSequence(adapters),
    events,
    scheduler,
    input,
    finalStates,
    handoffs,
    finalizations,
    lockState,
    failFacingWith: (error) => {
      facingFailure = error;
    },
  };
};

const definition = (
  steps: readonly MapSequenceStep<TestSchema>[],
  id = "settled",
): MapSequenceDefinition<TestSchema> => ({
  steps,
  finalState: { id },
  handoff: "restore-control",
  finalize: "advance-state",
});

const flushMicrotasks = async (): Promise<void> => {
  for (let pass = 0; pass < 8; pass += 1) {
    await Promise.resolve();
  }
};

const drainRun = async (
  harness: Harness,
  run: Promise<unknown>,
): Promise<void> => {
  for (let pass = 0; pass < 100 && harness.engine.isRunning; pass += 1) {
    await flushMicrotasks();
    if (harness.scheduler.pendingCount > 0) {
      harness.scheduler.advanceNext();
    }
  }
  await run;
};

describe("MapSequence", () => {
  it("recognizes only Space, Enter, and pointer skip signals", () => {
    expect(isMapSequenceSkipSignal({ kind: "key", key: "Enter" })).toBe(
      true,
    );
    expect(isMapSequenceSkipSignal({ kind: "key", key: " " })).toBe(true);
    expect(isMapSequenceSkipSignal({ kind: "key", key: "Space" })).toBe(
      true,
    );
    expect(isMapSequenceSkipSignal({ kind: "pointer" })).toBe(true);
    expect(isMapSequenceSkipSignal({ kind: "key", key: "Escape" })).toBe(
      false,
    );
  });

  it("runs every step capability in declared order", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        { kind: "visibility", actor: "actor-a", visible: true },
        {
          kind: "move",
          actor: "actor-a",
          points: [
            { point: { x: 1, y: 2 }, durationMs: 10 },
            { point: { x: 3, y: 4 }, durationMs: 10 },
          ],
        },
        { kind: "facing", actor: "actor-a", facing: "right" },
        { kind: "ordinary-pose", actor: "actor-a", pose: "walk" },
        { kind: "special-pose", actor: "actor-a", pose: "signal" },
        { kind: "camera-stop-follow" },
        { kind: "camera-pan", target: "group", durationMs: 5 },
        { kind: "camera-follow", target: "actor-a" },
        { kind: "camera-hold", durationMs: 5 },
        { kind: "wait", durationMs: 5 },
        { kind: "environment", state: "night", durationMs: 5 },
        { kind: "music", state: "quiet", durationMs: 5 },
        { kind: "dialogue", dialogue: "line-a" },
        { kind: "choice", choice: "question-a" },
      ]),
    );

    await drainRun(harness, run);

    expect(await run).toEqual({ status: "completed" });
    expect(harness.events).toEqual([
      "lock",
      "visible:actor-a:true",
      "start:move:actor-a:1,2",
      "finish:move:actor-a:1,2",
      "start:move:actor-a:3,4",
      "finish:move:actor-a:3,4",
      "facing:actor-a:right",
      "ordinary:actor-a:walk",
      "special:actor-a:signal",
      "camera:stop",
      "start:camera:pan:group",
      "finish:camera:pan:group",
      "camera:follow:actor-a",
      "start:camera:hold:5",
      "finish:camera:hold:5",
      "start:wait:5",
      "finish:wait:5",
      "start:environment:night",
      "finish:environment:night",
      "start:music:quiet",
      "finish:music:quiet",
      "start:dialogue:line-a",
      "finish:dialogue:line-a",
      "start:choice:question-a",
      "finish:choice:question-a",
      "final-state:settled",
      "handoff:restore-control",
      "finalize:advance-state",
      "unlock",
    ]);
  });

  it("runs parallel branches concurrently and settles all branches", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        {
          kind: "parallel",
          branches: [
            [
              { kind: "wait", durationMs: 10 },
              { kind: "facing", actor: "actor-a", facing: "left" },
            ],
            [
              { kind: "wait", durationMs: 5 },
              { kind: "visibility", actor: "actor-b", visible: false },
            ],
          ],
        },
      ]),
    );

    expect(harness.scheduler.pendingCount).toBe(2);
    harness.scheduler.advanceBy(5);
    await flushMicrotasks();
    expect(harness.events).toContain("visible:actor-b:false");
    expect(harness.events).not.toContain("facing:actor-a:left");

    harness.scheduler.advanceBy(5);
    await run;

    expect(harness.events).toContain("facing:actor-a:left");
    expect(harness.scheduler.pendingCount).toBe(0);
  });

  it("applies the same lifecycle state after completion and skip", async () => {
    const completed = createHarness();
    const completedRun = completed.engine.run(
      definition([{ kind: "wait", durationMs: 10 }], "shared-final"),
    );
    await drainRun(completed, completedRun);

    const skipped = createHarness();
    const skippedRun = skipped.engine.run(
      definition([{ kind: "wait", durationMs: 10 }], "shared-final"),
    );
    skipped.input.emit({ kind: "pointer" });
    await skippedRun;

    expect(await completedRun).toEqual({ status: "completed" });
    expect(await skippedRun).toEqual({ status: "skipped" });
    expect(skipped.finalStates).toEqual(completed.finalStates);
    expect(skipped.handoffs).toEqual(completed.handoffs);
    expect(skipped.finalizations).toEqual(completed.finalizations);
  });

  it("cancels movement on Space without starting later callbacks", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        {
          kind: "move",
          actor: "actor-a",
          points: [{ point: { x: 8, y: 9 }, durationMs: 100 }],
        },
        { kind: "dialogue", dialogue: "line-b" },
      ]),
    );

    harness.input.emit({ kind: "key", key: " " });
    await expect(run).resolves.toEqual({ status: "skipped" });
    harness.scheduler.advanceBy(1_000);
    await flushMicrotasks();

    expect(harness.events).toContain("cancel:move:actor-a:8,9");
    expect(harness.events).not.toContain("start:dialogue:line-b");
    expect(harness.scheduler.pendingCount).toBe(0);
  });

  it("cancels a wait on Enter and ignores repeated skip requests", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        { kind: "wait", durationMs: 100 },
        { kind: "facing", actor: "actor-a", facing: "left" },
      ]),
    );

    harness.input.emit({ kind: "key", key: "Enter" });
    expect(harness.engine.requestSkip()).toBe(false);
    await expect(run).resolves.toEqual({ status: "skipped" });

    expect(
      harness.events.filter((event) => event === "cancel:wait:100"),
    ).toHaveLength(1);
    expect(harness.events).not.toContain("facing:actor-a:left");
    expect(harness.finalStates).toHaveLength(1);
    expect(harness.handoffs).toHaveLength(1);
    expect(harness.finalizations).toHaveLength(1);
  });

  it("cancels an open dialogue on pointer input", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        { kind: "dialogue", dialogue: "line-a" },
        { kind: "choice", choice: "question-a" },
      ]),
    );

    harness.input.emit({ kind: "pointer" });
    await expect(run).resolves.toEqual({ status: "skipped" });

    expect(harness.events).toContain("cancel:dialogue:line-a");
    expect(harness.events).not.toContain("start:choice:question-a");
  });

  it("cancels every active parallel branch without post-skip work", async () => {
    const harness = createHarness();
    const run = harness.engine.run(
      definition([
        {
          kind: "parallel",
          branches: [
            [
              {
                kind: "move",
                actor: "actor-a",
                points: [
                  { point: { x: 10, y: 10 }, durationMs: 100 },
                ],
              },
              { kind: "facing", actor: "actor-a", facing: "right" },
            ],
            [
              { kind: "wait", durationMs: 100 },
              { kind: "visibility", actor: "actor-b", visible: false },
            ],
          ],
        },
        { kind: "dialogue", dialogue: "line-b" },
      ]),
    );

    expect(harness.engine.requestSkip()).toBe(true);
    expect(harness.engine.requestSkip()).toBe(false);
    await expect(run).resolves.toEqual({ status: "skipped" });
    harness.scheduler.advanceBy(1_000);
    await flushMicrotasks();

    expect(harness.events).toContain("cancel:move:actor-a:10,10");
    expect(harness.events).toContain("cancel:wait:100");
    expect(harness.events).not.toContain("facing:actor-a:right");
    expect(harness.events).not.toContain("visible:actor-b:false");
    expect(harness.events).not.toContain("start:dialogue:line-b");
    expect(harness.scheduler.pendingCount).toBe(0);
  });

  it("releases locks and surfaces adapter failures", async () => {
    const harness = createHarness();
    const failure = new Error("facing failed");
    harness.failFacingWith(failure);

    await expect(
      harness.engine.run(
        definition([
          { kind: "facing", actor: "actor-a", facing: "right" },
        ]),
      ),
    ).rejects.toBe(failure);

    expect(harness.engine.isRunning).toBe(false);
    expect(harness.lockState).toEqual({ acquired: 1, released: 1 });
    expect(harness.input.unsubscribeCount).toBe(1);
    expect(harness.finalStates).toHaveLength(0);

    harness.failFacingWith(undefined);
    await expect(harness.engine.run(definition([]))).resolves.toEqual({
      status: "completed",
    });
  });

  it("rejects a concurrent run and leaves the active run intact", async () => {
    const harness = createHarness();
    const active = harness.engine.run(
      definition([{ kind: "wait", durationMs: 100 }]),
    );

    await expect(
      harness.engine.run(definition([])),
    ).rejects.toBeInstanceOf(MapSequenceReentrancyError);
    expect(harness.engine.isRunning).toBe(true);

    harness.engine.requestSkip();
    await expect(active).resolves.toEqual({ status: "skipped" });
    expect(harness.lockState).toEqual({ acquired: 1, released: 1 });
  });

  it("disposes idempotently and rejects the active run with a typed error", async () => {
    const harness = createHarness();
    const active = harness.engine.run(
      definition([{ kind: "wait", durationMs: 100 }]),
    );

    const firstDispose = harness.engine.dispose();
    const secondDispose = harness.engine.dispose();
    expect(secondDispose).toBe(firstDispose);

    await expect(active).rejects.toBeInstanceOf(MapSequenceCancelledError);
    await expect(active).rejects.toMatchObject({
      reason: "dispose",
    });
    await expect(firstDispose).resolves.toBeUndefined();

    expect(harness.scheduler.pendingCount).toBe(0);
    expect(harness.lockState).toEqual({ acquired: 1, released: 1 });
    expect(harness.input.unsubscribeCount).toBe(1);
    await expect(
      harness.engine.run(definition([])),
    ).rejects.toBeInstanceOf(MapSequenceDisposedError);
  });
});
