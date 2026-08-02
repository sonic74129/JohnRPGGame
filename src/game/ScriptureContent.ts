export const SCRIPTURE_TRANSLATION = {
  id: "cuv-simplified-prototype",
  name: "和合本简体",
  note: "和合本简体原型文本 · 正式使用前须逐字审核",
} as const;

export const JOHN_11_VERSE_KEYS = [
  "john11:1",
  "john11:2",
  "john11:3",
  "john11:4",
  "john11:5",
  "john11:6",
  "john11:7",
  "john11:8",
  "john11:9",
  "john11:10",
  "john11:11",
  "john11:12",
  "john11:13",
  "john11:14",
  "john11:15",
  "john11:16",
  "john11:17",
  "john11:18",
  "john11:19",
  "john11:20",
  "john11:21",
  "john11:22",
  "john11:23",
  "john11:24",
  "john11:25",
  "john11:26",
  "john11:27",
  "john11:28",
  "john11:29",
  "john11:30",
  "john11:31",
  "john11:32",
  "john11:33",
  "john11:34",
  "john11:35",
  "john11:36",
  "john11:37",
  "john11:38",
  "john11:39",
  "john11:40",
  "john11:41",
  "john11:42",
  "john11:43",
  "john11:44",
  "john11:45",
  "john11:46",
] as const;

export type John11VerseKey = (typeof JOHN_11_VERSE_KEYS)[number];

export interface ScriptureVerse {
  readonly key: John11VerseKey;
  readonly book: "约翰福音";
  readonly chapter: 11;
  readonly verse: number;
  readonly reference: string;
  readonly translationId: typeof SCRIPTURE_TRANSLATION.id;
  readonly textKind: "original-verse";
  readonly text: string;
}

const john11Verse = (
  key: John11VerseKey,
  verse: number,
  text: string,
): ScriptureVerse => ({
  key,
  book: "约翰福音",
  chapter: 11,
  verse,
  reference: `约翰福音 11:${verse}`,
  translationId: SCRIPTURE_TRANSLATION.id,
  textKind: "original-verse",
  text,
});

