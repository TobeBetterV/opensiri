# OpenSiri × AgentTeams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 OpenSiri 基础上交付可演示的 OpenSiri：用户截取微信对话后，本地完成 OCR 与对话校对，AgentTeams 中四个不同职能 Worker 协作生成并验证三条回复建议，用户最终复制或插入文本；同时内置 `wechat-smart-reply`、`selection-rewrite`、`screenshot-action-advisor` 三个 Product Skill。

**Architecture:** OpenSiri macOS 客户端是体验平面和 Matrix Human 客户端，只负责捕获、本地结构化、最小上下文、状态呈现和人工审批。独立 AgentTeams 部署是协作平面，由 Reply Team Leader 调度 Conversation Analyst、User Context Agent、Reply Strategist、Quality Reviewer。两侧只通过带版本的 `OPENSIRI_TASK_V1`、`OPENSIRI_EVENT_V1`、`OPENSIRI_RESULT_V1` JSON 契约耦合。

**Tech Stack:** Swift 5.9、SwiftUI、AppKit、Vision、SelectedTextKit、Defaults、Alamofire、Matrix Client-Server API、macOS Keychain、AgentTeams v1.2.2、Docker Compose、JSON Schema、Shell、Swift Testing。

## Global Constraints

- 先完成一条微信截图智能回复闭环；另外两个 Product Skill 交付可执行的契约、Worker Skill 和可重放样例，不扩张首版 UI。
- 原始截图默认不离开 Mac；任务载荷只包含校对后的消息、位置衍生字段、置信度和本次明确授权的用户上下文。
- 首版永不自动发送微信消息；最终动作仅为复制或通过现有 Accessibility 路径插入输入框。
- 不读取微信数据库、不注入微信进程、不修改 AgentTeams Controller。
- 生产代码与其单元测试必须由不同 agent 会话修改。每个“合同测试”Task 与紧随其后的“生产实现”Task 必须分配给不同 Worker；失败测试先提交，生产实现随后令其通过。
- 新增 Swift 文件必须登记到 `OpenSiri.xcodeproj/project.pbxproj`；用户可见文本必须写入 `OpenSiri/App/Localizable.xcstrings` 并覆盖现有 locale 集合。
- Swift 变更运行 `swiftformat --lint`；JSON/xcstrings 运行 `jq -e .`；Shell 运行 `bash -n`；所有变更运行 `git diff --check`；文档变更运行 `scripts/check-agent-docs.sh`。
- 任何 `OpenSiriTests/**/*.swift` 变更均运行对应 `xcodebuild test`。实现累计超过 100 行 Swift/Objective-C 后运行完整 build。
- AgentTeams 清单固定使用 `agentteams.io/v1beta1`；镜像/tag 和 Schema 版本固定，不依赖 `latest`。
- 每个 Task 形成一个可审查提交；执行提交前调用仓库 `git-commit` Skill，且不暂存工作树中与 OpenSiri 无关的文件。

## Target File Layout

```text
OpenSiri/Swift/Feature/OpenSiri/
├── Capture/
│   ├── OpenSiriCaptureService.swift
│   └── WeChatConversationParser.swift
├── Model/
│   ├── ConversationSnapshot.swift
│   ├── OpenSiriTaskEnvelope.swift
│   └── ReplySuggestionSet.swift
├── UserContext/
│   └── OpenSiriUserContextStore.swift
├── AgentTeams/
│   ├── MatrixConfiguration.swift
│   ├── MatrixCredentialsStore.swift
│   ├── MatrixClient.swift
│   └── OpenSiriEventParser.swift
├── Task/
│   ├── OpenSiriTaskCoordinator.swift
│   └── OpenSiriTaskState.swift
└── View/
    ├── OpenSiriPanelController.swift
    ├── OpenSiriRootView.swift
    ├── CaptureReviewView.swift
    ├── AgentProgressView.swift
    └── ReplySuggestionListView.swift

agentteams/
├── README.md
├── compose.env.example
├── resources/
│   ├── workers.yaml
│   ├── reply-team.yaml
│   └── demo-human.yaml
├── skills/
│   ├── parse-conversation/SKILL.md
│   ├── resolve-user-context/SKILL.md
│   ├── draft-reply-candidates/SKILL.md
│   ├── verify-reply-candidates/SKILL.md
│   ├── rewrite-selected-text/SKILL.md
│   └── analyze-screenshot-actions/SKILL.md
├── schemas/
│   ├── opensiri-task-v1.schema.json
│   ├── opensiri-event-v1.schema.json
│   └── opensiri-result-v1.schema.json
└── fixtures/
    ├── wechat-friend-chat.json
    ├── selection-rewrite.json
    └── screenshot-action-advisor.json

scripts/opensiri/
├── validate-contracts.sh
└── replay-demo.sh
```

