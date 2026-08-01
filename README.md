# 伯大尼见证者

一个根据《约翰福音》第 11 章设计的小组经文探索游戏。

## 当前版本

- 拉撒路家、前往耶稣的道路、伯大尼村庄、前往坟墓的道路和坟墓花园五个独立探索区域
- 拉撒路家中的游戏内开场过场，对话结束后在同一房间取得控制
- 区域切换会统一清理背景、碰撞、人物和寻路数据
- 报信者、马大、马利亚和耶稣使用四方向像素步行动画
- 安慰者、带路的人和拉撒路使用独立透明像素精灵
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

## 重新生成美术素材

美术生成脚本使用 Microsoft Foundry 的 MAI Image API 和当前 Azure CLI 的
Entra ID 登录，不读取或保存资源密钥：

```bash
AZURE_SUBSCRIPTION_ID="<subscription-id>" \
AZURE_MAI_ENDPOINT="https://<resource>.services.ai.azure.com" \
AZURE_MAI_DEPLOYMENT="<deployment-name>" \
npm run art:generate
```

提示词位于 `art/prompts.json`，生成结果写入 `public/assets/art/`。脚本会保留
已经存在的文件，只生成缺少的素材。角色与道具源图保存在
`production/art-source/`，可按类别生成和处理：

```bash
ART_CATEGORY=sprite npm run art:generate
ART_CATEGORY=sprite npm run art:process
```

## 返回查经页面

启动游戏时可以传入同源返回地址：

```text
/?return=/bible-study.html%23discussion
```

游戏完成或从主持人菜单离开时，会优先返回该地址。为安全起见，不接受跨域返回地址。