export const JOHN_11_VERSES: Readonly<Record<John11VerseKey, ScriptureVerse>> = {
  "john11:1": john11Verse(
    "john11:1",
    1,
    "有一个患病的人，名叫拉撒路，住在伯大尼，就是马利亚和她姐姐马大的村庄。",
  ),
  "john11:2": john11Verse(
    "john11:2",
    2,
    "这马利亚就是那用香膏抹主，又用头发擦他脚的；患病的拉撒路是她的兄弟。",
  ),
  "john11:3": john11Verse(
    "john11:3",
    3,
    "他姐妹两个就打发人去见耶稣，说：“主啊，你所爱的人病了。”",
  ),
  "john11:4": john11Verse(
    "john11:4",
    4,
    "耶稣听见，就说：“这病不至于死，乃是为神的荣耀，叫神的儿子因此得荣耀。”",
  ),
  "john11:5": john11Verse(
    "john11:5",
    5,
    "耶稣素来爱马大和她妹子并拉撒路。",
  ),
  "john11:6": john11Verse(
    "john11:6",
    6,
    "听见拉撒路病了，就在所居之地仍住了两天。",
  ),
  "john11:7": john11Verse(
    "john11:7",
    7,
    "然后对门徒说：“我们再往犹太去吧。”",
  ),
  "john11:8": john11Verse(
    "john11:8",
    8,
    "门徒说：“拉比，犹太人近来要拿石头打你，你还往那里去吗？”",
  ),
  "john11:9": john11Verse(
    "john11:9",
    9,
    "耶稣回答说：“白日不是有十二小时吗？人在白日走路，就不至跌倒，因为看见这世上的光。",
  ),
  "john11:10": john11Verse(
    "john11:10",
    10,
    "若在黑夜走路，就必跌倒，因为他没有光。”",
  ),
  "john11:11": john11Verse(
    "john11:11",
    11,
    "耶稣说了这话，随后对他们说：“我们的朋友拉撒路睡了，我去叫醒他。”",
  ),
  "john11:12": john11Verse(
    "john11:12",
    12,
    "门徒说：“主啊，他若睡了，就必好了。”",
  ),
  "john11:13": john11Verse(
    "john11:13",
    13,
    "耶稣这话是指着他死说的，他们却以为是说照常睡了。",
  ),
  "john11:14": john11Verse(
    "john11:14",
    14,
    "耶稣就明明地告诉他们说：“拉撒路死了。",
  ),
  "john11:15": john11Verse(
    "john11:15",
    15,
    "我没有在那里就欢喜，这是为你们的缘故，好叫你们相信。如今我们可以往他那里去吧。”",
  ),
  "john11:16": john11Verse(
    "john11:16",
    16,
    "多马，又称为低土马，就对那同作门徒的说：“我们也去和他同死吧。”",
  ),
  "john11:17": john11Verse(
    "john11:17",
    17,
    "耶稣到了，就知道拉撒路在坟墓里已经四天了。",
  ),
  "john11:18": john11Verse(
    "john11:18",
    18,
    "伯大尼离耶路撒冷不远，约有六里路。",
  ),
  "john11:19": john11Verse(
    "john11:19",
    19,
    "有好些犹太人来看马大和马利亚，要为他们的兄弟安慰他们。",
  ),
  "john11:20": john11Verse(
    "john11:20",
    20,
    "马大听见耶稣来了，就出去迎接他；马利亚却仍然坐在家里。",
  ),
  "john11:21": john11Verse(
    "john11:21",
    21,
    "马大对耶稣说：“主啊，你若早在这里，我兄弟必不死。",
  ),
  "john11:22": john11Verse(
    "john11:22",
    22,
    "就是现在，我也知道，你无论向神求什么，神也必赐给你。”",
  ),
  "john11:23": john11Verse(
    "john11:23",
    23,
    "耶稣说：“你兄弟必然复活。”",
  ),
  "john11:24": john11Verse(
    "john11:24",
    24,
    "马大说：“我知道在末日复活的时候，他必复活。”",
  ),
  "john11:25": john11Verse(
    "john11:25",
    25,
    "耶稣对她说：“复活在我，生命也在我。信我的人虽然死了，也必复活；",
  ),
  "john11:26": john11Verse(
    "john11:26",
    26,
    "凡活着信我的人必永远不死。你信这话吗？”",
  ),
  "john11:27": john11Verse(
    "john11:27",
    27,
    "马大说：“主啊，是的，我信你是基督，是神的儿子，就是那要临到世界的。”",
  ),
  "john11:28": john11Verse(
    "john11:28",
    28,
    "马大说了这话，就回去暗暗地叫她妹子马利亚，说：“夫子来了，叫你。”",
  ),
  "john11:29": john11Verse(
    "john11:29",
    29,
    "马利亚听见了，就急忙起来，到耶稣那里去。",
  ),
  "john11:30": john11Verse(
    "john11:30",
    30,
    "那时，耶稣还没有进村子，仍在马大迎接他的地方。",
  ),
  "john11:31": john11Verse(
    "john11:31",
    31,
    "那些同马利亚在家里安慰她的犹太人，见她急忙起来出去，就跟着她，以为她要往坟墓那里去哭。",
  ),
  "john11:32": john11Verse(
    "john11:32",
    32,
    "马利亚到了耶稣那里，看见他，就俯伏在他脚前，说：“主啊，你若早在这里，我兄弟必不死。”",
  ),
  "john11:33": john11Verse(
    "john11:33",
    33,
    "耶稣看见她哭，并看见与她同来的犹太人也哭，就心里悲叹，又甚忧愁，",
  ),
  "john11:34": john11Verse(
    "john11:34",
    34,
    "便说：“你们把他安放在哪里？”他们回答说：“请主来看。”",
  ),
  "john11:35": john11Verse("john11:35", 35, "耶稣哭了。"),
  "john11:36": john11Verse(
    "john11:36",
    36,
    "犹太人就说：“你看他爱这人是何等恳切。”",
  ),
  "john11:37": john11Verse(
    "john11:37",
    37,
    "其中有人说：“他既然开了瞎子的眼睛，岂不能叫这人不死吗？”",
  ),
  "john11:38": john11Verse(
    "john11:38",
    38,
    "耶稣又心里悲叹，来到坟墓前；那坟墓是个洞，有一块石头挡着。",
  ),
  "john11:39": john11Verse(
    "john11:39",
    39,
    "耶稣说：“你们把石头挪开。”那死人的姐姐马大对他说：“主啊，他现在必是臭了，因为他死了已经四天了。”",
  ),
  "john11:40": john11Verse(
    "john11:40",
    40,
    "耶稣说：“我不是对你说过，你若信，就必看见神的荣耀吗？”",
  ),
  "john11:41": john11Verse(
    "john11:41",
    41,
    "他们就把石头挪开。耶稣举目望天，说：“父啊，我感谢你，因为你已经听我。",
  ),
  "john11:42": john11Verse(
    "john11:42",
    42,
    "我也知道你常听我，但我说这话是为周围站着的众人，叫他们信是你差了我来。”",
  ),
  "john11:43": john11Verse(
    "john11:43",
    43,
    "说了这话，就大声呼叫说：“拉撒路出来！”",
  ),
  "john11:44": john11Verse(
    "john11:44",
    44,
    "那死人就出来了，手脚裹着布，脸上包着手巾。耶稣对他们说：“解开，叫他走！”",
  ),
  "john11:45": john11Verse(
    "john11:45",
    45,
    "那些来看马利亚的犹太人见了耶稣所做的事，就多有信他的；",
  ),
  "john11:46": john11Verse(
    "john11:46",
    46,
    "但其中也有去见法利赛人的，将耶稣所做的事告诉他们。",
  ),
};