## Milestone A — Freeze the Client/AgentTeams Contract

### Task 1: Add failing Codable contract tests

**Owner:** Test Worker A（不得在后续 Task 2 修改生产代码）

**Files:**
- Create: `OpenSiriTests/OpenSiri/OpenSiriContractTests.swift`
- Create: `OpenSiriTests/OpenSiri/Fixtures/opensiri-task-v1.json`
- Create: `OpenSiriTests/OpenSiri/Fixtures/opensiri-result-v1.json`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Contract:**

```swift
struct OpenSiriTaskEnvelope: Codable, Equatable, Sendable {
    let schemaVersion: String
    let taskID: UUID
    let skillID: ProductSkillID
    let createdAt: Date
    let conversation: ConversationSnapshot?
    let selectedText: String?
    let userContext: UserContextSnapshot
    let privacy: PrivacyPolicy
}

struct ReplySuggestionSet: Codable, Equatable, Sendable {
    let schemaVersion: String
    let taskID: UUID
    let candidates: [ReplyCandidate]
    let verification: VerificationReport
    let evidence: [AgentEvidence]
}
```

- [ ] 用固定 ISO-8601 日期和 UUID 解码两个 fixture，并断言 round-trip 后语义等价。
- [ ] 断言 `wechat-smart-reply` 缺失 `conversation` 时验证失败；`selection-rewrite` 缺失 `selectedText` 时验证失败。
- [ ] 断言候选回复数量不是 3、未知 `schemaVersion`、结果 `taskID` 不匹配时被拒绝。
- [ ] 运行：

```bash
xcodebuild test -workspace OpenSiri.xcworkspace -scheme OpenSiri \
  -only-testing:OpenSiriTests/OpenSiriContractTests | xcbeautify
```

Expected: FAIL，编译器只报告 OpenSiri 模型尚不存在；保存输出摘要到提交说明。

- [ ] Commit: `test(opensiri): define versioned task and result contracts`

### Task 2: Implement the shared Swift models

**Owner:** Production Worker B（不得修改 `OpenSiriTests/**`）

