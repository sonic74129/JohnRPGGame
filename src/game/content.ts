import type {
  ChoiceQuestion,
  DialogueLine,
  Objective,
  StoryStage,
} from "./types";

export const PROTOTYPE_TRANSLATION_NOTE =
  "和合本简体原型文本 · 正式使用前须逐字审核";

export const DIALOGUES: Record<
  | "opening"
  | "messageJourney"
  | "marthaBeforeQuestion"
  | "marthaCore"
  | "marthaReturns"
  | "mary"
  | "tomb"
  | "epilogue",
  readonly DialogueLine[]
> = {
  opening: [
    {
      speaker: "旁白",
      text: "有一个患病的人，名叫拉撒路，住在伯大尼，就是马利亚和她姐姐马大的村庄。",
      reference: "约翰福音 11:1｜和合本",
      kind: "scripture",
      music: "dialogue",
    },
    {
      speaker: "马利亚",
      text: "姐姐……拉撒路还是很虚弱。",
      reference: "根据约翰福音 11:1–3 的情境重现",
      kind: "dramatization",
      portrait: "mary-worried",
    },
    {
      speaker: "马大",
      text: "我们要把消息告诉耶稣。",
      reference: "根据约翰福音 11:3 的情境重现",
      kind: "dramatization",
      portrait: "martha-worried",
    },
    {
      speaker: "旁白",
      text: "他姐妹两个就打发人去见耶稣。",
      reference: "约翰福音 11:3｜和合本",
      kind: "scripture",
    },
    {
      speaker: "游戏提示",
      text: "你们将作为经文没有记名的报信者和见证者。找到耶稣，并准确传达姐妹的口信。",
      kind: "instruction",
      portrait: "messenger",
    },
  ],
  messageJourney: [
    {
      speaker: "报信的人",
      text: "主啊，你所爱的人病了。",
      reference: "约翰福音 11:3｜和合本",
      kind: "scripture",
      portrait: "messenger",
      music: "dialogue",
    },
    {
      speaker: "耶稣",
      text: "这病不至于死，乃是为神的荣耀，叫神的儿子因此得荣耀。",
      reference: "约翰福音 11:4｜和合本",
      kind: "scripture",
      portrait: "jesus-listening",
    },
    {
      speaker: "旁白",
      text: "耶稣素来爱马大和她妹子并拉撒路。听见拉撒路病了，就在所居之地仍住了两天。",
      reference: "约翰福音 11:5–6",
      kind: "narration",
    },
    {
      speaker: "时间推移",
      text: "两天后",
      reference: "约翰福音 11:6–7",
      kind: "instruction",
      pauseMs: 1600,
      music: "silence",
    },
    {
      speaker: "耶稣",
      text: "我们再往犹太去吧。",
      reference: "约翰福音 11:7｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
      music: "dialogue",
    },
    {
      speaker: "门徒",
      text: "拉比，犹太人近来要拿石头打你，你还往那里去么？",
      reference: "约翰福音 11:8｜和合本",
      kind: "scripture",
      portrait: "witness",
    },
    {
      speaker: "耶稣",
      text: "拉撒路死了。我没有在那里就欢喜，这是为你们的缘故，好叫你们相信。如今我们可以往他那里去吧。",
      reference: "约翰福音 11:14–15｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
    },
    {
      speaker: "多马",
      text: "我们也去和他同死吧。",
      reference: "约翰福音 11:16｜和合本",
      kind: "scripture",
      portrait: "thomas",
    },
    {
      speaker: "旁白",
      text: "耶稣到了，就知道拉撒路在坟墓里已经四天了。好些犹太人来安慰马大和马利亚。",
      reference: "约翰福音 11:17–19",
      kind: "narration",
    },
  ],
  marthaBeforeQuestion: [
    {
      speaker: "马大",
      text: "主啊，你若早在这里，我兄弟必不死。",
      reference: "约翰福音 11:21｜和合本",
      kind: "scripture",
      portrait: "martha-grieving",
      music: "dialogue",
    },
    {
      speaker: "马大",
      text: "就是现在，我也知道，你无论向神求什么，神也必赐给你。",
      reference: "约翰福音 11:22｜和合本",
      kind: "scripture",
      portrait: "martha-grieving",
    },
    {
      speaker: "耶稣",
      text: "你兄弟必然复活。",
      reference: "约翰福音 11:23｜和合本",
      kind: "scripture",
      portrait: "jesus-listening",
    },
    {
      speaker: "马大",
      text: "我知道在末日复活的时候，他必复活。",
      reference: "约翰福音 11:24｜和合本",
      kind: "scripture",
      portrait: "martha-faith",
    },
  ],
  marthaCore: [
    {
      speaker: "耶稣",
      text: "复活在我，生命也在我。信我的人虽然死了，也必复活；",
      reference: "约翰福音 11:25｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
      music: "revelation",
    },
    {
      speaker: "耶稣",
      text: "凡活着信我的人必永远不死。你信这话么？",
      reference: "约翰福音 11:26｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
    },
    {
      speaker: "马大",
      text: "主啊，是的，我信你是基督，是神的儿子，就是那要临到世界的。",
      reference: "约翰福音 11:27｜和合本",
      kind: "scripture",
      portrait: "martha-faith",
    },
  ],
  marthaReturns: [
    {
      speaker: "旁白",
      text: "马大说了这话，就回去暗暗地叫她妹子马利亚。",
      reference: "约翰福音 11:28",
      kind: "narration",
      music: "dialogue",
    },
    {
      speaker: "马大",
      text: "夫子来了，叫你。",
      reference: "约翰福音 11:28｜和合本",
      kind: "scripture",
      portrait: "martha-faith",
    },
    {
      speaker: "旁白",
      text: "马利亚听见了，就急忙起来，到耶稣那里去。",
      reference: "约翰福音 11:29",
      kind: "narration",
      portrait: "mary-urgent",
    },
  ],
  mary: [
    {
      speaker: "马利亚",
      text: "主啊，你若早在这里，我兄弟必不死。",
      reference: "约翰福音 11:32｜和合本",
      kind: "scripture",
      portrait: "mary-grieving",
      music: "dialogue",
    },
    {
      speaker: "旁白",
      text: "耶稣看见她哭，并看见与她同来的犹太人也哭，就心里悲叹，又甚忧愁。",
      reference: "约翰福音 11:33",
      kind: "narration",
    },
    {
      speaker: "耶稣",
      text: "你们把他安放在哪里？",
      reference: "约翰福音 11:34｜和合本",
      kind: "scripture",
      portrait: "jesus-weeping",
    },
    {
      speaker: "众人",
      text: "请主来看。",
      reference: "约翰福音 11:34｜和合本",
      kind: "scripture",
      portrait: "witness",
      music: "dialogue",
    },
    {
      speaker: "旁白",
      text: "耶稣哭了。",
      reference: "约翰福音 11:35｜和合本",
      kind: "scripture",
      portrait: "jesus-weeping",
      pauseMs: 3000,
      music: "silence",
    },
    {
      speaker: "一位犹太人",
      text: "你看他爱这人是何等恳切。",
      reference: "约翰福音 11:36｜和合本",
      kind: "scripture",
      portrait: "witness",
      music: "dialogue",
    },
    {
      speaker: "另一位犹太人",
      text: "他既然开了瞎子的眼睛，岂不能叫这人不死么？",
      reference: "约翰福音 11:37｜和合本",
      kind: "scripture",
      portrait: "witness",
    },
  ],
  tomb: [
    {
      speaker: "旁白",
      text: "耶稣来到坟墓前。那坟墓是个洞，有一块石头挡着。",
      reference: "约翰福音 11:38",
      kind: "narration",
      music: "dialogue",
    },
    {
      speaker: "耶稣",
      text: "你们把石头挪开。",
      reference: "约翰福音 11:39｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
    },
    {
      speaker: "马大",
      text: "主啊，他现在必是臭了，因为他死了已经四天了。",
      reference: "约翰福音 11:39｜和合本",
      kind: "scripture",
      portrait: "martha-grieving",
      music: "silence",
    },
    {
      speaker: "耶稣",
      text: "我不是对你说过，你若信，就必看见神的荣耀么？",
      reference: "约翰福音 11:40｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
      music: "dialogue",
    },
    {
      speaker: "旁白",
      text: "他们就把石头挪开。耶稣举目望天祷告。",
      reference: "约翰福音 11:41–42",
      kind: "narration",
      music: "revelation",
    },
    {
      speaker: "耶稣",
      text: "拉撒路出来！",
      reference: "约翰福音 11:43｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
      music: "silence",
    },
    {
      speaker: "旁白",
      text: "那死人就出来了，手脚裹着布，脸上包着手巾。",
      reference: "约翰福音 11:44",
      kind: "narration",
      music: "revelation",
    },
    {
      speaker: "耶稣",
      text: "解开，叫他走！",
      reference: "约翰福音 11:44｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
    },
  ],
  epilogue: [
    {
      speaker: "旁白",
      text: "那些来看马利亚的犹太人见了耶稣所做的事，就多有信他的。",
      reference: "约翰福音 11:45",
      kind: "narration",
      music: "revelation",
    },
    {
      speaker: "旁白",
      text: "但其中也有去见法利赛人的，将耶稣所做的事告诉他们。",
      reference: "约翰福音 11:46｜和合本",
      kind: "scripture",
      portrait: "witness",
      music: "dialogue",
    },
    {
      speaker: "小组回顾",
      text: "拉撒路真的死了；马大相信末日的复活；耶稣把焦点指向自己是谁。",
      kind: "instruction",
      music: "revelation",
    },
    {
      speaker: "耶稣",
      text: "复活在我，生命也在我……你信这话么？",
      reference: "约翰福音 11:25–26｜和合本",
      kind: "scripture",
      portrait: "jesus-declaration",
    },
  ],
};

