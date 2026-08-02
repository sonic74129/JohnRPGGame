import { describe, expect, it } from "vitest";

import {
  FIND_JESUS_CORE_ACTOR_IDS,
  FIND_JESUS_MEMORY_CARRIERS,
  FIND_JESUS_MEMORY_CARRIER_IDS,
  FIND_JESUS_NATURAL_STORIES,
  FIND_JESUS_STORY_CONTRACT,
} from "../src/game/FindJesusStories";
import {
  WORLD_BOUNDARY,
  WORLD_HEIGHT,
  WORLD_NAVIGATION_CLEARANCE,
  WORLD_REGIONS,
  WORLD_STRUCTURE_OBSTACLES,
  WORLD_WIDTH,
  createWorldNavigation,
} from "../src/game/WorldLayout";

const distanceFromRectangle = (
  point: { readonly x: number; readonly y: number },
  rectangle: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
): number => {
  const horizontalDistance = Math.max(
    rectangle.x - point.x,
    0,
    point.x - (rectangle.x + rectangle.width),
  );
  const verticalDistance = Math.max(
    rectangle.y - point.y,
    0,
    point.y - (rectangle.y + rectangle.height),
  );
  return Math.hypot(horizontalDistance, verticalDistance);
};

describe("Find Jesus natural-story contract", () => {
  it("starts near the Bethany meeting area and scatters clues across safe regions", () => {
    const { playerStart, reservedCamp } = FIND_JESUS_STORY_CONTRACT;
    const carriers = Object.values(FIND_JESUS_MEMORY_CARRIERS);
    const navigation = createWorldNavigation();

    expect(playerStart).toMatchObject({
      region: "meeting-area",
      landmark: "bethany-entrance",
      x: 1640,
      y: 1050,
    });
    expect(playerStart.x).toBeGreaterThanOrEqual(WORLD_REGIONS.meetingArea.x);
    expect(playerStart.x).toBeLessThanOrEqual(
      WORLD_REGIONS.meetingArea.x + WORLD_REGIONS.meetingArea.width,
    );
    expect(playerStart.y).toBeGreaterThanOrEqual(WORLD_REGIONS.meetingArea.y);
    expect(playerStart.y).toBeLessThanOrEqual(
      WORLD_REGIONS.meetingArea.y + WORLD_REGIONS.meetingArea.height,
    );
    expect(
      Math.hypot(
        playerStart.x - reservedCamp.center.x,
        playerStart.y - reservedCamp.center.y,
      ),
    ).toBeGreaterThan(600);

    expect(carriers.map(({ placement }) => placement.region)).toEqual([
      "market-road",
      "village-well-road",
      "olive-terrace-road",
    ]);
    expect(carriers.map(({ placement }) => [placement.x, placement.y])).toEqual([
      [1120, 880],
      [780, 1160],
      [1260, 500],
    ]);
    expect(new Set(carriers.map(({ placement }) => placement.region)).size).toBe(
      3,
    );

    for (const { placement } of carriers) {
      expect(placement.x).toBeGreaterThanOrEqual(WORLD_BOUNDARY);
      expect(placement.y).toBeGreaterThanOrEqual(WORLD_BOUNDARY);
      expect(placement.x).toBeLessThanOrEqual(WORLD_WIDTH - WORLD_BOUNDARY);
      expect(placement.y).toBeLessThanOrEqual(WORLD_HEIGHT - WORLD_BOUNDARY);
      expect(placement.navigationSafetyMargin).toBe(WORLD_NAVIGATION_CLEARANCE);
      expect(
        Math.min(
          ...WORLD_STRUCTURE_OBSTACLES.map((obstacle) =>
            distanceFromRectangle(placement, obstacle),
          ),
        ),
      ).toBeGreaterThanOrEqual(WORLD_NAVIGATION_CLEARANCE);
      expect(navigation.findPath(playerStart, placement).length).toBeGreaterThan(
        0,
      );
      expect(
        Math.hypot(
          placement.x - reservedCamp.center.x,
          placement.y - reservedCamp.center.y,
        ),
      ).toBeGreaterThan(900);
    }
  });

  it("uses exact observations, route-passer labels, and matching prop frames", () => {
    expect(
      FIND_JESUS_MEMORY_CARRIER_IDS.map(
        (id) => FIND_JESUS_MEMORY_CARRIERS[id].proximityObservation,
      ),
    ).toEqual([
      "这个人拿着饼和鱼。",
      "这个人身旁放着水器和杯。",
      "这个人带着泥碗和水器。",
    ]);
    expect(
      FIND_JESUS_MEMORY_CARRIER_IDS.map(
        (id) => FIND_JESUS_MEMORY_CARRIERS[id].propFrame,
      ),
    ).toEqual(["bread/fish", "water/cup", "mud-bowl/water"]);

    for (const carrier of Object.values(FIND_JESUS_MEMORY_CARRIERS)) {
      expect(carrier.temporaryLabel).toBe("路人");
      expect(carrier.chronology).toBe("outside-john-11");
    }
  });

  it("keeps each short story neutral, scripture-bounded, and memory-anchored", () => {
    expect(
      FIND_JESUS_MEMORY_CARRIER_IDS.map(
        (id) => FIND_JESUS_NATURAL_STORIES[id].reference,
      ),
    ).toEqual([
      "约翰福音 6:9–13",
      "约翰福音 2:7–9",
      "约翰福音 9:6–7",
    ]);

    for (const story of Object.values(FIND_JESUS_NATURAL_STORIES)) {
      const narrative = story.interactionStory.join("");

      expect(story.interactionStory).toHaveLength(2);
      expect(story.interactionStory[0]).toMatch(/^人们曾讲起，/);
      expect(story.anchorTerms).toHaveLength(3);
      for (const anchor of story.anchorTerms) {
        expect(narrative).toContain(anchor);
      }
      expect(story.speakerIdentity).toBe("anonymous-route-passer");
      expect(story.claimsEyewitness).toBe(false);
      expect(narrative).not.toMatch(
        /我亲眼|我当时|我在那里|我就是|那孩子就是我|用人就是我|瞎子就是我|我看见|我们/,
      );
      expect(story.referenceOnlyEnding).toBe(true);
      expect(story.displayFullVerse).toBe(false);
      expect(narrative).not.toContain(story.reference);
    }
  });

  it("allows free, penalty-free discovery and performs complete reveal cleanup", () => {
    expect(FIND_JESUS_STORY_CONTRACT.interactionOrder).toBe("free");
    expect(FIND_JESUS_STORY_CONTRACT.scorePenalty).toBe(0);
    expect(FIND_JESUS_STORY_CONTRACT.requiresAllClues).toBe(false);
    expect(FIND_JESUS_STORY_CONTRACT.correctTargetId).toBe("jesus");
    expect(FIND_JESUS_STORY_CONTRACT.onJesusSelected).toEqual({
      revealLabel: "耶稣",
      cleanup: {
        carriers: true,
        props: true,
        proximityObservations: true,
        temporaryLabels: true,
      },
      nextBeatId: "john11:3",
    });
  });

  it("reserves the right-lower camp for core actors only", () => {
    expect(FIND_JESUS_STORY_CONTRACT.reservedCamp).toEqual({
      region: "right-lower-camp",
      center: { x: 2260, y: 1260 },
      actorIds: [
        "jesus",
        "thomas",
        "older-disciple",
        "younger-disciple",
      ],
    });

    const naturalStoryIds = Object.keys(FIND_JESUS_NATURAL_STORIES);
    for (const actorId of FIND_JESUS_CORE_ACTOR_IDS) {
      expect(naturalStoryIds).not.toContain(actorId);
    }
  });
});
