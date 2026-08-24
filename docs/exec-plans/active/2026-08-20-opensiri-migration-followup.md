# openSiri 迁移后续实现路径

**背景：** Easydict 客户端已迁入 opensiri 仓库根目录，品牌名、目录名、Xcode
标识符、Bundle ID 与图标均已替换。本文列出让这套代码真正成为「openSiri」所需的
后续工作，按依赖顺序分为四个阶段。

**当前状态：** 代码可打开、静态引用自洽，但**尚未编译验证过**，且第三方凭据
已被清空为占位值，release 构建暂不可用。

---

## 阶段 0 — 让它跑起来（阻塞后续一切）

优先级最高，全部是一次性动作。

### 0.1 首次构建验证

```bash
pod install && open OpenSiri.xcworkspace
```

`pod install` 是必需的：`Podfile` 的 target 已从 `Easydict` 改名为 `OpenSiri`，
`Podfile.lock` 里的 `PODFILE CHECKSUM` 已过期（`Podfile.lock` 与
`Pods/Manifest.lock` 二者一致，构建期的 Check Pods Manifest 阶段能过，但校验和
需要重新生成）。

随后跑一次完整构建，这是检验 111 处 pbxproj 改名是否有遗漏的唯一可靠手段：

```bash
xcodebuild -workspace OpenSiri.xcworkspace -scheme OpenSiri -configuration Debug build
```

**图标已单独验证过：** `OpenSiri-26.icon` 与整个 `Assets.xcassets` 已用 `actool`
独立编译通过（产出 `Assets.car` + `OpenSiri-26.icns`，无 error 无 warning），
构建时不会再卡在图标环节。它当前是单图层结构，三种系统外观不自适应，
细化方式见[图标清单](../../design-docs/opensiri-icon-inventory.md)。

### 0.2 填入你自己的凭据

迁移时清空了上游作者 tisfeng 的全部凭据——沿用会消耗他的付费配额、把 openSiri
用户的崩溃数据发到他的账号。逐项补齐：

| 位置 | 原值 | 需要做什么 |
| --- | --- | --- |
| `OpenSiri.xcconfig` | `DEVELOPMENT_TEAM = 45Z6V4YD5U` | 填你自己的 Apple Developer Team ID |
| `OpenSiri/Swift/Feature/DefaultAPIKeys/EncryptedSecretKeys.plist` | 上游共享的 Caiyun / Niutrans / 内置 AI Key + Sentry DSN | 已清空为空 dict。要么申请自己的 Key 并用 `String+Encrypt.swift` 的 AES 加密后填入，要么保持为空——为空时用户必须自行配置服务，功能不受损 |
| `OpenSiri/App/GoogleService-Info.plist` | 上游 Firebase 项目 `easydict-7232d` | 已替换为占位。建议**直接移除 Firebase Analytics 依赖**——openSiri 的产品方向不依赖它，比申请新项目更干净 |
| `OpenSiri/App/Info.plist` 的 `SUPublicEDKey` | 上游 Sparkle 公钥 | 用 Sparkle 的 `generate_keys` 生成自己的 EdDSA 密钥对并替换。当前公钥对应的私钥你没有，**无法签名任何更新包** |

`appcast.xml` 已重置为空 channel，`SUFeedURL` 已指向
`raw.githubusercontent.com/TobeBetterV/opensiri/main/appcast.xml`。

### 0.3 决定品牌名的大小写呈现

代码标识符统一是 `OpenSiri`（符合 Swift/Xcode 惯例，不建议改），但官网和 readme
的品牌写法是 **`openSiri`**（小写 o）。目前**用户可见文案里有 10 个 key、
56 条本地化值写作 `OpenSiri`**，与官网不一致。

要统一成 `openSiri`，需要动三处：

- `OpenSiri/App/Localizable.xcstrings` 与 `InfoPlist.xcstrings` 里的可见文案
- `Info.plist` / `Info-debug.plist` 的 `CFBundleDisplayName`（当前是
  `$(TARGET_NAME)` → 显示为 `OpenSiri`），需改为字面量 `openSiri`
- 产物名 `PRODUCT_NAME`（影响 `.app` 文件名与 Sparkle 包名）

**这是一个纯品牌决策**，我没有替你做。小写开头的 macOS 应用名不常见但合法。

---

## 阶段 1 — 清理继承来的上游痕迹

可与阶段 2 并行，不阻塞功能开发。

### 1.1 用户可见的上游链接

代码里指向上游 issue / PR / wiki 的引用链接**已刻意保留**——它们是解释代码为何
这么写的历史依据，改了就是死链。但下面这些是**给用户点的**，fork 后语义已经错了：

