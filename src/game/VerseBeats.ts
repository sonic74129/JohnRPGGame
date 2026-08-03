import {
  ACTOR_IDS,
  ACTOR_LABELS,
  FIND_JESUS_CONTRACT,
  type ActorId,
  type John11VerseKey,
  type RecallQuestionId,
  type StoryActorId,
} from "./ScriptureContent";
import { FIND_JESUS_MEMORY_CARRIERS } from "./FindJesusStories";

export const VERSE_BEAT_IDS = [
  "illness",
  "sisters-send",
  "find-jesus",
  "message",
  "two-day-wait",
  "return-to-judea",
  "thomas",
  "four-days",
  "martha-goes",
  "martha-hope",
  "resurrection-life",
  "martha-confession",
  "martha-calls",
  "mary-rises",
  "mary-at-feet",
  "jesus-weeps",
  "come-and-see",
  "tomb-arrival",
  "stone-dialogue",
  "stone-and-prayer",
  "call-and-emergence",
  "responses",
] as const;

export type VerseBeatId = (typeof VERSE_BEAT_IDS)[number];

export type BeatTriggerKind =
  | "proximity"
  | "interaction"
  | "memory-identification"
  | "automatic"
  | "arrival"
  | "spatial-actor-choice"
  | "recall-question";

export type StoryGroupId =
  | "sisters-group"
  | "disciples-group"
  | "jews-group"
  | "crowd-group"
  | "narrator";

export interface ScriptureSupportedAction {
  readonly source: "scripture";
  readonly actor: StoryActorId | StoryGroupId;
  readonly kind:
    | "identify"
    | "send"
    | "speak"
    | "remain"
    | "travel"
    | "arrive"
    | "appear"
    | "go"
    | "sit"
    | "call"
    | "rise"
    | "follow"
    | "fall-at-feet"
    | "weep"
    | "lead-as-group"
    | "face-tomb"
    | "move-stone"
    | "look-up"
    | "emerge-wrapped"
    | "unbind"
    | "believe"
    | "leave-and-report";
  readonly verseKeys: readonly John11VerseKey[];
  readonly description: string;
}

export interface ApprovedBridgeAction {
  readonly source: "approved-player-memory-bridge";
  readonly actor: ActorId;
  readonly kind: "inspect-memory" | "identify-jesus" | "leave-bridge";
  readonly verseKeys: readonly [];
  readonly description: string;
}

export type SupportedAction = ScriptureSupportedAction | ApprovedBridgeAction;

export interface ActorVerseEchoGrant {
  readonly actorIds: readonly StoryActorId[];
  readonly verseKeys: readonly John11VerseKey[];
  readonly kind: "spoken-scripture" | "scripture-narration";
  readonly exactExcerpt?: string;
}

export interface ActorSnapshot {
  readonly visibleActorIds: readonly ActorId[];
  readonly labelOverrides?: Readonly<Partial<Record<ActorId, string | null>>>;
}

export interface VerseBeat {
  readonly id: VerseBeatId;
  readonly order: number;
  readonly verseKeys: readonly John11VerseKey[];
  readonly trigger: {
    readonly kind: BeatTriggerKind;
    readonly actorIds?: readonly ActorId[];
  };
  readonly prerequisite:
    | { readonly kind: "story-start" }
    | {
        readonly kind: "beat-completed";
        readonly beatId: VerseBeatId;
      };
  readonly supportedActions: readonly SupportedAction[];
  readonly recallBeforeReveal:
    | { readonly kind: "none" }
    | {
        readonly kind: "required";
        readonly questionId: RecallQuestionId;
        readonly concealedVerseKeys: readonly John11VerseKey[];
      };
  readonly handoff: {
    readonly mode: "automatic" | "manual";
    readonly nextBeatId: VerseBeatId | null;
  };
  readonly duringBeatActors?: ActorSnapshot;
  readonly finalState: {
    readonly actors: ActorSnapshot;
    readonly stateFacts: readonly string[];
    readonly playerControl: "enabled" | "sequence";
  };
  readonly echoGrants: readonly ActorVerseEchoGrant[];
}

