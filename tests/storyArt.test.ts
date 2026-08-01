import { describe, expect, it } from "vitest";

import { DIALOGUES } from "../src/game/content";

describe("story illustrations", () => {
  it("uses the Martha illustration throughout her meeting with Jesus", () => {
    const meeting = [
      ...DIALOGUES.marthaBeforeQuestion,
      ...DIALOGUES.marthaCore,
    ];

    expect(meeting.every(({ art }) => art === "story-martha-meets-jesus.png")).toBe(
      true,
    );
  });

  it("uses dedicated art for the central signs and reflection", () => {
    expect(findArt("mary", "耶稣哭了")).toBe("story-jesus-weeps.png");
    expect(findArt("tomb", "那死人就出来了")).toBe(
      "story-lazarus-comes-out.png",
    );
    expect(
      DIALOGUES.epilogue.every(
        ({ art }) => art === "story-ending-reflection.png",
      ),
    ).toBe(true);
  });

  function findArt(
    dialogue: keyof typeof DIALOGUES,
    text: string,
  ): string | undefined {
    return DIALOGUES[dialogue].find((line) => line.text.includes(text))?.art;
  }
});