- `OpenSiri/App/EZConst.h` 的 `EZGithubRepoOpenSiri` / `EZGithubRepoOpenSiriURL`
  已指向 `TobeBetterV/opensiri`，检查检查更新、反馈入口是否符合预期
- 「常见问题」等 wiki 链接仍指向上游 wiki（`tisfeng/Easydict/wiki/...`）。
  openSiri 建好自己的 wiki 后逐条替换，在此之前指向上游反而比 404 有用
- `docs/user-docs/` 下 6 篇文档已改名，但正文里的截图仍是 Easydict UI

### 1.2 CI 与发布脚本

`.github/workflows/` 下 5 个 workflow 和 `scripts/release/` 全部继承自上游，
仓库名已替换但**未验证**：

- `codeql.yml` —— 代码扫描，改动最小，优先恢复
- `star_fork_notification.yml`、`update-star-history.yml` —— 依赖上游的
  webhook / secrets，openSiri 需要重配或直接删除
- `issue-translator.yml`、`greetings.yml` —— 按需保留
- `scripts/release/` —— 完整的 Sparkle 发布流水线，依赖 0.2 的签名密钥才能跑通

### 1.3 可删除的历史包袱

- `docs/assets/star-history/` —— 上游的 star 曲线图
- `Icons/` 下 5 个未被引用的配色目录、`Assets.xcassets` 里 3 个 `*_old` 资源
  （详见 [图标清单](../../design-docs/opensiri-icon-inventory.md)）
- `docs/inherited/` 两篇继承 readme——等 openSiri 有了自己的功能文档后即可移除

---

## 阶段 2 — 接入 AgentTeams 主线功能

这是 openSiri 区别于 Easydict 的核心，详细任务分解见
[`2026-08-16-opensiri-agentteams.md`](2026-08-16-opensiri-agentteams.md)。

该计划写于迁移之前，**其中的路径需要按本次迁移结果修正**：

| 计划里的路径 | 迁移后应为 |
| --- | --- |
| `Easydict/Swift/Feature/OpenSiri/...` | `OpenSiri/Swift/Feature/OpenSiri/...` |
| `EasydictTests/OpenSiri/...` | `OpenSiriTests/OpenSiri/...` |
| `Easydict.xcodeproj/project.pbxproj` | `OpenSiri.xcodeproj/project.pbxproj` |
| `Easydict/App/Localizable.xcstrings` | `OpenSiri/App/Localizable.xcstrings` |
| `xcodebuild -workspace Easydict.xcworkspace -scheme Easydict` | `-workspace OpenSiri.xcworkspace -scheme OpenSiri` |

`Easydict/Swift/Feature/OpenSiri/` 这个目录名在迁移后会变成
`OpenSiri/Swift/Feature/OpenSiri/`，路径里出现两次 OpenSiri。建议把该功能模块
改名为更具体的 `Feature/ReplyAssist/` 或 `Feature/AgentTeams/`。

里程碑顺序（摘自原计划）：

1. **A** 冻结客户端 ↔ AgentTeams 契约（`OPENSIRI_TASK_V1` / `EVENT` / `RESULT`）
2. **B** 截图捕获 + 本地 OCR + 微信对话结构化
3. **C** Matrix 客户端与 AgentTeams 连接
4. **D** 四 Agent 协作面板 UI 与人工审批
5. **E** 三个 Product Skill 的契约、Worker Skill 与可重放样例

---

## 阶段 3 — 定位与取舍

迁移把 Easydict 的**全部**功能带了过来：多家翻译服务、词典、MDict、TTS、
划词、OCR 翻译、系统词典集成等，共 577 个源文件。

openSiri 的产品定位是「截图 → Agent 团队生成回复」。需要明确决定：

- **保留翻译能力**：openSiri = 超集，Easydict 功能作为附加价值。代价是维护面积大，
  且要持续同步上游修复
- **收敛到回复助手**：裁掉词典/翻译服务，只保留 OCR、取词、窗口框架等基础设施。
  代价是一次性裁剪工作量大，但后续维护轻

这个决定会显著影响阶段 1.3 的清理范围和阶段 2 的 UI 设计，建议在里程碑 A 之前定下来。

---

## 附：不需要做的事

- **重命名 `EZ` 前缀**：Objective-C 时代留下的类名前缀，涉及 459 个符号、
  3101 处引用，横跨 Swift/ObjC 混编与桥接头。纯内部命名，收益为零、风险很高
- **改写指向上游 issue / PR 的注释链接**：它们是代码决策的依据，不是品牌残留
- **改动 `Copyright © izual` 版权声明**：GPL-3.0 要求保留原始版权声明，
  486 处均已按原样保留
- **替换 `Assets.xcassets/service-icon/`**：各翻译服务商的商标，不可替换
