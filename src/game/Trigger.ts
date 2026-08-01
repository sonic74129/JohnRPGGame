export type StageGate<Stage> = Stage | readonly Stage[];

export interface TriggerOptions<Stage> {
  readonly stage: StageGate<Stage>;
  readonly oneShot?: boolean;
  readonly handler: () => Promise<void> | void;
}

export class Trigger<Stage> {
  private inFlight = false;
  private consumed = false;

  constructor(private readonly options: TriggerOptions<Stage>) {}

  get isConsumed(): boolean {
    return this.consumed;
  }

  get isRunning(): boolean {
    return this.inFlight;
  }

  async tryActivate(stage: Stage): Promise<boolean> {
    if (
      this.inFlight ||
      this.consumed ||
      !this.matchesStage(stage)
    ) {
      return false;
    }

    this.inFlight = true;
    try {
      await this.options.handler();
      if (this.options.oneShot ?? true) {
        this.consumed = true;
      }
      return true;
    } finally {
      this.inFlight = false;
    }
  }

  private matchesStage(stage: Stage): boolean {
    const gate = this.options.stage;
    return Array.isArray(gate) ? gate.includes(stage) : gate === stage;
  }
}