export const QUESTIONS: Record<
  "message" | "marthaResurrection" | "aftermath",
  ChoiceQuestion
> = {
  message: {
    id: "message",
    prompt: "姐妹托付给报信者的原话是什么？",
    reference: "约翰福音 11:3",
    correctOption: "belovedIsSick",
    options: [
      { id: "comeHeal", text: "请你马上来医治拉撒路。" },
      { id: "belovedIsSick", text: "主啊，你所爱的人病了。" },
      { id: "aboutToDie", text: "拉撒路快要死了。" },
    ],
  },
  marthaResurrection: {
    id: "martha-resurrection",
    prompt: "马大说拉撒路会在什么时候复活？",
    reference: "约翰福音 11:24",
    correctOption: "lastDay",
    options: [
      { id: "immediately", text: "耶稣一到，他就会立刻复活。" },
      { id: "lastDay", text: "在末日复活的时候。" },
      { id: "never", text: "她认为拉撒路不会再复活。" },
    ],
  },
  aftermath: {
    id: "aftermath",
    prompt: "经文记载，所有看见这神迹的人都相信耶稣了吗？",
    reference: "约翰福音 11:45–46",
    correctOption: "differentResponses",
    options: [
      { id: "everyone", text: "是，所有人都相信了。" },
      {
        id: "differentResponses",
        text: "不是；有人相信，也有人去告诉法利赛人。",
      },
      { id: "noOne", text: "没有人相信。" },
    ],
  },
};

