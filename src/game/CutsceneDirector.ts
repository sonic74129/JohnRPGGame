import type { PlayerController } from "./PlayerController";

export class CutsceneDirector {
  constructor(private readonly player: PlayerController) {}

  async run<T>(handler: () => Promise<T> | T): Promise<T> {
    const unlock = this.player.lock();
    try {
      return await handler();
    } finally {
      unlock();
    }
  }
}