export const STORY_ACTOR_IDS = [
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

export const MEMORY_CARRIER_IDS = [
  "memory-carrier-bread",
  "memory-carrier-water",
  "memory-carrier-mud",
] as const;

export const ACTOR_IDS = [...STORY_ACTOR_IDS, ...MEMORY_CARRIER_IDS] as const;

export type StoryActorId = (typeof STORY_ACTOR_IDS)[number];
export type MemoryCarrierId = (typeof MEMORY_CARRIER_IDS)[number];
export type ActorId = (typeof ACTOR_IDS)[number];

export const ACTOR_LABELS: Readonly<Record<ActorId, string | null>> = {
  player: null,
  martha: "马大",
  mary: "马利亚",
  jesus: "耶稣",
  thomas: "多马",
  "older-disciple": "门徒",
  "younger-disciple": "门徒",
  mourner: "来安慰的犹太人",
  "mourner-woman": "来安慰的犹太人",
  guide: "犹太人",
  "older-witness": "犹太人",
  lazarus: "拉撒路",
  "memory-carrier-bread": null,
  "memory-carrier-water": null,
  "memory-carrier-mud": null,
};

export type RecallQuestionId =
  | "message"
  | "choose-martha"
  | "martha-resurrection"
  | "mary-response"
  | "crowd-response"
  | "aftermath";

export interface RecallOption {
  readonly id: string;
  readonly text: string;
}

export interface RecallQuestion {
  readonly id: RecallQuestionId;
  readonly kind: "choice" | "spatial-actor-choice";
  readonly prompt: string;
  readonly reference: string;
  readonly correctOption: string;
  readonly options: readonly RecallOption[];
  readonly wrongAnswer: {
    readonly penalty: 5;
    readonly revealCorrectAnswer: false;
    readonly referenceOnlyFeedback: true;
  };
}

const STANDARD_WRONG_ANSWER = {
  penalty: 5,
  revealCorrectAnswer: false,
  referenceOnlyFeedback: true,
} as const;

export const RECALL_QUESTIONS: Readonly<
  Record<RecallQuestionId, RecallQuestion>
> = {
  message: {
    id: "message",
    kind: "choice",
    prompt: "姐妹托付给报信者的原话是什么？",
    reference: "约翰福音 11:3",
    correctOption: "beloved-is-sick",
    options: [
      { id: "come-heal", text: "请你马上来医治拉撒路。" },
      { id: "beloved-is-sick", text: "主啊，你所爱的人病了。" },
      { id: "about-to-die", text: "拉撒路快要死了。" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
  "choose-martha": {
    id: "choose-martha",
    kind: "spatial-actor-choice",
    prompt: "经文中，谁先出去迎接耶稣？",
    reference: "约翰福音 11:20",
    correctOption: "martha",
    options: [
      { id: "martha", text: "马大" },
      { id: "mary", text: "马利亚" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
  "martha-resurrection": {
    id: "martha-resurrection",
    kind: "choice",
    prompt: "马大说拉撒路会在什么时候复活？",
    reference: "约翰福音 11:24",
    correctOption: "last-day",
    options: [
      { id: "immediately", text: "耶稣一到，他就会立刻复活。" },
      { id: "last-day", text: "在末日复活的时候。" },
      { id: "never", text: "她认为拉撒路不会再复活。" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
  "mary-response": {
    id: "mary-response",
    kind: "choice",
    prompt: "马利亚听见以后怎样？",
    reference: "约翰福音 11:29",
    correctOption: "rose-quickly",
    options: [
      { id: "rose-quickly", text: "急忙起来，到耶稣那里去。" },
      { id: "remained-seated", text: "仍然坐在家里。" },
      { id: "went-to-tomb", text: "独自往坟墓那里去。" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
  "crowd-response": {
    id: "crowd-response",
    kind: "choice",
    prompt: "众人怎样回答耶稣？",
    reference: "约翰福音 11:34",
    correctOption: "come-and-see",
    options: [
      { id: "come-and-see", text: "请主来看。" },
      { id: "wait-here", text: "请主在这里等候。" },
      { id: "stone-blocks", text: "有一块石头挡着。" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
  aftermath: {
    id: "aftermath",
    kind: "choice",
    prompt: "经文记载，所有看见这事的人都相信耶稣了吗？",
    reference: "约翰福音 11:45–46",
    correctOption: "different-responses",
    options: [
      { id: "everyone", text: "是，所有人都相信了。" },
      {
        id: "different-responses",
        text: "不是；有人相信，也有人去告诉法利赛人。",
      },
      { id: "no-one", text: "没有人相信。" },
    ],
    wrongAnswer: STANDARD_WRONG_ANSWER,
  },
};

export type FindJesusClueId = "bread-and-fish" | "water" | "mud";

export interface PlayerMemoryExcerpt {
  readonly kind: "player-memory";
  readonly clueId: FindJesusClueId;
  readonly carrierId: MemoryCarrierId;
  readonly references: readonly string[];
  readonly translationId: typeof SCRIPTURE_TRANSLATION.id;
  readonly text: string;
  readonly followUp: {
    readonly kind: "player-thought";
    readonly text: "不是我要找的人。";
  };
}

export const FIND_JESUS_MEMORIES: Readonly<
  Record<FindJesusClueId, PlayerMemoryExcerpt>
> = {
  "bread-and-fish": {
    kind: "player-memory",
    clueId: "bread-and-fish",
    carrierId: "memory-carrier-bread",
    references: ["约翰福音 6:9"],
    translationId: SCRIPTURE_TRANSLATION.id,
    text: "在这里有一个孩童，带着五个大麦饼、两条鱼，只是分给这许多人还算什么呢？",
    followUp: { kind: "player-thought", text: "不是我要找的人。" },
  },
  water: {
    kind: "player-memory",
    clueId: "water",
    carrierId: "memory-carrier-water",
    references: ["约翰福音 2:7", "约翰福音 2:8", "约翰福音 2:9"],
    translationId: SCRIPTURE_TRANSLATION.id,
    text: "耶稣对用人说：“把缸倒满了水。”他们就倒满了，直到缸口。耶稣又说：“现在可以舀出来，送给管筵席的。”他们就送了去。管筵席的尝了那水变的酒，并不知道是哪里来的，只有舀水的用人知道。",
    followUp: { kind: "player-thought", text: "不是我要找的人。" },
  },
  mud: {
    kind: "player-memory",
    clueId: "mud",
    carrierId: "memory-carrier-mud",
    references: ["约翰福音 9:6", "约翰福音 9:7"],
    translationId: SCRIPTURE_TRANSLATION.id,
    text: "耶稣说了这话，就吐唾沫在地上，用唾沫和泥抹在瞎子的眼睛上，对他说：“你往西罗亚池子里去洗。”（西罗亚翻出来就是“奉差遣”。）他去一洗，回头就看见了。",
    followUp: { kind: "player-thought", text: "不是我要找的人。" },
  },
};

export const FIND_JESUS_CONTRACT = {
  kind: "player-memory-bridge",
  chronology: "outside-john-11",
  temporaryLabel: "陌生旅人",
  disguisedActorIds: ["jesus", ...MEMORY_CARRIER_IDS],
  normallyLabeledActorIds: [
    "thomas",
    "older-disciple",
    "younger-disciple",
  ],
  clueCarrierIds: MEMORY_CARRIER_IDS,
  clueIds: ["bread-and-fish", "water", "mud"],
  wrongSelectionPenalty: 0,
  requireAllClues: false,
  correctActorId: "jesus",
  correctSelection: {
    revealLabel: "耶稣",
    removeActorIds: MEMORY_CARRIER_IDS,
    beforeBeatId: "message",
  },
} as const;
