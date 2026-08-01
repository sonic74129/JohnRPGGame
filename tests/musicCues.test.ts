import { describe, expect, it } from "vitest";

import { DIALOGUES } from "../src/game/content";

describe("narrative music cues", () => {
  it("reserves Theme 3 and silence for the central Scripture moments", () => {
    expect(DIALOGUES.opening[0]?.music).toBe("dialogue");
    expect(findCue("messageJourney", "两天后")).toBe("silence");
    expect(findCue("marthaCore", "复活在我")).toBe("revelation");
    expect(findCue("mary", "耶稣哭了")).toBe("silence");
    expect(findCue("tomb", "拉撒路出来")).toBe("silence");
    expect(findCue("tomb", "那死人就出来了")).toBe("revelation");
    expect(DIALOGUES.epilogue[0]?.music).toBe("revelation");
  });

  function findCue(
    dialogue: keyof typeof DIALOGUES,
    text: string,
  ): string | undefined {
    return DIALOGUES[dialogue].find((line) => line.text.includes(text))?.music;
  }
});
