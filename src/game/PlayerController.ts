export interface MovementVector {
  readonly x: number;
  readonly y: number;
}

export class PlayerController {
  private lockCount = 0;

  get isLocked(): boolean {
    return this.lockCount > 0;
  }

  get activeLocks(): number {
    return this.lockCount;
  }

  lock(): () => void {
    this.lockCount += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.lockCount = Math.max(0, this.lockCount - 1);
    };
  }

  async withLock<T>(handler: () => Promise<T> | T): Promise<T> {
    const release = this.lock();
    try {
      return await handler();
    } finally {
      release();
    }
  }

  resolveMovement(horizontal: number, vertical: number): MovementVector {
    if (this.isLocked || (horizontal === 0 && vertical === 0)) {
      return { x: 0, y: 0 };
    }
    const length = Math.hypot(horizontal, vertical);
    return { x: horizontal / length, y: vertical / length };
  }
}
