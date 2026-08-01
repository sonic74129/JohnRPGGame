import { describe, expect, it } from "vitest";

import { DIALOGUES } from "../src/game/content";

describe("in-world story presentation", () => {
  it("keeps scene illustrations out of playable dialogue data", () => {
    const lines = Object.values(DIALOGUES).flat();

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => !Object.hasOwn(line, "art"))).toBe(true);
  });

  it("retains portraits as compact dialogue context", () => {
    expect(
      Object.values(DIALOGUES)
        .flat()
        .some((line) => line.portrait !== undefined),
    ).toBe(true);
  });
});
