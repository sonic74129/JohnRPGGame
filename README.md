# 伯大尼见证者

一个根据《约翰福音》第 11 章设计的小组经文探索游戏。

## 当前版本

- 拉撒路家室内与一张 2304×1536 的持续伯大尼外部世界
- 拉撒路家中的游戏内开场过场，对话结束后在同一房间取得控制
- 村庄、耶稣来路、墓园道路和坟墓共用同一套背景、碰撞、人物与寻路状态
- 外部世界使用无重复格纹的混合地表、颗粒道路和统一门洞比例的建筑、人物与环境道具
- 报信者、马大、马利亚和耶稣使用四方向像素步行动画
- 安慰者、带路的人和拉撒路使用独立透明像素精灵
- 墓园入口使用可移动的独立圆石道具，神迹演出不依赖背景烘焙
- MAI-Image-2.5-Pro 生成的像素场景和半写实对话肖像
- 键盘上下左右移动
- 鼠标点击地面自动寻路
- 点击 NPC 自动靠近并互动
- 对话、过场和主持人菜单期间锁定玩家输入
- 序章先作为无名报信者寻找耶稣并传达约翰福音 11:3 的口信
- 从第一条口信开始计算经文观察分
- 经文原句、经文叙述、情境重现与游戏提示使用不同标签
- 包含耶稣停留两天、返回犹太的危险、耶稣哭了及神迹后不同回应
- 按和合本事件顺序寻找马大、马利亚和带路的人
- 明确选择错误时扣除经文观察分
- 普通探索和可选 NPC 对话不扣分
- 墓前事件为不可操控演出
- 三首主题音乐按探索、对话、启示状态交叉淡化，并在关键经文前主动留白
- 右上角可随时开启或关闭音乐
- 支持全屏、暂停、重开和同源返回地址

当前经文为简体和合本原型文本，正式聚会使用前必须由教会指定审核者逐字核对。

## 本地运行

```bash
npm install
npm run dev
```

## 验证与构建

```bash
npm test
npm run build
```

构建输出位于 `dist/`，不依赖运行时网络连接。

## 叙事音乐

- **Morning in the Pixel Village**：村庄、道路与寻找人物等探索段落
- **Between the Lines**：人物对话、经文观察题与剧情推进
- **The Quiet Before Dawn**：核心宣告、神迹与结尾反思

Theme 1 与 Theme 2 使用处理后的循环版本；Theme 3 不循环。游戏会在
“耶稣哭了”、“拉撒路出来”等关键时刻淡出至静默，再平顺进入下一段音乐。
浏览器会在玩家点击“开始见证旅程”后解锁音频播放。

游戏使用文件位于 `public/assets/audio/`，原始母带保存在
`production/audio-source/`，不会复制到发布包。

## 美术 Prompt Registry

美术提示词已迁移到 `art/prompts/` 的分文件 v1 registry：

- `style.json`：固定后端、通用前缀、家族 prompt、比例契约、退休计划和迭代规则。
- `masters.json`：室内、伯大尼连续外部世界和墓园美术母版。
- `environment-interior.json` / `environment-outdoor.json`：运行时环境源资产。
- `characters-core.json` / `characters-supporting.json`：角色与地图特殊动作源资产。
- `portraits.json`：与地图身份一致的对话肖像。

后端固定为 Azure AI Foundry 的 `mai-image-2-5-pro` 部署、
`MAI-Image-2.5-Pro@2026-06-19`，并使用 Azure CLI / Entra ID；不得切换到
其他图像模型或保存资源密钥。`art/prompts.json` 仅是退休标记，不能再发送给
图像后端。生成脚本已迁移到新 registry，并且一次只接受一个 family。先用 dry-run 检查
选择、候选数和版本化路径：

```bash
npm run art:generate -- --family master --asset master.house-interior --dry-run
```

首次运行、故障恢复和明确重生成分别使用：

```bash
npm run art:generate -- --family master --asset master.house-interior --mode start
npm run art:generate -- --family master --asset master.house-interior --mode resume
npm run art:generate -- --family master --asset master.house-interior --mode regenerate
```

`start` 在已有 run 时会失败；`resume` 只信任 manifest 状态，发现未记录的旧文件会
失败；`regenerate` 新建 `run-NNN`，不会覆盖历史。已有批准结果时必须先提升
`promptVersion`，不能在同一版本上重画。选定候选需要给出理由：

```bash
npm run art:generate -- --family master --asset master.house-interior \
  --select 2 --reason "Best approved scale and material match."
```

候选、manifest、压缩 review sheet、选定源图和运行时输出分别位于：

- `production/art-pipeline/candidates/<family>/<asset>/<promptVersion>/run-NNN/`
- `production/art-pipeline/manifests/<family>/<asset>/<promptVersion>/`
- `production/art-pipeline/review/<family>/<asset>/<promptVersion>/`
- `production/art-source/<family>/<asset>/<promptVersion>/`
- `public/assets/art/<family>/<asset>/<promptVersion>/run-NNN/`

原始候选和选定源图只通过文件路径交接，不应内联到消息。review contact sheet 最长边
为 1600 px，目标不超过 900 KB。处理前可只检查 family profile 或 manifest plan，
不会打开图片：

```bash
npm run art:process -- --family portrait --describe
npm run art:process -- --family portrait --asset portrait.messenger \
  --manifest production/art-pipeline/manifests/portrait/portrait__messenger/v1/run-001.manifest.json \
  --mode runtime --plan
```

正式处理去掉 `--plan`。非像素素材默认使用 `lanczos`；只有明确的像素资产才传
`--resampling nearest`。review sheet 使用 `--mode review`。旧的无参数
`ART_CATEGORY=sprite|prop|world npm run art:process` 入口仍保留兼容。

每个 registry 项都包含稳定 ID、用途、运行时标记、模型、尺寸、prompt 版本、
完整可直接发送的 prompt、机器与人工验收、2–3 个候选限制、依赖和输出类型。
`v1` 是预写基线；任何 `v2+` 评审一次只能修正一个已观察缺陷，并必须明确
`Revision target`、`Change only`、`Keep unchanged` 和可测量的 `Acceptance`。
旧剧情插画、全屏静态过场和独立道路/村庄/墓园背景已退休；剧情只在可玩地图中
通过走位、动作和对话窗口呈现。

## 返回查经页面

启动游戏时可以传入同源返回地址：

```text
/?return=/bible-study.html%23discussion
```

游戏完成或从主持人菜单离开时，会优先返回该地址。为安全起见，不接受跨域返回地址。