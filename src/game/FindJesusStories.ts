import type { Point } from "./NavigationGrid";

export const FIND_JESUS_MEMORY_CARRIER_IDS = [
  "memory-carrier-bread",
  "memory-carrier-water",
  "memory-carrier-mud",
] as const;

export const FIND_JESUS_CORE_ACTOR_IDS = [
  "player",
  "martha",
  "mary",
  "jesus",
  "thomas",
  "older-disciple",
  "younger-disciple",
  "mourner",
  "mourner-woman",
  "guide",
  "older-witness",
  "lazarus",
] as const;

export type FindJesusMemoryCarrierId =
  (typeof FIND_JESUS_MEMORY_CARRIER_IDS)[number];
export type FindJesusCoreActorId = (typeof FIND_JESUS_CORE_ACTOR_IDS)[number];
export type FindJesusPropFrame =
  | "bread/fish"
  | "water/cup"
  | "mud-bowl/water";
export type FindJesusRegion =
  | "market-road"
  | "village-well-road"
  | "olive-terrace-road";
export type FindJesusReference =
  | "约翰福音 6:9–13"
  | "约翰福音 2:7–9"
  | "约翰福音 9:6–7";
export type FindJesusDirection = "东" | "东南";
export type FindJesusCarrierLabel =
  | "提饼篮的人"
  | "守水缸的村民"
  | "端泥碗的村民";

export interface FindJesusPlacement extends Point {
  readonly region: FindJesusRegion;
  readonly navigationSafetyMargin: 40;
}

export interface FindJesusNaturalStory {
  readonly speakerIdentity: "anonymous-route-passer";
  readonly claimsEyewitness: false;
  readonly interactionStory: readonly [string, string];
  readonly anchorTerms: readonly [string, string, string];
  readonly reference: FindJesusReference;
  readonly jesusDirection: {
    readonly heading: FindJesusDirection;
    readonly destination: "村外营地";
    readonly hint: string;
  };
  readonly referenceOnlyEnding: true;
  readonly displayFullVerse: false;
}

export interface FindJesusMemoryCarrier extends FindJesusNaturalStory {
  readonly id: FindJesusMemoryCarrierId;
  readonly temporaryLabel: FindJesusCarrierLabel;
  readonly chronology: "outside-john-11";
  readonly proximityObservation: string;
  readonly propFrame: FindJesusPropFrame;
  readonly placement: FindJesusPlacement;
}

export const FIND_JESUS_NATURAL_STORIES: Readonly<
  Record<FindJesusMemoryCarrierId, FindJesusNaturalStory>
> = {
  "memory-carrier-bread": {
    speakerIdentity: "anonymous-route-passer",
    claimsEyewitness: false,
    interactionStory: [
      "人们曾讲起，一个孩子有五个大麦饼和两条鱼，耶稣祝谢后分给众人。",
      "众人吃饱后，门徒收拾零碎，装满了十二个篮子。若你在找耶稣，沿路往东南走，他和门徒正在村外营地。",
    ],
    anchorTerms: ["五个大麦饼", "两条鱼", "十二个篮子"],
    reference: "约翰福音 6:9–13",
    jesusDirection: {
      heading: "东南",
      destination: "村外营地",
      hint: "若你在找耶稣，沿路往东南走，他和门徒正在村外营地。",
    },
    referenceOnlyEnding: true,
    displayFullVerse: false,
  },
  "memory-carrier-water": {
    speakerIdentity: "anonymous-route-passer",
    claimsEyewitness: false,
    interactionStory: [
      "人们曾讲起，那里有六口石缸，耶稣吩咐人把缸倒满了水。",
      "管筵席的尝了那水变的酒，并不知道酒从哪里来。若你在找耶稣，沿井边道路一直向东，他和门徒正在村外营地。",
    ],
    anchorTerms: ["六口石缸", "倒满了水", "水变的酒"],
    reference: "约翰福音 2:7–9",
    jesusDirection: {
      heading: "东",
      destination: "村外营地",
      hint: "若你在找耶稣，沿井边道路一直向东，他和门徒正在村外营地。",
    },
    referenceOnlyEnding: true,
    displayFullVerse: false,
  },
  "memory-carrier-mud": {
    speakerIdentity: "anonymous-route-passer",
    claimsEyewitness: false,
    interactionStory: [
      "人们曾讲起，耶稣用唾沫和泥抹在一个人的眼睛上，并叫他到西罗亚池子里去洗。",
      "那人去一洗，回来的时候就看见了。若你在找耶稣，顺橄榄坡往东南下行，他和门徒正在村外营地。",
    ],
    anchorTerms: ["泥", "西罗亚池子", "看见"],
    reference: "约翰福音 9:6–7",
    jesusDirection: {
      heading: "东南",
      destination: "村外营地",
      hint: "若你在找耶稣，顺橄榄坡往东南下行，他和门徒正在村外营地。",
    },
    referenceOnlyEnding: true,
    displayFullVerse: false,
  },
};

export const FIND_JESUS_MEMORY_CARRIERS: Readonly<
  Record<FindJesusMemoryCarrierId, FindJesusMemoryCarrier>
> = {
  "memory-carrier-bread": {
    id: "memory-carrier-bread",
    temporaryLabel: "提饼篮的人",
    chronology: "outside-john-11",
    proximityObservation:
      "提饼篮的人望着鱼和饼，像在思量五个饼和两条鱼怎能喂饱众人。",
    propFrame: "bread/fish",
    placement: {
      region: "market-road",
      x: 1120,
      y: 880,
      navigationSafetyMargin: 40,
    },
    ...FIND_JESUS_NATURAL_STORIES["memory-carrier-bread"],
  },
  "memory-carrier-water": {
    id: "memory-carrier-water",
    temporaryLabel: "守水缸的村民",
    chronology: "outside-john-11",
    proximityObservation:
      "守水缸的村民望着缸中清水，像在思量水为何会变成酒。",
    propFrame: "water/cup",
    placement: {
      region: "village-well-road",
      x: 780,
      y: 1160,
      navigationSafetyMargin: 40,
    },
    ...FIND_JESUS_NATURAL_STORIES["memory-carrier-water"],
  },
  "memory-carrier-mud": {
    id: "memory-carrier-mud",
    temporaryLabel: "端泥碗的村民",
    chronology: "outside-john-11",
    proximityObservation:
      "端泥碗的村民望着泥和水，像在思量那位重见光明的人。",
    propFrame: "mud-bowl/water",
    placement: {
      region: "olive-terrace-road",
      x: 1260,
      y: 500,
      navigationSafetyMargin: 40,
    },
    ...FIND_JESUS_NATURAL_STORIES["memory-carrier-mud"],
  },
};

export const FIND_JESUS_STORY_CONTRACT = {
  playerStart: {
    region: "meeting-area",
    landmark: "bethany-entrance",
    x: 1640,
    y: 1050,
  },
  reservedCamp: {
    region: "right-lower-camp",
    center: { x: 2260, y: 1260 },
    actorIds: [
      "jesus",
      "thomas",
      "older-disciple",
      "younger-disciple",
    ] satisfies readonly FindJesusCoreActorId[],
  },
  carriers: FIND_JESUS_MEMORY_CARRIERS,
  naturalStories: FIND_JESUS_NATURAL_STORIES,
  interactionOrder: "free",
  correctTargetId: "jesus",
  scorePenalty: 0,
  requiresAllClues: false,
  onJesusSelected: {
    revealLabel: "耶稣",
    cleanup: {
      carriers: true,
      props: true,
      proximityObservations: true,
      temporaryLabels: true,
    },
    nextBeatId: "john11:3",
  },
} as const;