**Files:**
- Create: `OpenSiri/Swift/Feature/OpenSiri/Model/ConversationSnapshot.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/Model/OpenSiriTaskEnvelope.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/Model/ReplySuggestionSet.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

- [ ] 定义 `ConversationMessage`：`id`、`speaker`（`.user/.peer/.unknown`）、`text`、`boundingBox`、`confidence`、`needsReview`。
- [ ] 定义 `ConversationSnapshot`：按视觉顺序保存消息、总体置信度、应用提示 `.wechat` 和人工校对标记；不保存 `NSImage`。
- [ ] 定义 `ProductSkillID` 三个固定 case；为每个任务建立 `validate()`，返回稳定的 `OpenSiriContractError` reason code。
- [ ] 定义 `ReplyCandidate`、`RiskFlag`、`VerificationReport`、`AgentEvidence`；候选仅允许 `.concise/.friendly/.safe` 三种策略。
- [ ] 将日期统一编码为毫秒 ISO-8601，CGRect 编码为归一化 `{x,y,width,height}`。
- [ ] 把三文件加入 OpenSiri PBXGroup 和 OpenSiri target。
- [ ] 运行 Task 1 的测试命令。Expected: PASS。
- [ ] Commit: `feat(opensiri): add versioned task and reply models`

### Task 3: Add JSON Schemas and fixture validation

**Owner:** Infra Worker C

**Files:**
- Create: `agentteams/schemas/opensiri-task-v1.schema.json`
- Create: `agentteams/schemas/opensiri-event-v1.schema.json`
- Create: `agentteams/schemas/opensiri-result-v1.schema.json`
- Create: `agentteams/fixtures/wechat-friend-chat.json`
- Create: `agentteams/fixtures/selection-rewrite.json`
- Create: `agentteams/fixtures/screenshot-action-advisor.json`
- Create: `scripts/opensiri/validate-contracts.sh`

- [ ] 将 Swift 合同逐字段映射为 Draft 2020-12 JSON Schema；所有对象设置 `additionalProperties: false`。
- [ ] `opensiri-event-v1` 的 `state` 只允许 `accepted/analysing/resolving_context/drafting/verifying/needs_human_input/completed/failed`。
- [ ] 三个 fixture 分别覆盖三个 Product Skill，微信 fixture 包含低置信度消息和一次人工纠正。
- [ ] 脚本使用仓库可用 JSON Schema validator；若项目未含 validator，则用 `npx --yes ajv-cli@5.0.0` 并固定版本。
- [ ] 运行：

```bash
jq -e . agentteams/schemas/*.json agentteams/fixtures/*.json
bash -n scripts/opensiri/validate-contracts.sh
scripts/opensiri/validate-contracts.sh
```

Expected: 三个 fixture 均通过相应 Schema；脚本对临时删除 `schemaVersion` 的输入返回非零。

- [ ] Commit: `feat(agentteams): add OpenSiri schemas and replay fixtures`

## Milestone B — Turn WeChat OCR into a Conversation

### Task 4: Add failing WeChat parser tests

**Owner:** Test Worker A

**Files:**
- Create: `OpenSiriTests/OpenSiri/WeChatConversationParserTests.swift`

- [ ] 构造纯内存 `EZRecognizedTextObservation`：左侧气泡、右侧气泡、居中时间戳、顶部标题、跨行气泡和低置信度文本。
- [ ] 断言按视觉坐标从上到下排序；右侧为 `.user`，左侧为 `.peer`，居中时间戳和标题被剔除。
- [ ] 断言同侧、垂直间距小于阈值的两行合并；低置信度消息设置 `needsReview`。
- [ ] 断言左右混杂或消息不足 2 条返回 `.ambiguousLayout`，不会臆测说话人。
- [ ] 运行：

```bash
xcodebuild test -workspace OpenSiri.xcworkspace -scheme OpenSiri \
  -only-testing:OpenSiriTests/WeChatConversationParserTests | xcbeautify
```

Expected: FAIL，仅因 `WeChatConversationParser` 尚不存在。

- [ ] Commit: `test(opensiri): specify WeChat bubble parsing behavior`

### Task 5: Implement local OCR capture and WeChat parsing

**Owner:** Production Worker B

**Files:**
- Create: `OpenSiri/Swift/Feature/OpenSiri/Capture/WeChatConversationParser.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/Capture/OpenSiriCaptureService.swift`
- Modify: `OpenSiri/Swift/Service/Apple/AppleOCREngine/AppleOCREngine.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

- [ ] 在 `AppleOCREngine` 增加只读 async 入口，返回现有 `[EZRecognizedTextObservation]`；保持原 `EZOCRResult` 路径不变，避免位置数据在合并文本时丢失。
- [ ] `OpenSiriCaptureService.recognize(_ image: NSImage)` 只在本地调用 Apple OCR，并将 Vision 坐标归一化到 0...1。
- [ ] `WeChatConversationParser` 使用 `x` 中心点区分左右气泡，使用 `y`、高度和间距合并多行；阈值集中到 `Configuration`，不散落 magic number。
- [ ] 中间 40% 区域只接受短时间/日期模式为系统行；无法可靠归属的文本保留为 `.unknown` 并要求校对。
- [ ] 总体置信度取消息级加权均值；任一 `.unknown` 或 `< 0.72` 即进入 `needs_capture_correction`。
- [ ] 运行 Task 4 测试。Expected: PASS。
- [ ] Commit: `feat(opensiri): parse local OCR into WeChat conversations`

## Milestone C — Connect OpenSiri to Matrix

### Task 6: Add failing Matrix protocol tests

**Owner:** Test Worker D

**Files:**
- Create: `OpenSiriTests/OpenSiri/OpenSiriEventParserTests.swift`
- Create: `OpenSiriTests/OpenSiri/MatrixClientTests.swift`

- [ ] 事件解析测试覆盖三个前缀、普通房间消息、损坏 JSON、未知版本、错误 task ID 和重复 event ID。
- [ ] 使用自定义 `URLProtocol` 验证 Matrix 请求：`/_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}`、Bearer token、幂等 transaction ID、URL path percent encoding。
- [ ] 验证 `/sync?since=` 增量游标、429 的 `retry_after_ms`、401 映射为 `authenticationRequired`、网络断开映射为可重试。
- [ ] 运行：

```bash
xcodebuild test -workspace OpenSiri.xcworkspace -scheme OpenSiri \
  -only-testing:OpenSiriTests/OpenSiriEventParserTests \
  -only-testing:OpenSiriTests/MatrixClientTests | xcbeautify
```

Expected: FAIL，仅因 Matrix 类型不存在。

- [ ] Commit: `test(opensiri): define Matrix messaging and event parsing`

### Task 7: Implement Matrix configuration, credentials and client

**Owner:** Production Worker E

**Files:**
- Create: `OpenSiri/Swift/Feature/OpenSiri/AgentTeams/MatrixConfiguration.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/AgentTeams/MatrixCredentialsStore.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/AgentTeams/MatrixClient.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/AgentTeams/OpenSiriEventParser.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

- [ ] `MatrixConfiguration` 验证 HTTPS；仅在 Debug 下允许用户显式选择 `http://localhost`。
- [ ] `MatrixCredentialsStore` 使用 Keychain 保存 access token；Defaults 只保存 homeserver URL、room ID、user ID 和 sync token。
- [ ] `MatrixClient` 暴露 `sendTask(_:)`、`sendHumanMessage(taskID:text:)`、`events(since:) -> AsyncThrowingStream<OpenSiriRemoteEvent, Error>`。
- [ ] 所有发送事件使用 UUID transaction ID；仅对网络错误和 429 做指数退避，最大 3 次；401 不重试。
- [ ] `OpenSiriEventParser` 先检查文本前缀，再做 JSON 解码、Schema version 和 task ID 匹配；用 event ID 去重。
- [ ] 日志仅记录 task ID、状态和字节数，不记录对话、token 或回复正文。
- [ ] 运行 Task 6 测试。Expected: PASS。
- [ ] Commit: `feat(opensiri): add secure Matrix AgentTeams client`

## Milestone D — Coordinate State, Approval and Recovery

### Task 8: Add failing coordinator state-machine tests

**Owner:** Test Worker D

**Files:**
- Create: `OpenSiriTests/OpenSiri/OpenSiriTaskCoordinatorTests.swift`

- [ ] 使用 actor-based fake Matrix transport 测试完整状态：`reviewingCapture → submitting → running → awaitingUserApproval → completed`。
- [ ] 断言低 OCR 置信度无法提交；错误 task ID/重复结果不改变状态；Reviewer 拒绝会回到 drafting，最多两次。
- [ ] 断言网络中断保持 envelope 并进入 `backendUnavailable`；点击重试复用同一 task ID，不重复创建任务。
- [ ] 断言 copy/insert 前必须存在通过验证的候选；`insert` 失败时保留剪贴板回退，不把任务标为已发送。
- [ ] 运行对应 suite。Expected: FAIL，仅因 coordinator/state 尚不存在。
- [ ] Commit: `test(opensiri): specify orchestration and approval state machine`

### Task 9: Implement the task coordinator and user context minimization

**Owner:** Production Worker F

**Files:**
- Create: `OpenSiri/Swift/Feature/OpenSiri/Task/OpenSiriTaskState.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/Task/OpenSiriTaskCoordinator.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/UserContext/OpenSiriUserContextStore.swift`
- Modify: `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

- [ ] `OpenSiriTaskState` 建模 approved spec 的正常和异常状态；状态转换集中在 reducer，不由 View 任意赋值。
- [ ] `OpenSiriTaskCoordinator` 组装 envelope、发送、消费 Matrix stream、处理最多两次 reviewer retry、验证 result 并发布 UI state。
- [ ] `OpenSiriUserContextStore` 只保存关系、偏好语气、回复语言、禁用承诺四类字段；为每次提交产生不可变 `UserContextSnapshot`。
- [ ] 任务缓存只保存结构化文本和状态，默认 24 小时自动过期；Keychain 生成/保存本地加密密钥。
- [ ] 插入复用 `SystemUtility.focusedElementInfo` 与 `insertText`；复制复用 `NSPasteboard`，绝不触发回车或微信按钮。
- [ ] 运行 Task 8 测试。Expected: PASS。
- [ ] Commit: `feat(opensiri): coordinate AgentTeams tasks and human approval`

## Milestone E — Build the OpenSiri Window

### Task 10: Build the capture review and reply panel

**Owner:** UI Worker G（UI-only，无需新增单元测试）

**Files:**
- Create: `OpenSiri/Swift/Feature/OpenSiri/View/OpenSiriPanelController.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/View/OpenSiriRootView.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/View/CaptureReviewView.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/View/AgentProgressView.swift`
- Create: `OpenSiri/Swift/Feature/OpenSiri/View/ReplySuggestionListView.swift`
- Modify: `OpenSiri/App/Localizable.xcstrings`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

- [ ] 用独立 `NSPanel` 承载 SwiftUI，不改造现有翻译浮窗内部状态；窗口可移动、置顶、Esc 关闭且不抢走微信文本焦点超过必要时间。
- [ ] `CaptureReviewView` 按气泡显示 user/peer，允许编辑文字和切换说话人；低置信度行高亮并阻止提交。
- [ ] `AgentProgressView` 固定显示四个职能节点、当前状态、耗时和可展开证据；不伪造实时 token stream。
- [ ] `ReplySuggestionListView` 显示简洁/友好/稳妥三张卡，状态仅为“通过/需注意/拒绝”，操作为“复制”“插入”和自然语言修订。
- [ ] loading、backend unavailable、needs human input、failed 均提供可执行恢复按钮。
- [ ] 为所有现有 locale 增加 `opensiri.*` 文案；非中文 locale 可使用经过审查的英文兜底，但不得缺 key。
- [ ] 运行：

```bash
jq -e . OpenSiri/App/Localizable.xcstrings
swiftformat --lint OpenSiri/Swift/Feature/OpenSiri
```

Expected: PASS。

- [ ] Commit: `feat(opensiri): add capture review and reply approval panel`

### Task 11: Wire screenshot shortcut and window lifecycle

**Owner:** Integration Worker H

**Files:**
- Modify: `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`
- Modify: `OpenSiri/Swift/Feature/Shortcut/View/KeyHolderWrapper.swift`
- Modify: `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift`
- Modify: `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`
- Modify: `OpenSiri/objc/ViewController/Window/WindowManager/EZWindowManager.h`
- Modify: `OpenSiri/objc/ViewController/Window/WindowManager/EZWindowManager.m`
- Modify: `OpenSiri/App/Localizable.xcstrings`

- [ ] 新增 `.openSiriScreenshotReply` 全局快捷键及独立 Defaults key，默认不占用 OpenSiri 已有快捷键。
- [ ] ActionManager 入口启动现有截图选择器，截图完成后交给 `OpenSiriCaptureService`，再打开独立 panel。
- [ ] `EZWindowManager` 只增加 bridge 方法和 panel 生命周期管理，不把 AgentTeams 状态塞进现有翻译 `QueryViewController`。
- [ ] 关闭窗口取消 sync task，但保留可恢复的本地任务 envelope；再次打开可继续或丢弃。
- [ ] Accessibility 未授权时隐藏“插入”或解释权限需求，“复制”始终可用。
- [ ] 运行格式、本地化 JSON 和相关快捷键现有测试。
- [ ] Commit: `feat(opensiri): connect screenshot shortcut to AgentTeams panel`

## Milestone F — Package the AgentTeams Reply Team and Three Skills

### Task 12: Declare four functional Workers and the Reply Team

**Owner:** Infra Worker C

**Files:**
- Create: `agentteams/resources/workers.yaml`
- Create: `agentteams/resources/reply-team.yaml`
- Create: `agentteams/resources/demo-human.yaml`
- Create: `agentteams/compose.env.example`

- [ ] 定义四个独立 Worker CR，分别给出 `identity`、`soul`、最小 tools、`spec.skills` 和禁止事项；runtime 使用同一已验证 runtime，但 model 通过环境变量注入。
- [ ] `reply-team.yaml` 只包含一个 team leader 和四个 worker member；角色使用 `team_leader`/`worker`，不把 Manager 冒充功能 Agent。
- [ ] Human 仅可访问 Reply Team 的 Matrix room；Reviewer 无用户记忆写权限，Strategist 无审批权限。
- [ ] 清单中的 secret 只引用环境变量或 AgentTeams secret resource；示例文件禁止真实 token。
- [ ] 使用 AgentTeams 官方 CLI/API dry-run 应用清单；保存资源成功列表。
- [ ] Commit: `feat(agentteams): declare the OpenSiri reply team`

### Task 13: Implement six Worker Skills and the three Product workflows

**Owner:** Skill Worker I（执行前调用 `superpowers:writing-skills`）

**Files:**
- Create: `agentteams/skills/parse-conversation/SKILL.md`
- Create: `agentteams/skills/resolve-user-context/SKILL.md`
- Create: `agentteams/skills/draft-reply-candidates/SKILL.md`
- Create: `agentteams/skills/verify-reply-candidates/SKILL.md`
- Create: `agentteams/skills/rewrite-selected-text/SKILL.md`
- Create: `agentteams/skills/analyze-screenshot-actions/SKILL.md`
- Create: `agentteams/README.md`

- [ ] 每个 Worker Skill 明确输入 Schema、输出 Schema、工具、错误 reason code、隐私边界、重试策略和至少两个 example。
- [ ] `wechat-smart-reply` 流程：parse → resolve context（可与 parse 并行）→ draft 3 → verify → reviewer 拒绝则最多回 draft 两次 → result。
- [ ] `selection-rewrite` 使用 `rewrite-selected-text`，输出保守/自然/鲜明三版，并经同一 reviewer 规则验证。
- [ ] `screenshot-action-advisor` 使用 `analyze-screenshot-actions`，输出摘要、风险和三步行动；遇到财务/医疗/法律内容标注“需人工核实”。
- [ ] Team Leader 每个阶段发送 `OPENSIRI_EVENT_V1`；最终只由 Team Leader 发送 `OPENSIRI_RESULT_V1`。
- [ ] 对三个 fixture 做无网络静态验证，再在本地 AgentTeams 各重放一次。
- [ ] Commit: `feat(skills): package three OpenSiri product workflows`

### Task 14: Add deterministic verification and demo replay

**Owner:** Infra Worker J

**Files:**
- Create: `scripts/opensiri/replay-demo.sh`
- Modify: `scripts/opensiri/validate-contracts.sh`
- Create: `docs/user-docs/zh/opensiri-demo.md`
- Create: `docs/user-docs/en/opensiri-demo.md`

- [ ] Reviewer 在 LLM 语义评审之前执行确定性检查：空文本、候选数、重复候选、URL/手机号泄露、凭空金额/时间承诺、输出 Schema。
- [ ] replay 脚本接收 fixture、homeserver、room ID 和 token 环境变量，提交任务后按 task ID 等待最终结果，超时 180 秒返回非零。
- [ ] 脚本输出阶段耗时、Worker 名、最终状态和 evidence ID；不输出 access token。
- [ ] 中英文文档写明 8 GB 内存建议、Matrix 配置、权限授权、三条重放命令、常见失败和数据删除方式。
- [ ] 运行：

```bash
bash -n scripts/opensiri/*.sh
scripts/opensiri/validate-contracts.sh
scripts/check-agent-docs.sh
```

Expected: PASS。

- [ ] Commit: `feat(demo): add reproducible AgentTeams replay and evidence`

## Milestone G — End-to-End Acceptance

### Task 15: Run acceptance tests and capture evidence

**Owner:** Release Worker K（不得在此 Task 顺手修改行为；失败回到对应 Task）

**Files:**
- Create: `docs/histories/2026-08-xx-opensiri-agentteams.md`
- Create: `docs/user-docs/zh/assets/opensiri-demo/` 下的脱敏截图与运行记录

- [ ] 冷启动 AgentTeams，应用三份资源清单，确认 Reply Team 与四个 Worker 均 Ready。
- [ ] 在微信测试对话中截取至少 8 条混合左右气泡，人工校正一条 OCR；提交后看到四个 Agent 状态和三条经验证候选。
- [ ] 分别验证复制、Accessibility 插入、网络断开重试、OCR 歧义阻止提交、Reviewer 拒绝重写、错误 task ID 丢弃。
- [ ] 重放另外两个 Product Skill fixture，确认结果可由同一个 OpenSiri event parser 展示。
- [ ] 测量并记录：OCR 结构准确率、任务成功率、端到端 P50/P95、Reviewer 拒绝率、人工修改率；样本至少 30 条脱敏任务。
- [ ] 执行完整验证：

```bash
swiftformat --lint OpenSiri/Swift/Feature/OpenSiri
jq -e . OpenSiri/App/Localizable.xcstrings agentteams/schemas/*.json agentteams/fixtures/*.json
bash -n scripts/opensiri/*.sh
scripts/opensiri/validate-contracts.sh
scripts/check-agent-docs.sh
xcodebuild test -workspace OpenSiri.xcworkspace -scheme OpenSiri | xcbeautify
xcodebuild build -workspace OpenSiri.xcworkspace -scheme OpenSiri | xcbeautify
git diff --check
```

Expected: 全部 PASS；若某命令失败，不创建 release/history 提交，回到对应 Task 修复并重新执行整套命令。

- [ ] 历史文档记录实现范围、设计偏差、测试证据、已知限制、隐私边界和回滚方式。
- [ ] Commit: `docs(opensiri): record AgentTeams acceptance evidence`

## Delivery Sequence and Scope Gates

1. **Day 1–2：合同与本地解析** — Task 1–5；门禁是微信 fixture 能稳定转成可校对对话。
2. **Day 3–5：Matrix 闭环** — Task 6–9；门禁是命令行模拟结果能驱动 Swift 状态机。
3. **Day 6–8：用户体验** — Task 10–11；门禁是截图、提交、三候选、复制/插入闭环可用。
4. **Day 9–11：AgentTeams 包** — Task 12–14；门禁是四 Worker Ready，三个 Product Skill 均可重放。
5. **Day 12–14：证据与演示** — Task 15；只修主链路 P0/P1，不新增产品面。

任何阶段延期时，保留顺序不变并按以下优先级砍范围：先砍另外两个 Skill 的专用 UI，再砍大产物上传和高级记忆，最后砍视觉动效；不得砍四个功能 Worker、结构化上下文传递、独立验证、人工审批、失败恢复和运行证据。