export const OBJECTIVES: Record<StoryStage, Objective> = {
  opening: {
    text: "了解拉撒路患病和姐妹差人报信的背景。",
    reference: "约翰福音 11:1–3",
  },
  deliverMessage: {
    text: "沿着道路找到耶稣，把姐妹的口信带给他。",
    reference: "约翰福音 11:3｜从这里开始计分",
  },
  journey: {
    text: "观看耶稣与门徒前往伯大尼。",
    reference: "约翰福音 11:4–19",
  },
  chooseMartha: {
    text: "耶稣来到伯大尼附近。经文中，谁先出去迎接他？",
    reference: "提示：约翰福音 11:20",
  },
  followMartha: {
    text: "跟随马大到村外，再靠近她继续见证。",
    reference: "约翰福音 11:20",
  },
  marthaDialogue: {
    text: "安静阅读马大与耶稣的对话。",
    reference: "约翰福音 11:21–27",
  },
  chooseMary: {
    text: "马大回家传话以后，接下来应该跟随谁？",
    reference: "提示：约翰福音 11:28–29",
  },
  followMary: {
    text: "跟随马利亚和安慰她的人，到耶稣那里。",
    reference: "约翰福音 11:29–31",
  },
  maryDialogue: {
    text: "安静见证马利亚、众人与耶稣的悲伤。",
    reference: "约翰福音 11:32–37",
  },
  chooseGuide: {
    text: "耶稣询问拉撒路安放在哪里。现在应该跟随谁？",
    reference: "提示：约翰福音 11:34、38",
  },
  followGuide: {
    text: "跟随说“请主来看”的人前往坟墓。",
    reference: "约翰福音 11:34、38",
  },
  tomb: {
    text: "安静观看墓前发生的事。玩家不会促成神迹。",
    reference: "约翰福音 11:38–44",
  },
  epilogue: {
    text: "一起回顾所见证的经文事实。",
    reference: "约翰福音 11:45",
  },
  complete: {
    text: "旅程完成。",
    reference: "约翰福音 11:25–26",
  },
};