const OPENING_ACTORS = ["player", "martha", "mary", "lazarus"] as const;
const CAMP_ACTORS = [
  "player",
  "martha",
  "mary",
  "jesus",
  "thomas",
  "older-disciple",
  "younger-disciple",
] as const;
const FIND_JESUS_ACTORS = [
  ...CAMP_ACTORS,
  ...FIND_JESUS_CONTRACT.clueCarrierIds,
] as const;
const BETHANY_ACTORS = [
  ...CAMP_ACTORS,
  "mourner",
  "mourner-woman",
  "guide",
  "older-witness",
] as const;
const RESTORED_ACTORS = [...BETHANY_ACTORS, "lazarus"] as const;

const noRecall = { kind: "none" } as const;

const scriptureAction = (
  actor: ScriptureSupportedAction["actor"],
  kind: ScriptureSupportedAction["kind"],
  verseKeys: readonly John11VerseKey[],
  description: string,
): ScriptureSupportedAction => ({
  source: "scripture",
  actor,
  kind,
  verseKeys,
  description,
});

export const VERSE_BEATS: readonly VerseBeat[] = [
  {
    id: "illness",
    order: 0,
    verseKeys: ["john11:1", "john11:2"],
    trigger: { kind: "proximity", actorIds: ["lazarus"] },
    prerequisite: { kind: "story-start" },
    supportedActions: [
      scriptureAction(
        "narrator",
        "identify",
        ["john11:1", "john11:2"],
        "经文说明患病的拉撒路、伯大尼、马利亚和马大。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "sisters-send" },
    finalState: {
      actors: { visibleActorIds: OPENING_ACTORS },
      stateFacts: [
        "lazarus:sick-at-bethany",
        "martha:at-house",
        "mary:at-house",
        "comforting-jews:not-present",
      ],
      playerControl: "enabled",
    },
    echoGrants: [],
  },
  {
    id: "sisters-send",
    order: 1,
    verseKeys: ["john11:3"],
    trigger: { kind: "interaction", actorIds: ["martha", "mary"] },
    prerequisite: { kind: "beat-completed", beatId: "illness" },
    supportedActions: [
      scriptureAction(
        "sisters-group",
        "send",
        ["john11:3"],
        "姐妹二人差人去见耶稣，并托付约翰福音 11:3 的口信。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "find-jesus" },
    finalState: {
      actors: { visibleActorIds: OPENING_ACTORS },
      stateFacts: [
        "player:unnamed-messenger-sent",
        "message:john11-3-entrusted",
        "comforting-jews:not-present",
      ],
      playerControl: "enabled",
    },
    echoGrants: [],
  },
  {
    id: "find-jesus",
    order: 2,
    verseKeys: [],
    trigger: {
      kind: "memory-identification",
      actorIds: FIND_JESUS_CONTRACT.disguisedActorIds,
    },
    prerequisite: { kind: "beat-completed", beatId: "sisters-send" },
    supportedActions: [
      {
        source: "approved-player-memory-bridge",
        actor: "player",
        kind: "inspect-memory",
        verseKeys: [],
        description:
          "玩家可与携带相应物件的人交谈，听他们转述约翰福音 6:9–13、2:7–9 或 9:6–7，并获得耶稣所在方位。",
      },
      {
        source: "approved-player-memory-bridge",
        actor: "jesus",
        kind: "identify-jesus",
        verseKeys: [],
        description: "正确选择只揭示耶稣的姓名，不要求先查看所有线索。",
      },
      ...FIND_JESUS_CONTRACT.clueCarrierIds.map(
        (actor): ApprovedBridgeAction => ({
          source: "approved-player-memory-bridge",
          actor,
          kind: "leave-bridge",
          verseKeys: [],
          description: "辨认完成后，静默的线索人物在传口信前离场。",
        }),
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "message" },
    duringBeatActors: {
      visibleActorIds: FIND_JESUS_ACTORS,
      labelOverrides: {
        jesus: FIND_JESUS_CONTRACT.temporaryLabel,
        "memory-carrier-bread":
          FIND_JESUS_MEMORY_CARRIERS["memory-carrier-bread"].temporaryLabel,
        "memory-carrier-water":
          FIND_JESUS_MEMORY_CARRIERS["memory-carrier-water"].temporaryLabel,
        "memory-carrier-mud":
          FIND_JESUS_MEMORY_CARRIERS["memory-carrier-mud"].temporaryLabel,
      },
    },
    finalState: {
      actors: {
        visibleActorIds: CAMP_ACTORS,
      },
      stateFacts: [
        "jesus:label-revealed",
        "memory-carriers:removed",
        "memory-clues:not-required",
        "wrong-selection:zero-penalty",
        "comforting-jews:not-present",
      ],
      playerControl: "enabled",
    },
    echoGrants: [],
  },
  {
    id: "message",
    order: 3,
    verseKeys: ["john11:3", "john11:4"],
    trigger: { kind: "interaction", actorIds: ["jesus"] },
    prerequisite: { kind: "beat-completed", beatId: "find-jesus" },
    supportedActions: [
      scriptureAction(
        "player",
        "speak",
        ["john11:3"],
        "无名报信者传达姐妹托付的原话。",
      ),
      scriptureAction(
        "jesus",
        "speak",
        ["john11:4"],
        "耶稣回答约翰福音 11:4。",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "message",
      concealedVerseKeys: ["john11:3"],
    },
    handoff: { mode: "automatic", nextBeatId: "two-day-wait" },
    finalState: {
      actors: { visibleActorIds: CAMP_ACTORS },
      stateFacts: [
        "message:john11-3-delivered",
        "jesus:john11-4-spoken",
        "memory-carriers:absent",
        "comforting-jews:not-present",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:4"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "two-day-wait",
    order: 4,
    verseKeys: ["john11:5", "john11:6"],
    trigger: { kind: "automatic" },
    prerequisite: { kind: "beat-completed", beatId: "message" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "remain",
        ["john11:5", "john11:6"],
        "耶稣听见拉撒路病了，仍在所居之地住了两天。",
      ),
      scriptureAction(
        "disciples-group",
        "remain",
        ["john11:5", "john11:6"],
        "门徒与耶稣仍在同一处；不增加营地活动。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "return-to-judea" },
    finalState: {
      actors: { visibleActorIds: CAMP_ACTORS },
      stateFacts: [
        "elapsed-days:two",
        "jesus-and-disciples:still-at-camp",
        "time-of-day:day",
        "comforting-jews:not-present",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:5", "john11:6"],
        kind: "scripture-narration",
      },
    ],
  },
  {
    id: "return-to-judea",
    order: 5,
    verseKeys: [
      "john11:7",
      "john11:8",
      "john11:9",
      "john11:10",
      "john11:11",
      "john11:12",
      "john11:13",
      "john11:14",
      "john11:15",
    ],
    trigger: { kind: "interaction", actorIds: ["jesus"] },
    prerequisite: { kind: "beat-completed", beatId: "two-day-wait" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "speak",
        ["john11:7", "john11:9", "john11:10", "john11:11", "john11:14", "john11:15"],
        "耶稣按约翰福音 11:7–15 对门徒说话。",
      ),
      scriptureAction(
        "disciples-group",
        "speak",
        ["john11:8", "john11:12"],
        "门徒按约翰福音 11:8、12 回应。",
      ),
      scriptureAction(
        "narrator",
        "identify",
        ["john11:13"],
        "经文说明耶稣所说的是指着拉撒路的死。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "thomas" },
    finalState: {
      actors: { visibleActorIds: CAMP_ACTORS },
      stateFacts: [
        "return-to-judea:announced",
        "journey:not-started-before-thomas",
        "comforting-jews:not-present",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: [
          "john11:7",
          "john11:9",
          "john11:10",
          "john11:11",
          "john11:14",
          "john11:15",
        ],
        kind: "spoken-scripture",
      },
      {
        actorIds: ["older-disciple", "younger-disciple"],
        verseKeys: [
          "john11:7",
          "john11:8",
          "john11:9",
          "john11:10",
          "john11:11",
          "john11:12",
          "john11:13",
          "john11:14",
          "john11:15",
        ],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "thomas",
    order: 6,
    verseKeys: ["john11:16"],
    trigger: { kind: "interaction", actorIds: ["thomas"] },
    prerequisite: { kind: "beat-completed", beatId: "return-to-judea" },
    supportedActions: [
      scriptureAction(
        "thomas",
        "speak",
        ["john11:16"],
        "多马对同作门徒的说约翰福音 11:16 的原话。",
      ),
      scriptureAction(
        "jesus",
        "travel",
        ["john11:16"],
        "多马说话后，耶稣与门徒一同前往伯大尼。",
      ),
      scriptureAction(
        "disciples-group",
        "travel",
        ["john11:16"],
        "门徒与耶稣一同前往伯大尼。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "four-days" },
    finalState: {
      actors: { visibleActorIds: CAMP_ACTORS },
      stateFacts: [
        "thomas:john11-16-spoken",
        "jesus-and-disciples:journeying-to-bethany",
        "comforting-jews:not-present-until-arrival",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["thomas"],
        verseKeys: ["john11:16"],
        kind: "spoken-scripture",
        exactExcerpt: "我们也去和他同死吧。",
      },
    ],
  },
  {
    id: "four-days",
    order: 7,
    verseKeys: ["john11:17", "john11:18", "john11:19"],
    trigger: { kind: "arrival" },
    prerequisite: { kind: "beat-completed", beatId: "thomas" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "arrive",
        ["john11:17", "john11:18"],
        "耶稣到达伯大尼附近。",
      ),
      scriptureAction(
        "jews-group",
        "appear",
        ["john11:19"],
        "好些犹太人在到达后出现，来安慰马大和马利亚。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "martha-goes" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "lazarus:in-tomb-four-days",
        "jesus:not-yet-in-village",
        "martha:at-house",
        "mary:seated-at-house",
        "comforting-jews:present-after-arrival",
        "john11-20:not-revealed",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:19"],
        kind: "scripture-narration",
      },
    ],
  },
  {
    id: "martha-goes",
    order: 8,
    verseKeys: ["john11:20"],
    trigger: { kind: "spatial-actor-choice", actorIds: ["martha", "mary"] },
    prerequisite: { kind: "beat-completed", beatId: "four-days" },
    supportedActions: [
      scriptureAction(
        "martha",
        "go",
        ["john11:20"],
        "马大听见耶稣来了，就出去迎接他。",
      ),
      scriptureAction(
        "mary",
        "sit",
        ["john11:20"],
        "马利亚仍然坐在家里。",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "choose-martha",
      concealedVerseKeys: ["john11:20"],
    },
    handoff: { mode: "manual", nextBeatId: "martha-hope" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "martha:at-jesus-meeting-place",
        "mary:seated-at-house",
        "comforting-jews:near-mary",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["martha"],
        verseKeys: ["john11:20"],
        kind: "scripture-narration",
        exactExcerpt: "马大听见耶稣来了，就出去迎接他",
      },
      {
        actorIds: ["mary"],
        verseKeys: ["john11:20"],
        kind: "scripture-narration",
        exactExcerpt: "马利亚却仍然坐在家里",
      },
    ],
  },
  {
    id: "martha-hope",
    order: 9,
    verseKeys: ["john11:21", "john11:22", "john11:23", "john11:24"],
    trigger: { kind: "interaction", actorIds: ["martha", "jesus"] },
    prerequisite: { kind: "beat-completed", beatId: "martha-goes" },
    supportedActions: [
      scriptureAction(
        "martha",
        "speak",
        ["john11:21", "john11:22", "john11:24"],
        "马大按约翰福音 11:21–24 对耶稣说话。",
      ),
      scriptureAction(
        "jesus",
        "speak",
        ["john11:23"],
        "耶稣说：“你兄弟必然复活。”",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "martha-resurrection",
      concealedVerseKeys: ["john11:24"],
    },
    handoff: { mode: "manual", nextBeatId: "resurrection-life" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "martha-and-jesus:john11-21-24-spoken",
        "mary:seated-at-house",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["martha"],
        verseKeys: ["john11:24"],
        kind: "spoken-scripture",
      },
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:23"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "resurrection-life",
    order: 10,
    verseKeys: ["john11:25", "john11:26"],
    trigger: { kind: "interaction", actorIds: ["jesus"] },
    prerequisite: { kind: "beat-completed", beatId: "martha-hope" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "speak",
        ["john11:25", "john11:26"],
        "耶稣宣告约翰福音 11:25–26。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "martha-confession" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: ["jesus:john11-25-26-spoken", "mary:seated-at-house"],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:25", "john11:26"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "martha-confession",
    order: 11,
    verseKeys: ["john11:27"],
    trigger: { kind: "interaction", actorIds: ["martha"] },
    prerequisite: { kind: "beat-completed", beatId: "resurrection-life" },
    supportedActions: [
      scriptureAction(
        "martha",
        "speak",
        ["john11:27"],
        "马大完整说出约翰福音 11:27 的告白。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "martha-calls" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "martha:john11-27-spoken",
        "mary:seated-at-house",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["martha"],
        verseKeys: ["john11:27"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "martha-calls",
    order: 12,
    verseKeys: ["john11:28"],
    trigger: { kind: "automatic" },
    prerequisite: { kind: "beat-completed", beatId: "martha-confession" },
    supportedActions: [
      scriptureAction(
        "martha",
        "go",
        ["john11:28"],
        "马大回去暗暗地叫她妹子马利亚。",
      ),
      scriptureAction(
        "martha",
        "call",
        ["john11:28"],
        "马大暗暗地叫马利亚，说：“夫子来了，叫你。”",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "mary-rises" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "martha:beside-mary",
        "martha:john11-28-spoken",
        "mary:not-yet-risen",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["martha"],
        verseKeys: ["john11:28"],
        kind: "spoken-scripture",
        exactExcerpt: "夫子来了，叫你。",
      },
    ],
  },
  {
    id: "mary-rises",
    order: 13,
    verseKeys: ["john11:29", "john11:30", "john11:31"],
    trigger: { kind: "recall-question" },
    prerequisite: { kind: "beat-completed", beatId: "martha-calls" },
    supportedActions: [
      scriptureAction(
        "mary",
        "rise",
        ["john11:29"],
        "马利亚听见了，就急忙起来，到耶稣那里去。",
      ),
      scriptureAction(
        "jews-group",
        "follow",
        ["john11:31"],
        "安慰马利亚的犹太人看见她出去，就跟着她。",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "mary-response",
      concealedVerseKeys: ["john11:29", "john11:31"],
    },
    handoff: { mode: "automatic", nextBeatId: "mary-at-feet" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "mary:at-jesus-meeting-place",
        "comforting-jews:followed-mary",
        "jesus:outside-village",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["mary"],
        verseKeys: ["john11:29"],
        kind: "scripture-narration",
        exactExcerpt: "马利亚听见了，就急忙起来",
      },
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:31"],
        kind: "scripture-narration",
      },
    ],
  },
  {
    id: "mary-at-feet",
    order: 14,
    verseKeys: ["john11:32", "john11:33"],
    trigger: { kind: "interaction", actorIds: ["mary"] },
    prerequisite: { kind: "beat-completed", beatId: "mary-rises" },
    supportedActions: [
      scriptureAction(
        "mary",
        "fall-at-feet",
        ["john11:32"],
        "马利亚俯伏在耶稣脚前，说约翰福音 11:32 的原话。",
      ),
      scriptureAction(
        "mary",
        "weep",
        ["john11:33"],
        "耶稣看见马利亚哭。",
      ),
      scriptureAction(
        "jews-group",
        "weep",
        ["john11:33"],
        "与马利亚同来的犹太人也哭。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "jesus-weeps" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "mary:at-jesus-feet",
        "mary-and-jews:weeping",
        "jesus:grieved-and-troubled",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["mary"],
        verseKeys: ["john11:32"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "jesus-weeps",
    order: 15,
    verseKeys: ["john11:34", "john11:35", "john11:36", "john11:37"],
    trigger: { kind: "interaction", actorIds: ["jesus"] },
    prerequisite: { kind: "beat-completed", beatId: "mary-at-feet" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "speak",
        ["john11:34"],
        "耶稣问：“你们把他安放在哪里？”",
      ),
      scriptureAction(
        "jews-group",
        "speak",
        ["john11:34"],
        "众人共同回答：“请主来看。”",
      ),
      scriptureAction(
        "jesus",
        "weep",
        ["john11:35"],
        "耶稣哭了。",
      ),
      scriptureAction(
        "jews-group",
        "speak",
        ["john11:36", "john11:37"],
        "经文只记为犹太人和其中有人说约翰福音 11:36–37。",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "crowd-response",
      concealedVerseKeys: ["john11:34"],
    },
    handoff: { mode: "automatic", nextBeatId: "come-and-see" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "crowd:john11-34-response-revealed",
        "jesus:wept",
        "jews:john11-36-37-spoken-as-group",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:34", "john11:35"],
        kind: "spoken-scripture",
      },
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:34"],
        kind: "spoken-scripture",
        exactExcerpt: "请主来看。",
      },
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:36", "john11:37"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "come-and-see",
    order: 16,
    verseKeys: ["john11:34", "john11:38"],
    trigger: { kind: "automatic" },
    prerequisite: { kind: "beat-completed", beatId: "jesus-weeps" },
    supportedActions: [
      scriptureAction(
        "jews-group",
        "lead-as-group",
        ["john11:34", "john11:38"],
        "多位犹太人共同在前，耶稣与众人前往坟墓。",
      ),
      scriptureAction(
        "jesus",
        "travel",
        ["john11:38"],
        "耶稣来到坟墓前。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "tomb-arrival" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "jews:leading-as-plural-group",
        "unique-guide:none",
        "group:travelling-to-tomb",
      ],
      playerControl: "sequence",
    },
    echoGrants: [],
  },
  {
    id: "tomb-arrival",
    order: 17,
    verseKeys: ["john11:38"],
    trigger: { kind: "arrival" },
    prerequisite: { kind: "beat-completed", beatId: "come-and-see" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "arrive",
        ["john11:38"],
        "耶稣来到坟墓前。",
      ),
      scriptureAction(
        "crowd-group",
        "face-tomb",
        ["john11:38"],
        "众人在坟墓前站定；不设立独有带路身份。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "manual", nextBeatId: "stone-dialogue" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "group:at-tomb",
        "tomb:洞",
        "stone:blocking-tomb",
        "lazarus:not-visible",
      ],
      playerControl: "enabled",
    },
    echoGrants: [],
  },
  {
    id: "stone-dialogue",
    order: 18,
    verseKeys: ["john11:39", "john11:40"],
    trigger: { kind: "interaction", actorIds: ["jesus", "martha"] },
    prerequisite: { kind: "beat-completed", beatId: "tomb-arrival" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "speak",
        ["john11:39", "john11:40"],
        "耶稣吩咐挪开石头，并按约翰福音 11:40 回答马大。",
      ),
      scriptureAction(
        "martha",
        "speak",
        ["john11:39"],
        "马大按约翰福音 11:39 回答。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "stone-and-prayer" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "jesus:ordered-stone-removal",
        "martha:john11-39-spoken",
        "stone:not-yet-moved",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:39", "john11:40"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "stone-and-prayer",
    order: 19,
    verseKeys: ["john11:41", "john11:42"],
    trigger: { kind: "automatic" },
    prerequisite: { kind: "beat-completed", beatId: "stone-dialogue" },
    supportedActions: [
      scriptureAction(
        "jews-group",
        "move-stone",
        ["john11:41"],
        "无名犹太人以组合动作挪开石头，不指定某个个人。",
      ),
      scriptureAction(
        "jesus",
        "look-up",
        ["john11:41", "john11:42"],
        "耶稣举目望天，按约翰福音 11:41–42 祷告。",
      ),
      scriptureAction(
        "jesus",
        "speak",
        ["john11:41", "john11:42"],
        "耶稣完整说出约翰福音 11:41–42 的祷告。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "call-and-emergence" },
    finalState: {
      actors: { visibleActorIds: BETHANY_ACTORS },
      stateFacts: [
        "stone:moved-by-unnamed-group",
        "jesus:john11-41-42-prayer-complete",
        "lazarus:not-visible",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:41", "john11:42"],
        kind: "spoken-scripture",
      },
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:41"],
        kind: "scripture-narration",
      },
    ],
  },
  {
    id: "call-and-emergence",
    order: 20,
    verseKeys: ["john11:43", "john11:44"],
    trigger: { kind: "automatic" },
    prerequisite: { kind: "beat-completed", beatId: "stone-and-prayer" },
    supportedActions: [
      scriptureAction(
        "jesus",
        "speak",
        ["john11:43"],
        "耶稣大声呼叫：“拉撒路出来！”",
      ),
      scriptureAction(
        "lazarus",
        "emerge-wrapped",
        ["john11:44"],
        "拉撒路手脚裹着布、脸上包着手巾出来。",
      ),
      scriptureAction(
        "crowd-group",
        "unbind",
        ["john11:44"],
        "众人照耶稣的话解开拉撒路，叫他走。",
      ),
    ],
    recallBeforeReveal: noRecall,
    handoff: { mode: "automatic", nextBeatId: "responses" },
    finalState: {
      actors: { visibleActorIds: RESTORED_ACTORS },
      stateFacts: [
        "lazarus:visible-wrapped-then-unbound",
        "lazarus:label-visible",
        "lazarus:has-no-dialogue",
        "miracle-sequence:automatic",
      ],
      playerControl: "sequence",
    },
    echoGrants: [
      {
        actorIds: ["jesus"],
        verseKeys: ["john11:43", "john11:44"],
        kind: "spoken-scripture",
      },
    ],
  },
  {
    id: "responses",
    order: 21,
    verseKeys: ["john11:45", "john11:46"],
    trigger: { kind: "recall-question" },
    prerequisite: { kind: "beat-completed", beatId: "call-and-emergence" },
    supportedActions: [
      scriptureAction(
        "jews-group",
        "believe",
        ["john11:45"],
        "来看马利亚的犹太人中，多有信耶稣的。",
      ),
      scriptureAction(
        "jews-group",
        "leave-and-report",
        ["john11:46"],
        "其中也有人去见法利赛人，将耶稣所做的事告诉他们。",
      ),
    ],
    recallBeforeReveal: {
      kind: "required",
      questionId: "aftermath",
      concealedVerseKeys: ["john11:45", "john11:46"],
    },
    handoff: { mode: "manual", nextBeatId: null },
    finalState: {
      actors: { visibleActorIds: RESTORED_ACTORS },
      stateFacts: [
        "jews:plural-responses",
        "some-jews:believed",
        "some-jews:left-to-report",
        "sisters:no-invented-embrace",
        "story:complete",
      ],
      playerControl: "enabled",
    },
    echoGrants: [
      {
        actorIds: ["mourner", "mourner-woman", "guide", "older-witness"],
        verseKeys: ["john11:45", "john11:46"],
        kind: "scripture-narration",
      },
    ],
  },
] as const;

export const VERSE_BEAT_BY_ID: Readonly<Record<VerseBeatId, VerseBeat>> =
  Object.fromEntries(VERSE_BEATS.map((beat) => [beat.id, beat])) as Record<
    VerseBeatId,
    VerseBeat
  >;

export const getActorVisibility = (
  beatId: VerseBeatId,
  actorId: ActorId,
): "visible" | "hidden" => {
  const beat = VERSE_BEAT_BY_ID[beatId];
  const actors = beat.duringBeatActors ?? beat.finalState.actors;
  return actors.visibleActorIds.includes(actorId) ? "visible" : "hidden";
};

export const getFinalActorVisibility = (
  beatId: VerseBeatId,
  actorId: ActorId,
): "visible" | "hidden" =>
  VERSE_BEAT_BY_ID[beatId].finalState.actors.visibleActorIds.includes(actorId)
    ? "visible"
    : "hidden";

export const getActorLabel = (
  beatId: VerseBeatId,
  actorId: ActorId,
): string | null => {
  if (getActorVisibility(beatId, actorId) === "hidden") {
    return null;
  }
  const beat = VERSE_BEAT_BY_ID[beatId];
  const actors = beat.duringBeatActors ?? beat.finalState.actors;
  const override = actors.labelOverrides?.[actorId];
  return override === undefined ? ACTOR_LABELS[actorId] : override;
};

export const getFinalActorLabel = (
  beatId: VerseBeatId,
  actorId: ActorId,
): string | null => {
  if (getFinalActorVisibility(beatId, actorId) === "hidden") {
    return null;
  }
  const override =
    VERSE_BEAT_BY_ID[beatId].finalState.actors.labelOverrides?.[actorId];
  return override === undefined ? ACTOR_LABELS[actorId] : override;
};

export const getHiddenActorIds = (beatId: VerseBeatId): readonly ActorId[] =>
  ACTOR_IDS.filter((actorId) => getActorVisibility(beatId, actorId) === "hidden");
