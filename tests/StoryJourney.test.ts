import { describe, expect, it } from "vitest";

import { StoryJourney } from "../src/game/StoryJourney";

describe("StoryJourney", () => {
  it("makes each story target ready independently", () => {
    const journeys = new StoryJourney();

    journeys.begin("guide");
    journeys.begin("martha");
    journeys.complete("guide");

    expect(journeys.status("guide")).toBe("ready");
    expect(journeys.status("martha")).toBe("moving");
    expect(journeys.status("mary")).toBe("idle");
  });

  it("does not complete a journey that never started", () => {
    const journeys = new StoryJourney();

    expect(journeys.complete("mary")).toBe(false);
    expect(journeys.status("mary")).toBe("idle");
  });

  it("resets one target without disturbing another", () => {
    const journeys = new StoryJourney();
    journeys.begin("martha");
    journeys.begin("mary");

    journeys.reset("martha");

    expect(journeys.status("martha")).toBe("idle");
    expect(journeys.status("mary")).toBe("moving");
  });
});
