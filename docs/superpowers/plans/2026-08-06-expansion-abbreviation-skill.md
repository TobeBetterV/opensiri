# 扩写 / 缩写 + 预制 Skill 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 OpenSiri 中新增「扩写 / 缩写」两个 AI 工具服务，以及承载多个「预制 Skill」的 `SkillService`（Skill 内置 + 用户自定义、可选 JSON schema、结构化输出转 Markdown）。

**Architecture:**
- 沿用 `AIToolService → BuiltInAIService → StreamService` 继承链；两个具体服务照抄 `PolishingService` / `SummaryService` 结构。
- 新增 `SkillService` + `SkillStore` + `JsonToMarkdown` 三件事：`SkillService` 只读取 `SkillStore.shared.activeSkillID`，`TranslationRequest` 保持不变。
- 全局快捷键复用 `ActionManager.executeTextReplacementAction` 骨架；Skill 有 schema 时切换到「Mini 窗口展示」而非替换文本。

**Tech Stack:** Swift 5.9+, SwiftUI, AppKit, CocoaPods, `Defaults` (sindresorhus), `SFSafeSymbols`, `Alamofire`, `Localizable.xcstrings`；测试用 `Swift Testing` (`@Suite` / `@Test`)。

## Global Constraints

- 平台目标：macOS 13.0+，Swift 5.9+；使用 SwiftUI 写所有新 UI。
- 所有用户可见文案必须放进 `OpenSiri/App/Localizable.xcstrings`，对所有当前 locale 逐一补齐，禁止动态拼接 key。
- 新文件的 UpperCamelCase 命名；handwritten 源文件 500 行以内、绝不超过 1000 行。
- 生产代码与单元测试**不在同一 agent 会话**完成；本计划内所有实现由本会话产出，单测由另一个 agent 会话（Codex 或另一实例）在 P0 结束后跟进；测试目录 `OpenSiriTests/`。
- 每个新增/移动的源文件必须同步登记到 `OpenSiri.xcodeproj/project.pbxproj` 的对应 `PBXGroup`；非资源类文件不进入 `Resources` build phase。
- 使用 `SFSafeSymbols` 而非 SF Symbol 字符串；使用 `foregroundStyle` 而非 `foregroundColor`；网络请求走 `Alamofire` async/await；偏好设置走 `Defaults`。
- 新目录（非 test / 非生成）超过 1 个源文件时，必须同时提供 `<dir-kebab>-overview.html`（中文）与 `<dir-kebab>-<type>.svg`，SVG 由 `fireworks-tech-graph` 生成。
- 分支命名遵循 Angular 前缀：`feat/expansion-abbreviation-skill`。
- Xcode 构建仅在下列情况执行：Swift/Obj-C/pbxproj/App 运行时源码改动超过 100 行、`OpenSiriTests/**` 变更、用户显式要求。文档/脚本单独变更不触发构建。
- 提交遵循仓库 `git-commit` skill 的 Angular 双语规范（中文块 + 分隔 + 英文块），每完成一个 Task 提交一次。

---

## 文件规划总览

**新增文件**：
- `OpenSiri/Swift/Service/AITool/ExpansionService.swift`
- `OpenSiri/Swift/Service/AITool/AbbreviationService.swift`
- `OpenSiri/Swift/Feature/Skill/Model/Skill.swift`
- `OpenSiri/Swift/Feature/Skill/Model/SkillBuiltIn.swift`
- `OpenSiri/Swift/Feature/Skill/Model/SkillStore.swift`
- `OpenSiri/Swift/Feature/Skill/Service/SkillService.swift`
- `OpenSiri/Swift/Feature/Skill/Rendering/JsonToMarkdown.swift`
- `OpenSiri/Swift/Feature/Skill/View/SkillPickerView.swift`
- `OpenSiri/Swift/Feature/Skill/View/SkillSettingsView.swift`
- `OpenSiri/Swift/Feature/Skill/View/SkillEditorView.swift`
- `OpenSiri/Swift/Feature/Skill/skill-overview.html`
- `OpenSiri/Swift/Feature/Skill/skill-architecture.svg`

**修改文件**：
- `OpenSiri/objc/Service/Model/EZEnumTypes.h`（Line 40 之后加 3 个 EXPORT）
- `OpenSiri/objc/Service/Model/EZEnumTypes.m`（Line 31 之后加 3 个常量）
- `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift:114-144`
- `OpenSiri/Swift/Service/OpenAI/ChatMessage.swift:46-49` (`AIToolType`)
- `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`
- `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`
- `OpenSiri/Swift/Feature/Shortcut/View/KeyHolderWrapper.swift:138`
- `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift:410`
- `OpenSiri/Swift/View/MenuItemView.swift`
- `OpenSiri/App/Localizable.xcstrings`
- `OpenSiri.xcodeproj/project.pbxproj`

---

## Task 1: 添加 `EZServiceType` 三个新常量

**Files:**
- Modify: `OpenSiri/objc/Service/Model/EZEnumTypes.h:40-60`
- Modify: `OpenSiri/objc/Service/Model/EZEnumTypes.m:22-42`

**Interfaces:**
- Consumes: 无
- Produces:
  - `EZServiceTypeExpansion` = `@"Expansion"` (Swift: `ServiceType.expansion`)
  - `EZServiceTypeAbbreviation` = `@"Abbreviation"` (Swift: `ServiceType.abbreviation`)
  - `EZServiceTypeSkill` = `@"Skill"` (Swift: `ServiceType.skill`)

- [ ] **Step 1: 在 EZEnumTypes.h 追加三个 EXPORT**

在 `EZServiceTypeSummary` 声明（第 50 行）之后紧接着插入：

```objc
FOUNDATION_EXPORT EZServiceType const EZServiceTypeExpansion;
FOUNDATION_EXPORT EZServiceType const EZServiceTypeAbbreviation;
FOUNDATION_EXPORT EZServiceType const EZServiceTypeSkill;
```

- [ ] **Step 2: 在 EZEnumTypes.m 追加三个常量**

在 `NSString *const EZServiceTypeSummary = @"Summary";`（第 31 行）之后插入：

```objc
NSString *const EZServiceTypeExpansion = @"Expansion";
NSString *const EZServiceTypeAbbreviation = @"Abbreviation";
NSString *const EZServiceTypeSkill = @"Skill";
```

- [ ] **Step 3: 冒烟检查（编译）**

因为改的是 .h/.m，超过阈值。执行：

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED（三个常量目前尚未有 Swift 引用，仅注册符号）。构建后 `rm -rf ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary`。

- [ ] **Step 4: 提交**

```bash
git add OpenSiri/objc/Service/Model/EZEnumTypes.h OpenSiri/objc/Service/Model/EZEnumTypes.m
git commit -F <(cat <<'EOF'
feat(service): 添加扩写缩写和 Skill 三个 ServiceType 常量

OpenSiri 目前的 EZServiceType 集合缺少扩写、缩写以及通用 Skill 三类 AI 工具类服务类型。后续实现需要这些常量作为 Swift/ObjC 两侧统一的标识。

在 EZEnumTypes.h 和 EZEnumTypes.m 中追加 EZServiceTypeExpansion、EZServiceTypeAbbreviation、EZServiceTypeSkill，取值分别为 Expansion、Abbreviation、Skill。

后续 QueryServiceFactory 注册和 Swift 服务类实现可以直接引用这些常量，不再需要额外的桥接改动。

----------------------------------------------------------------------

feat(service): add expansion, abbreviation and skill service types

OpenSiri currently lacks EZServiceType constants for expansion, abbreviation, and a generic Skill AI-tool service. Follow-up implementation needs those constants as the shared Swift and Objective-C identifier.

Append EZServiceTypeExpansion, EZServiceTypeAbbreviation, and EZServiceTypeSkill in EZEnumTypes.h and EZEnumTypes.m with raw values Expansion, Abbreviation, and Skill.

Later QueryServiceFactory registrations and Swift service classes can reference these constants directly, without extra bridging changes.
EOF
)
```

---

## Task 2: `ExpansionService` 与本地化 key

**Files:**
- Create: `OpenSiri/Swift/Service/AITool/ExpansionService.swift`
- Modify: `OpenSiri/App/Localizable.xcstrings` (追加 `expansion_service` key，为所有 locale 补齐；至少含 zh-Hans / zh-Hant / en / ja / ko / de / fr / es / ru / it / pt-BR / uk / tr / th / vi / ar / hi / nl / pl / cs / hu / ro / sv / no / da / fi / el / bg / hr / sr / sk / sl / lt / lv / et / is / mt / cy / ga / eu / ca / gl / af / sw，实际以现有其他 key 的 locale 集合为准)
- Modify: `OpenSiri/Swift/Service/OpenAI/ChatMessage.swift:46-49` (`AIToolType`)

**Interfaces:**
- Consumes: `AIToolService` (existing), `ChatQueryParam`, `ChatMessage`
- Produces:
  - `class ExpansionService: AIToolService`：`serviceType()` 返回 `.expansion`；`name()` 读 `expansion_service` 本地化 key
  - `AIToolType.expansion` case
  - Localizable key `expansion_service`

- [ ] **Step 1: 在 `AIToolType` 里加 `.expansion`**

打开 `OpenSiri/Swift/Service/OpenAI/ChatMessage.swift:46`：

```swift
enum AIToolType {
    case polishing
    case summary
    case expansion
    case abbreviation
    case skill
}
```

（本 Task 只用到 `.expansion`，其它两个提前一次性加进去，避免 Task 3/4 再来动这个枚举。）

- [ ] **Step 2: 新增 `ExpansionService.swift`**

Create `OpenSiri/Swift/Service/AITool/ExpansionService.swift`：

```swift
//
//  ExpansionService.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

// swiftlint:disable line_length

/// AI tool service that expands the user's text into a longer, richer version
/// while keeping the original meaning. Runs on the built-in AI backend.
@objc(EZExpansionService)
class ExpansionService: AIToolService {
    // MARK: Public

    public override func name() -> String {
        NSLocalizedString("expansion_service", comment: "")
    }

    public override func serviceType() -> ServiceType {
        .expansion
    }

    // MARK: Internal

    override func chatMessageDicts(_ chatQuery: ChatQueryParam) -> [ChatMessage] {
        let (text, sourceLanguage, _, _, _) = chatQuery.unpack()
        let prompt = expansionPrompt(text: text, in: sourceLanguage)

        let englishFewShot = [
            chatMessagePair(
                userContent:
                "Expand the following English text into a longer, more detailed version while keeping the original meaning: \"\"\"The team shipped the feature.\"\"\"",
                assistantContent:
                "After weeks of iteration, the team finally shipped the feature to production, addressing the long-standing customer requests and unlocking new use cases for downstream integrations."
            ),
            chatMessagePair(
                userContent:
                "Expand the following English text with concrete detail: \"\"\"The meeting was productive.\"\"\"",
                assistantContent:
                "The meeting was productive: we clarified the roadmap, agreed on ownership for each workstream, and identified two blockers to escalate before the end of the week."
            ),
        ].flatMap { $0 }

        var messages: [ChatMessage] = [
            .init(role: .system, content: expansionSystemPrompt),
        ]
        messages.append(contentsOf: englishFewShot)
        messages.append(.init(role: .user, content: prompt))

        return messages
    }

    // MARK: Private

    private let expansionSystemPrompt = """
    You are an expert writer who expands short text into a longer, richer version. Add concrete details, examples, or context so the passage reads naturally while preserving the original meaning, tone, and language. Do not invent contradictory facts. Only return the expanded text, without quotes or notes.
    """

    private func expansionPrompt(text: String, in sourceLanguage: Language) -> String {
        "Expand the following \(sourceLanguage.queryLanguageName) text into a longer, more detailed version while keeping the original meaning and tone: \"\"\"\(text)\"\"\""
    }
}

// swiftlint:enable line_length
```

- [ ] **Step 3: 补齐 `Localizable.xcstrings` 的 `expansion_service` 条目**

打开 `OpenSiri/App/Localizable.xcstrings`，参照现有 `polishing_service` 条目所覆盖的所有 locale：
- `zh-Hans`: "扩写"
- `zh-Hant`: "擴寫"
- `en`: "Expansion"
- `ja`: "文章の拡張"
- `ko`: "문장 확장"
- 其余 locale 参照 `polishing_service` 现有 locale 集合，对应翻译如下备选：
  - `de`: "Erweitern", `fr`: "Développer", `es`: "Expandir", `ru`: "Расширить",
    `it`: "Espandere", `pt-BR`: "Expandir", `tr`: "Genişlet", `vi`: "Mở rộng",
    `ar`: "توسيع"
- 未在上表的 locale，抄 `en` 值兜底并保留原键，避免遗漏。**必须**枚举 xcstrings 中 `polishing_service` 已有的每一个 locale。

具体做法：先 `grep -n '"polishing_service"' OpenSiri/App/Localizable.xcstrings` 定位块，把整个 JSON 对象复制一份，改 key 名与 value。

- [ ] **Step 4: 登记到 xcodeproj**

打开 `OpenSiri.xcodeproj/project.pbxproj`，在 `OpenSiri/Swift/Service/AITool` PBXGroup 里找到 `PolishingService.swift` 的 `PBXFileReference` 和 `PBXBuildFile` 两处，仿照追加 `ExpansionService.swift` 两条。

- [ ] **Step 5: 在 QueryServiceFactory 注册（暂只加 Expansion）**

打开 `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift:131`，在 `.summary` 那行之后追加一行：

```swift
.init(.expansion, ExpansionService.self, "expansion_service", apiKeyRequirement: .builtIn),
```

- [ ] **Step 6: 编译**

Swift 源码改动 + xcstrings + pbxproj 综合改动超过 100 行，触发构建：

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。构建后清理 DerivedData：`rm -rf ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary`。

- [ ] **Step 7: 提交**

```bash
git add OpenSiri/Swift/Service/AITool/ExpansionService.swift \
        OpenSiri/Swift/Service/OpenAI/ChatMessage.swift \
        OpenSiri/Swift/Service/Model/QueryServiceFactory.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(ai-tool): 添加扩写服务

现有 AI 工具类服务只有 Polish 和 Summary，用户没有一键把段落扩充成更详细版本的能力。规划中的扩写功能需要一个独立的流式服务承载。

新增 ExpansionService，继承 AIToolService 并复用内置 AI 后端，在 chatMessageDicts 中提供扩写用 system prompt 和 few-shot；同时把 .expansion 加入 AIToolType，在 QueryServiceFactory 注册为 builtIn key 类型，并为 expansion_service 本地化 key 补齐 xcstrings 所有 locale。

用户开启该服务后即可在主查询窗口获得扩写结果卡片，为后续快捷键、菜单入口和 SkillService 的实施打下基础。

----------------------------------------------------------------------

feat(ai-tool): add expansion service

The existing AI-tool services cover only Polish and Summary, so users cannot expand a paragraph into a richer version with one click. The planned expansion feature needs its own streaming service to carry that flow.

Add ExpansionService as an AIToolService subclass reusing the built-in AI backend, with a dedicated system prompt and few-shot examples in chatMessageDicts; add .expansion to AIToolType, register it in QueryServiceFactory as a built-in key service, and fill the expansion_service key in every locale of Localizable.xcstrings.

Once the service is enabled, the main query window shows an expansion result card. This lays the groundwork for the follow-up shortcuts, menu items, and SkillService implementation.
EOF
)
```

---

## Task 3: `AbbreviationService` 与本地化 key

**Files:**
- Create: `OpenSiri/Swift/Service/AITool/AbbreviationService.swift`
- Modify: `OpenSiri/App/Localizable.xcstrings` (追加 `abbreviation_service`)
- Modify: `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `AIToolService`, `AIToolType.abbreviation` (已在 Task 2 提前加入)
- Produces:
  - `class AbbreviationService: AIToolService`：`serviceType() = .abbreviation`
  - Localizable key `abbreviation_service`

- [ ] **Step 1: 新增 `AbbreviationService.swift`**

Create `OpenSiri/Swift/Service/AITool/AbbreviationService.swift`：

```swift
//
//  AbbreviationService.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

// swiftlint:disable line_length

/// AI tool service that condenses the user's text into a shorter version while
/// preserving key information and tone. Runs on the built-in AI backend.
@objc(EZAbbreviationService)
class AbbreviationService: AIToolService {
    // MARK: Public

    public override func name() -> String {
        NSLocalizedString("abbreviation_service", comment: "")
    }

    public override func serviceType() -> ServiceType {
        .abbreviation
    }

    // MARK: Internal

    override func chatMessageDicts(_ chatQuery: ChatQueryParam) -> [ChatMessage] {
        let (text, sourceLanguage, _, _, _) = chatQuery.unpack()
        let prompt = abbreviationPrompt(text: text, in: sourceLanguage)

        let englishFewShot = [
            chatMessagePair(
                userContent:
                "Shorten the following English text while keeping the key information: \"\"\"The quarterly report highlighted that revenue grew by fifteen percent year over year, primarily driven by strong performance in the enterprise segment and expanded partnerships in Europe.\"\"\"",
                assistantContent:
                "The quarterly report showed 15% YoY revenue growth, driven by the enterprise segment and European partnerships."
            ),
            chatMessagePair(
                userContent:
                "Abbreviate the following English text: \"\"\"Please make sure that the deployment pipeline finishes before you push the release tag, otherwise the artifacts will be missing.\"\"\"",
                assistantContent:
                "Wait for the deployment pipeline to finish before pushing the release tag, or the artifacts will be missing."
            ),
        ].flatMap { $0 }

        var messages: [ChatMessage] = [
            .init(role: .system, content: abbreviationSystemPrompt),
        ]
        messages.append(contentsOf: englishFewShot)
        messages.append(.init(role: .user, content: prompt))

        return messages
    }

    // MARK: Private

    private let abbreviationSystemPrompt = """
    You are an expert editor who condenses text into a shorter version while keeping the key facts, numbers, entities, and tone. Preserve the original language. Do not drop information that changes the meaning. Only return the abbreviated text, without quotes or notes.
    """

    private func abbreviationPrompt(text: String, in sourceLanguage: Language) -> String {
        "Shorten the following \(sourceLanguage.queryLanguageName) text while preserving the key facts and tone: \"\"\"\(text)\"\"\""
    }
}

// swiftlint:enable line_length
```

- [ ] **Step 2: xcstrings 追加 `abbreviation_service`**

按 Task 2 Step 3 的做法，复制 `polishing_service` 的 xcstrings 块，改 key 与译文：
- `zh-Hans`: "缩写", `zh-Hant`: "縮寫", `en`: "Abbreviation",
  `ja`: "文章の短縮", `ko`: "문장 축약",
  `de`: "Kürzen", `fr`: "Résumer", `es`: "Abreviar", `ru`: "Сократить",
  `it`: "Abbreviare", `pt-BR`: "Abreviar", `tr`: "Kısalt", `vi`: "Rút gọn",
  `ar`: "اختصار"

覆盖 `polishing_service` 存在的全部 locale。

- [ ] **Step 3: 登记 pbxproj**

在 `OpenSiri/Swift/Service/AITool` PBXGroup 里，为 `AbbreviationService.swift` 追加 `PBXFileReference` 和 `PBXBuildFile` 各一条（仿 Task 2 Step 4）。

- [ ] **Step 4: 在 QueryServiceFactory 注册 Abbreviation**

在 `QueryServiceFactory.swift` 已注册的 `.expansion` 行之后追加：

```swift
.init(.abbreviation, AbbreviationService.self, "abbreviation_service", apiKeyRequirement: .builtIn),
```

- [ ] **Step 5: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 6: 提交**

```bash
git add OpenSiri/Swift/Service/AITool/AbbreviationService.swift \
        OpenSiri/Swift/Service/Model/QueryServiceFactory.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(ai-tool): 添加缩写服务

用户在扩写之外还需要一个把冗长段落压缩成简短版本的入口。规划中的缩写功能需要独立的流式服务承载。

新增 AbbreviationService，继承 AIToolService、走内置 AI 后端；在 chatMessageDicts 中提供缩写用 system prompt 与 few-shot；在 QueryServiceFactory 注册为 builtIn key 类型，并补齐 abbreviation_service 本地化 key 的全部 locale。

用户启用该服务后可在主查询窗口获得缩写卡片，与扩写服务一同覆盖两端诉求,后续的快捷键与菜单入口可以复用这条链路。

----------------------------------------------------------------------

feat(ai-tool): add abbreviation service

Beyond expansion, users also need a one-click way to compress verbose text into a shorter version. The planned abbreviation feature needs its own streaming service to carry that flow.

Add AbbreviationService as an AIToolService subclass on the built-in AI backend, with a dedicated system prompt and few-shot examples in chatMessageDicts, register it in QueryServiceFactory as a built-in key service, and fill the abbreviation_service key in every locale of Localizable.xcstrings.

Once the service is enabled, the main query window shows an abbreviation result card. Together with the expansion service it covers both directions, and the follow-up shortcuts and menu items can reuse the same chain.
EOF
)
```

---

## Task 4: 扩写 / 缩写全局快捷键（菜单 + `ShortcutAction` + `ActionManager`）

**Files:**
- Modify: `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift:410`
- Modify: `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`
- Modify: `OpenSiri/Swift/Feature/Shortcut/View/KeyHolderWrapper.swift:138`
- Modify: `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`
- Modify: `OpenSiri/Swift/View/MenuItemView.swift`
- Modify: `OpenSiri/App/Localizable.xcstrings` (`menu_expand_and_replace`, `menu_abbreviate_and_replace`)

**Interfaces:**
- Consumes: `ExpansionService` (Task 2), `AbbreviationService` (Task 3), `PolishingService.chatMessageDicts` 之前的 `executeTextReplacementAction` 骨架。
- Produces:
  - `ShortcutAction.expandAndReplace`, `.abbreviateAndReplace`（列入 `globalActions`）
  - `Defaults.Keys.expandAndReplaceShortcut`, `.abbreviateAndReplaceShortcut`
  - `ActionManager.expandAndReplace()`, `.abbreviateAndReplace()`
  - MenuItemView 中的两个菜单项

- [ ] **Step 1: 在 Defaults.Keys 加两个 Key**

打开 `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift:410`（`polishAndReplaceShortcut` 后一行）插入：

```swift
static let expandAndReplaceShortcut = Key<KeyCombo?>(
    "EZExpandAndReplaceShortcutKey_keyHolder"
)
static let abbreviateAndReplaceShortcut = Key<KeyCombo?>(
    "EZAbbreviateAndReplaceShortcutKey_keyHolder"
)
```

- [ ] **Step 2: 在 `ShortcutAction` 枚举加两个 case**

打开 `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`：

在 `case polishAndReplace`（第 25 行）附近插入：

```swift
case expandAndReplace
case abbreviateAndReplace
```

在 `globalActions`（第 58 行数组）里加：

```swift
.expandAndReplace,
.abbreviateAndReplace,
```

在 `configurations`（第 119 行 map）里加两个条目（放在 `.polishAndReplace` 之后）：

```swift
.expandAndReplace: .init(
    titleKey: "menu_expand_and_replace",
    icon: .arrowUpAndDownAndArrowLeftAndRight,
    defaultsKey: .expandAndReplaceShortcut,
    action: { await ActionManager.shared.expandAndReplace() }
),
.abbreviateAndReplace: .init(
    titleKey: "menu_abbreviate_and_replace",
    icon: .arrowDownRightAndArrowUpLeft,
    defaultsKey: .abbreviateAndReplaceShortcut,
    action: { await ActionManager.shared.abbreviateAndReplace() }
),
```

- [ ] **Step 3: 在 `KeyHolderWrapper.swift:138` 加两条映射**

在 `polishAndReplace: DefaultsKeyWrapper(.polishAndReplaceShortcut),` 附近追加：

```swift
.expandAndReplace: DefaultsKeyWrapper(.expandAndReplaceShortcut),
.abbreviateAndReplace: DefaultsKeyWrapper(.abbreviateAndReplaceShortcut),
```

- [ ] **Step 4: 扩展 `ActionManager` 的 `ProcessingType` 与方法**

打开 `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`：

在 class 内声明新的服务实例（放在 `var polishService = PolishingService()` 附近）：

```swift
var expansionService = ExpansionService()
var abbreviationService = AbbreviationService()
```

将 private `ProcessingType` 枚举改为：

```swift
private enum ProcessingType {
    case translate
    case polish
    case expand
    case abbreviate
}
```

追加两个方法（放在 `polishAndReplace()` 之后）：

```swift
/// Expand selected text and replace it with the expanded result.
func expandAndReplace() async {
    logInfo("Expand and Replace")
    await executeTextReplacementAction(.expand)
}

/// Abbreviate selected text and replace it with the shortened result.
func abbreviateAndReplace() async {
    logInfo("Abbreviate and Replace")
    await executeTextReplacementAction(.abbreviate)
}
```

在 `prepareTranslationRequest` 的 `switch type` 里补两个分支：

```swift
case .expand:
    request.serviceType = expansionService.serviceType().rawValue
case .abbreviate:
    request.serviceType = abbreviationService.serviceType().rawValue
```

- [ ] **Step 5: 在 `MenuItemView` 加菜单项**

打开 `OpenSiri/Swift/View/MenuItemView.swift`。

在 `polishAndReplaceItem.keyboardShortcut(.polishAndReplace)` 后面追加：

```swift
expandAndReplaceItem.keyboardShortcut(.expandAndReplace)
abbreviateAndReplaceItem.keyboardShortcut(.abbreviateAndReplace)
```

在文件靠后 `polishAndReplaceItem` 的 `@ViewBuilder` 定义附近追加：

```swift
@ViewBuilder private var expandAndReplaceItem: some View {
    menuItem(for: .expandAndReplace)
}

@ViewBuilder private var abbreviateAndReplaceItem: some View {
    menuItem(for: .abbreviateAndReplace)
}
```

- [ ] **Step 6: 补齐 xcstrings 的 `menu_expand_and_replace` / `menu_abbreviate_and_replace`**

参照 `menu_polish_and_replace` 的所有 locale：
- `menu_expand_and_replace`: zh-Hans "扩写并替换", zh-Hant "擴寫並替換", en "Expand & Replace", ja "拡張して置換", ko "확장 및 대체", de "Erweitern & ersetzen", fr "Développer et remplacer", es "Expandir y reemplazar", ru "Расширить и заменить", 其余 locale 复制 en 值。
- `menu_abbreviate_and_replace`: zh-Hans "缩写并替换", zh-Hant "縮寫並替換", en "Abbreviate & Replace", ja "短縮して置換", ko "축약 및 대체", de "Kürzen & ersetzen", fr "Résumer et remplacer", es "Abreviar y reemplazar", ru "Сократить и заменить", 其余 locale 复制 en 值。

覆盖 `menu_polish_and_replace` 已存在的全部 locale。

- [ ] **Step 7: 编译**

改动分布在多文件，超过 100 行：

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 8: 提交**

```bash
git add OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift \
        OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift \
        OpenSiri/Swift/Feature/Shortcut/View/KeyHolderWrapper.swift \
        OpenSiri/Swift/Feature/ActionManager/ActionManager.swift \
        OpenSiri/Swift/View/MenuItemView.swift \
        OpenSiri/App/Localizable.xcstrings

git commit -F <(cat <<'EOF'
feat(shortcut): 为扩写和缩写添加全局快捷键与菜单入口

OpenSiri 已经支持翻译并替换和润色并替换两种全局改写动作，扩写和缩写服务上线后同样需要与之对齐的全局入口。这样用户不必打开主窗口就能直接改写选中文本。

在 ShortcutAction 中新增 .expandAndReplace 与 .abbreviateAndReplace 两个全局 case，配套加入 Defaults.Key 与 KeyHolderWrapper 映射；在 ActionManager 中扩展 ProcessingType 与两个新的公开方法，通过 executeTextReplacementAction 复用现有的替换链路；在 MenuItemView 中挂上对应菜单项，并补齐 menu_expand_and_replace 与 menu_abbreviate_and_replace 的全部 locale。

用户可以在设置里为扩写和缩写各自绑定快捷键，通过菜单栏或全局热键直接把选中文本原地替换成新版本。

----------------------------------------------------------------------

feat(shortcut): add global shortcuts and menu entries for expansion and abbreviation

OpenSiri already exposes translate-and-replace and polish-and-replace as global replacement actions, so the newly added expansion and abbreviation services need matching global entry points. Users then get to rewrite selected text without opening the main window.

Add .expandAndReplace and .abbreviateAndReplace to ShortcutAction as global cases, wire matching Defaults.Key entries and KeyHolderWrapper mappings, extend ProcessingType in ActionManager with two public methods reusing executeTextReplacementAction, and mount menu items in MenuItemView with menu_expand_and_replace and menu_abbreviate_and_replace filled for every existing locale.

Users can now bind shortcuts for expansion and abbreviation in settings and trigger in-place replacement of selected text either from the menu bar or from global hotkeys.
EOF
)
```

---

## Task 5: `Skill` 数据模型与 `SkillStore`

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/Model/Skill.swift`
- Create: `OpenSiri/Swift/Feature/Skill/Model/SkillBuiltIn.swift`
- Create: `OpenSiri/Swift/Feature/Skill/Model/SkillStore.swift`
- Modify: `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift` (加 `userSkills`, `activeSkillID`)
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `Defaults`
- Produces:
  - `struct Skill: Codable, Identifiable, Equatable { id, name, icon?, systemPrompt, userPromptTemplate, jsonSchema?, isBuiltIn }`
  - `extension Skill { func renderUserPrompt(text: String, sourceLanguage: String, targetLanguage: String) -> String }`
  - `enum SkillBuiltIn { static let all: [Skill] }` — 8 个内置 Skill（id 使用固定字符串常量：`outline`, `bullet_points`, `rewrite_formal`, `rewrite_casual`, `action_items`, `key_terms`, `qa_pairs`, `translate_notes`）
  - `final class SkillStore: ObservableObject { static let shared; @Published var userSkills: [Skill]; @Published var activeSkillID: String?; var allSkills: [Skill]; func resolve(id: String?) -> Skill; func upsertUserSkill(_ skill: Skill); func deleteUserSkill(id: String); func duplicateAsUserSkill(from: Skill) -> Skill }`

- [ ] **Step 1: 加两个 Defaults Key**

在 `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift` 现有其它 `Data` / `String?` key 附近（可放靠近文件顶部与其它 built-in 服务的 key 一块）：

```swift
static let userSkills = Key<Data>("EZUserSkills", default: Data())
static let activeSkillID = Key<String?>("EZActiveSkillID", default: nil)
```

- [ ] **Step 2: 创建 `Skill.swift`**

Create `OpenSiri/Swift/Feature/Skill/Model/Skill.swift`：

```swift
//
//  Skill.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

/// A preset instruction unit that turns a piece of user text into a
/// specific structured output. A Skill bundles a system prompt, a user
/// prompt template with `{text}` / `{source_lang}` / `{target_lang}`
/// placeholders, and an optional JSON schema. Built-in skills are shipped
/// with the app; user skills live in Defaults.
struct Skill: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var icon: String?
    var systemPrompt: String
    var userPromptTemplate: String
    var jsonSchema: String?
    var isBuiltIn: Bool

    static let placeholderText = "{text}"
    static let placeholderSourceLang = "{source_lang}"
    static let placeholderTargetLang = "{target_lang}"

    /// Resolve the user prompt template by substituting placeholders.
    /// Unknown placeholders are left untouched so the caller can inspect.
    func renderUserPrompt(
        text: String,
        sourceLanguage: String,
        targetLanguage: String
    ) -> String {
        userPromptTemplate
            .replacingOccurrences(of: Skill.placeholderText, with: text)
            .replacingOccurrences(of: Skill.placeholderSourceLang, with: sourceLanguage)
            .replacingOccurrences(of: Skill.placeholderTargetLang, with: targetLanguage)
    }

    var hasSchema: Bool {
        (jsonSchema?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false)
    }
}
```

- [ ] **Step 3: 创建 `SkillBuiltIn.swift`**

Create `OpenSiri/Swift/Feature/Skill/Model/SkillBuiltIn.swift`。

内容包含 8 个 Skill：

```swift
//
//  SkillBuiltIn.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

// swiftlint:disable line_length

/// Built-in skill catalog. Ids are stable identifiers used both in code
/// (for JsonToMarkdown template dispatch) and in user Defaults (for
/// remembering the last selected skill across launches).
enum SkillBuiltIn {
    static let all: [Skill] = [
        outline,
        bulletPoints,
        rewriteFormal,
        rewriteCasual,
        actionItems,
        keyTerms,
        qaPairs,
        translateNotes,
    ]

    static let outline = Skill(
        id: "outline",
        name: "skill.builtin.outline.name",
        icon: "list.bullet.indent",
        systemPrompt: "You produce a hierarchical outline of the user text. Preserve the original language.",
        userPromptTemplate: "Produce an outline in {source_lang} for the following text: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "heading": {"type": "string"},
                  "points": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["heading", "points"]
              }
            }
          },
          "required": ["title", "sections"]
        }
        """#,
        isBuiltIn: true
    )

    static let bulletPoints = Skill(
        id: "bullet_points",
        name: "skill.builtin.bullet_points.name",
        icon: "list.bullet",
        systemPrompt: "You extract the key bullet points from the user text. Preserve the original language.",
        userPromptTemplate: "Extract 3 to 7 bullet points in {source_lang} from: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {"type": "object", "properties": {"points": {"type": "array", "items": {"type": "string"}}}, "required": ["points"]}
        """#,
        isBuiltIn: true
    )

    static let rewriteFormal = Skill(
        id: "rewrite_formal",
        name: "skill.builtin.rewrite_formal.name",
        icon: "text.book.closed",
        systemPrompt: "You rewrite the user text into a formal register while preserving meaning and original language.",
        userPromptTemplate: "Rewrite the following {source_lang} text in a formal register: \"\"\"{text}\"\"\".",
        jsonSchema: nil,
        isBuiltIn: true
    )

    static let rewriteCasual = Skill(
        id: "rewrite_casual",
        name: "skill.builtin.rewrite_casual.name",
        icon: "bubble.left",
        systemPrompt: "You rewrite the user text into a casual, conversational register while preserving meaning and original language.",
        userPromptTemplate: "Rewrite the following {source_lang} text in a casual register: \"\"\"{text}\"\"\".",
        jsonSchema: nil,
        isBuiltIn: true
    )

    static let actionItems = Skill(
        id: "action_items",
        name: "skill.builtin.action_items.name",
        icon: "checklist",
        systemPrompt: "You extract concrete action items from the user text. Preserve the original language.",
        userPromptTemplate: "Extract action items in {source_lang} from: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"task": {"type": "string"}, "owner": {"type": "string"}, "due": {"type": "string"}}, "required": ["task"]}}}, "required": ["items"]}
        """#,
        isBuiltIn: true
    )

    static let keyTerms = Skill(
        id: "key_terms",
        name: "skill.builtin.key_terms.name",
        icon: "character.book.closed",
        systemPrompt: "You extract key terms and give short definitions in the same language as the source.",
        userPromptTemplate: "Extract key terms in {source_lang} with concise definitions from: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {"type": "object", "properties": {"terms": {"type": "array", "items": {"type": "object", "properties": {"term": {"type": "string"}, "definition": {"type": "string"}}, "required": ["term", "definition"]}}}, "required": ["terms"]}
        """#,
        isBuiltIn: true
    )

    static let qaPairs = Skill(
        id: "qa_pairs",
        name: "skill.builtin.qa_pairs.name",
        icon: "questionmark.bubble",
        systemPrompt: "You produce question / answer pairs that a reader could use to study the text. Preserve the original language.",
        userPromptTemplate: "Produce Q/A pairs in {source_lang} for: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {"type": "object", "properties": {"pairs": {"type": "array", "items": {"type": "object", "properties": {"question": {"type": "string"}, "answer": {"type": "string"}}, "required": ["question", "answer"]}}}, "required": ["pairs"]}
        """#,
        isBuiltIn: true
    )

    static let translateNotes = Skill(
        id: "translate_notes",
        name: "skill.builtin.translate_notes.name",
        icon: "text.badge.checkmark",
        systemPrompt: "You translate the user text paragraph by paragraph into the target language and add short notes for tricky terms.",
        userPromptTemplate: "Translate the following {source_lang} text into {target_lang} paragraph by paragraph, and add notes for tricky terms: \"\"\"{text}\"\"\".",
        jsonSchema: #"""
        {"type": "object", "properties": {"paragraphs": {"type": "array", "items": {"type": "object", "properties": {"source": {"type": "string"}, "translation": {"type": "string"}, "notes": {"type": "array", "items": {"type": "string"}}}, "required": ["source", "translation"]}}}, "required": ["paragraphs"]}
        """#,
        isBuiltIn: true
    )
}

// swiftlint:enable line_length
```

- [ ] **Step 4: 创建 `SkillStore.swift`**

Create `OpenSiri/Swift/Feature/Skill/Model/SkillStore.swift`：

```swift
//
//  SkillStore.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Combine
import Defaults
import Foundation

/// Central store for built-in and user skills. Built-in skills are always
/// present and cannot be removed; users may duplicate them, edit the copy,
/// or add new skills that persist to `Defaults[.userSkills]`.
@MainActor
final class SkillStore: ObservableObject {
    static let shared = SkillStore()

    @Published private(set) var userSkills: [Skill]
    @Published var activeSkillID: String? {
        didSet {
            Defaults[.activeSkillID] = activeSkillID
        }
    }

    var builtInSkills: [Skill] { SkillBuiltIn.all }

    var allSkills: [Skill] {
        builtInSkills + userSkills
    }

    private init() {
        let data = Defaults[.userSkills]
        if data.isEmpty {
            self.userSkills = []
        } else if let decoded = try? JSONDecoder().decode([Skill].self, from: data) {
            self.userSkills = decoded
        } else {
            // Corrupted payload — reset to empty and log.
            self.userSkills = []
            Defaults[.userSkills] = Data()
        }
        self.activeSkillID = Defaults[.activeSkillID] ?? SkillBuiltIn.all.first?.id
    }

    /// Look up a skill by id, falling back to the first built-in skill.
    func resolve(id: String?) -> Skill {
        if let id, let hit = allSkills.first(where: { $0.id == id }) {
            return hit
        }
        return SkillBuiltIn.all.first ?? Skill(
            id: "empty",
            name: "empty",
            icon: nil,
            systemPrompt: "",
            userPromptTemplate: Skill.placeholderText,
            jsonSchema: nil,
            isBuiltIn: true
        )
    }

    func upsertUserSkill(_ skill: Skill) {
        var next = userSkills
        if let idx = next.firstIndex(where: { $0.id == skill.id }) {
            next[idx] = skill
        } else {
            next.append(skill)
        }
        userSkills = next
        persist()
    }

    func deleteUserSkill(id: String) {
        userSkills.removeAll { $0.id == id }
        persist()
        if activeSkillID == id {
            activeSkillID = SkillBuiltIn.all.first?.id
        }
    }

    /// Clone a built-in (or any) skill into an editable user skill with a new id.
    func duplicateAsUserSkill(from source: Skill) -> Skill {
        let copy = Skill(
            id: UUID().uuidString,
            name: source.name + " (copy)",
            icon: source.icon,
            systemPrompt: source.systemPrompt,
            userPromptTemplate: source.userPromptTemplate,
            jsonSchema: source.jsonSchema,
            isBuiltIn: false
        )
        upsertUserSkill(copy)
        return copy
    }

    private func persist() {
        do {
            Defaults[.userSkills] = try JSONEncoder().encode(userSkills)
        } catch {
            Defaults[.userSkills] = Data()
        }
    }
}
```

- [ ] **Step 5: 登记 pbxproj**

在 `OpenSiri/Swift/Feature/` PBXGroup 里新增 `Skill` 分组，为其中 `Model` 子分组挂 `Skill.swift`、`SkillBuiltIn.swift`、`SkillStore.swift` 三个 `PBXFileReference` + `PBXBuildFile`。

- [ ] **Step 6: 编译**

Swift 新文件三份 + Defaults 追加，超过 100 行：

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 7: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/Model/Skill.swift \
        OpenSiri/Swift/Feature/Skill/Model/SkillBuiltIn.swift \
        OpenSiri/Swift/Feature/Skill/Model/SkillStore.swift \
        OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(skill): 引入 Skill 数据模型和本地存储

预制 Skill 框架需要一个稳定的数据模型来承载「内容加预制指令加可选 JSON schema」的组合，并且要同时支持内置 Skill 与用户自定义 Skill。

新增 Skill 结构体，字段包括 id、name、icon、systemPrompt、userPromptTemplate、jsonSchema、isBuiltIn，附带 renderUserPrompt 方法完成 text / source_lang / target_lang 占位符替换；SkillBuiltIn 枚举把大纲、要点、正式改写、口语改写、行动项、关键术语、问答对、译文加注 8 个内置 Skill 落成 Swift 常量；SkillStore 在主线程侧承载内置合并、UserDefaults 持久化以及增删改和 activeSkillID 追踪。

数据层就绪后，后续 SkillService 与 UI 层可以直接依赖 SkillStore.shared 而不需要触碰 Defaults 细节。

----------------------------------------------------------------------

feat(skill): introduce Skill data model and local store

The preset Skill framework needs a stable data model that carries the "content plus preset instruction plus optional JSON schema" bundle, and it must support built-in skills as well as user-defined ones.

Add the Skill struct with id, name, icon, systemPrompt, userPromptTemplate, jsonSchema, and isBuiltIn plus a renderUserPrompt helper that substitutes text, source_lang, and target_lang placeholders; the SkillBuiltIn enum ships eight built-in skills (outline, bullet points, formal rewrite, casual rewrite, action items, key terms, Q/A pairs, translation with notes) as Swift constants; SkillStore lives on the main actor and merges built-ins with users, persists to UserDefaults, and tracks activeSkillID.

With the data layer in place, later SkillService and UI code can depend on SkillStore.shared without reaching into Defaults internals.
EOF
)
```

---

## Task 6: `JsonToMarkdown` 渲染器

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/Rendering/JsonToMarkdown.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `Foundation.JSONSerialization`
- Produces:
  - `enum JsonToMarkdown { static func render(schemaHint: String?, jsonString: String) -> String; static func renderFallback(jsonString: String) -> String }`
  - 8 个 schema id 对应的模板函数（`renderOutline` / `renderBulletPoints` / `renderActionItems` / `renderKeyTerms` / `renderQaPairs` / `renderTranslateNotes`；无 schema 的 `rewrite_formal` / `rewrite_casual` 不走此路径）
  - 通用 fallback：递归展开 dict → `**k**: v`，array → 列表，嵌套对象降级 `##` / `###`

- [ ] **Step 1: 创建文件骨架**

Create `OpenSiri/Swift/Feature/Skill/Rendering/JsonToMarkdown.swift`：

```swift
//
//  JsonToMarkdown.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

/// Render a JSON payload into Markdown. When the incoming schema is one of
/// the built-in ones, we use a bespoke template; otherwise we fall back to
/// a generic recursive expansion so the user still sees something useful.
enum JsonToMarkdown {
    static func render(schemaHint: String?, jsonString: String) -> String {
        guard let data = jsonString.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data)
        else {
            return renderParseFailedWarning(rawText: jsonString)
        }

        switch schemaHint {
        case "outline": return renderOutline(object)
        case "bullet_points": return renderBulletPoints(object)
        case "action_items": return renderActionItems(object)
        case "key_terms": return renderKeyTerms(object)
        case "qa_pairs": return renderQaPairs(object)
        case "translate_notes": return renderTranslateNotes(object)
        default: return renderGeneric(object, depth: 1)
        }
    }

    static func renderFallback(jsonString: String) -> String {
        renderParseFailedWarning(rawText: jsonString)
    }

    // MARK: - Templates

    private static func renderOutline(_ object: Any) -> String {
        guard let dict = object as? [String: Any] else {
            return renderGeneric(object, depth: 1)
        }
        var out: [String] = []
        if let title = dict["title"] as? String, !title.isEmpty {
            out.append("# \(title)")
        }
        if let sections = dict["sections"] as? [[String: Any]] {
            for section in sections {
                if let heading = section["heading"] as? String {
                    out.append("## \(heading)")
                }
                if let points = section["points"] as? [String] {
                    for p in points { out.append("- \(p)") }
                }
            }
        }
        return out.joined(separator: "\n")
    }

    private static func renderBulletPoints(_ object: Any) -> String {
        guard let dict = object as? [String: Any],
              let points = dict["points"] as? [String]
        else {
            return renderGeneric(object, depth: 1)
        }
        return points.map { "- \($0)" }.joined(separator: "\n")
    }

    private static func renderActionItems(_ object: Any) -> String {
        guard let dict = object as? [String: Any],
              let items = dict["items"] as? [[String: Any]]
        else {
            return renderGeneric(object, depth: 1)
        }
        var out: [String] = []
        for item in items {
            let task = (item["task"] as? String) ?? ""
            var line = "- [ ] \(task)"
            if let owner = item["owner"] as? String, !owner.isEmpty {
                line += " _(owner: \(owner))_"
            }
            if let due = item["due"] as? String, !due.isEmpty {
                line += " _(due: \(due))_"
            }
            out.append(line)
        }
        return out.joined(separator: "\n")
    }

    private static func renderKeyTerms(_ object: Any) -> String {
        guard let dict = object as? [String: Any],
              let terms = dict["terms"] as? [[String: Any]]
        else {
            return renderGeneric(object, depth: 1)
        }
        return terms.compactMap { entry -> String? in
            guard let term = entry["term"] as? String,
                  let definition = entry["definition"] as? String
            else { return nil }
            return "- **\(term)** — \(definition)"
        }.joined(separator: "\n")
    }

    private static func renderQaPairs(_ object: Any) -> String {
        guard let dict = object as? [String: Any],
              let pairs = dict["pairs"] as? [[String: Any]]
        else {
            return renderGeneric(object, depth: 1)
        }
        var out: [String] = []
        for pair in pairs {
            if let q = pair["question"] as? String {
                out.append("**Q:** \(q)")
            }
            if let a = pair["answer"] as? String {
                out.append("**A:** \(a)")
                out.append("")
            }
        }
        return out.joined(separator: "\n")
    }

    private static func renderTranslateNotes(_ object: Any) -> String {
        guard let dict = object as? [String: Any],
              let paragraphs = dict["paragraphs"] as? [[String: Any]]
        else {
            return renderGeneric(object, depth: 1)
        }
        var out: [String] = []
        for para in paragraphs {
            if let source = para["source"] as? String {
                out.append("> \(source)")
            }
            if let translation = para["translation"] as? String {
                out.append(translation)
            }
            if let notes = para["notes"] as? [String], !notes.isEmpty {
                for note in notes { out.append("- _note:_ \(note)") }
            }
            out.append("")
        }
        return out.joined(separator: "\n")
    }

    // MARK: - Generic

    private static func renderGeneric(_ value: Any, depth: Int) -> String {
        if let dict = value as? [String: Any] {
            var out: [String] = []
            for (k, v) in dict {
                if v is [Any] || v is [String: Any] {
                    out.append(String(repeating: "#", count: min(depth + 1, 6)) + " \(k)")
                    out.append(renderGeneric(v, depth: depth + 1))
                } else {
                    out.append("- **\(k)**: \(String(describing: v))")
                }
            }
            return out.joined(separator: "\n")
        }
        if let array = value as? [Any] {
            return array.map { item -> String in
                if item is [Any] || item is [String: Any] {
                    return renderGeneric(item, depth: depth + 1)
                }
                return "- \(String(describing: item))"
            }.joined(separator: "\n")
        }
        return String(describing: value)
    }

    private static func renderParseFailedWarning(rawText: String) -> String {
        let warning = NSLocalizedString(
            "skill.warning.json_parse_failed",
            comment: ""
        )
        return "> ⚠️ \(warning)\n\n```\n\(rawText)\n```"
    }
}
```

- [ ] **Step 2: 追加本地化 key `skill.warning.json_parse_failed`**

在 `Localizable.xcstrings` 里加入 key：
- zh-Hans: "结构化解析失败，已按纯文本显示"
- zh-Hant: "結構化解析失敗，已顯示原始文字"
- en: "Structured parsing failed; showing raw text"
- ja: "構造化パースに失敗しました。生テキストを表示します"
- ko: "구조화 파싱 실패로 원문을 표시합니다"
- 其余 locale 复制 en 值。

- [ ] **Step 3: 登记 pbxproj**

在 `OpenSiri/Swift/Feature/Skill/Rendering` 新分组下挂 `JsonToMarkdown.swift`。

- [ ] **Step 4: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 5: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/Rendering/JsonToMarkdown.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(skill): 添加 JsonToMarkdown 结构化输出渲染器

Skill 服务需要把大模型返回的 JSON 转成 Markdown 才能复用现有渲染栈，同时要在解析失败或遇到未知 schema 时优雅降级，避免用户看到裸 JSON。

新增 JsonToMarkdown 枚举，为 outline、bullet_points、action_items、key_terms、qa_pairs、translate_notes 六个已知 schema 提供定制模板，其他 schema 走通用递归展开：对象输出 h2/h3 加 key/value 列表，数组输出无序列表。解析失败时输出带有 skill.warning.json_parse_failed 警告的代码块并保留原文，本地化 key 已在 xcstrings 补齐全部 locale。

Skill 服务后续可以直接调用 JsonToMarkdown.render 得到可直接送入 Markdown 卡片的字符串,无需在其他地方内联 JSON 解析逻辑。

----------------------------------------------------------------------

feat(skill): add JsonToMarkdown renderer for structured output

The Skill service needs to turn the model's JSON payload into Markdown so it can reuse the existing rendering stack, and it must degrade gracefully when parsing fails or the schema is unknown so users never see raw JSON.

Add the JsonToMarkdown enum with bespoke templates for the outline, bullet_points, action_items, key_terms, qa_pairs, and translate_notes schemas. Unknown schemas fall back to a generic recursive expansion that emits h2/h3 headings and key/value bullet lists. Parse failures emit a warning block using the skill.warning.json_parse_failed key (added for every locale) plus the raw text in a fenced code block.

The Skill service can now call JsonToMarkdown.render and hand the result directly to the Markdown card, without inlining JSON parsing logic elsewhere.
EOF
)
```

---

## Task 7: `SkillService`

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/Service/SkillService.swift`
- Modify: `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `AIToolService`, `SkillStore.shared`, `JsonToMarkdown`
- Produces:
  - `class SkillService: AIToolService`：`serviceType() = .skill`；`chatMessageDicts` 使用 `SkillStore.shared.resolve(id: activeSkillID)` 拿到当前 Skill 并渲染 system + user prompt
  - 服务对外暴露 `var activeSkillID: String?`：直接读写 `SkillStore.shared.activeSkillID`

- [ ] **Step 1: 创建文件**

Create `OpenSiri/Swift/Feature/Skill/Service/SkillService.swift`：

```swift
//
//  SkillService.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import Foundation

// swiftlint:disable line_length

/// Streams the user text through a preset Skill (built-in or user defined).
/// The active Skill is read from SkillStore; when a Skill declares a JSON
/// schema, the request forces JSON output and the caller renders it back to
/// Markdown via JsonToMarkdown.
@objc(EZSkillService)
class SkillService: AIToolService {
    // MARK: Public

    public override func name() -> String {
        NSLocalizedString("skill_service", comment: "")
    }

    public override func serviceType() -> ServiceType {
        .skill
    }

    /// The currently selected skill id. Reads and writes SkillStore, so
    /// callers do not need to touch Defaults directly.
    @MainActor
    var activeSkillID: String? {
        get { SkillStore.shared.activeSkillID }
        set { SkillStore.shared.activeSkillID = newValue }
    }

    /// The currently resolved skill (falls back to first built-in).
    @MainActor
    var activeSkill: Skill {
        SkillStore.shared.resolve(id: SkillStore.shared.activeSkillID)
    }

    // MARK: Internal

    override func chatMessageDicts(_ chatQuery: ChatQueryParam) -> [ChatMessage] {
        // ChatQueryParam is a value type, so grabbing it here is safe from any actor.
        let (text, sourceLanguage, targetLanguage, _, _) = chatQuery.unpack()
        let skill = MainActor.assumeIsolated { activeSkill }

        let rendered = skill.renderUserPrompt(
            text: text,
            sourceLanguage: sourceLanguage.queryLanguageName,
            targetLanguage: targetLanguage.queryLanguageName
        )

        var system = skill.systemPrompt
        if skill.hasSchema {
            system += "\n\nReply strictly with a JSON object matching the requested schema; do not wrap in prose or code fences."
        }

        return [
            .init(role: .system, content: system),
            .init(role: .user, content: rendered),
        ]
    }
}

// swiftlint:enable line_length
```

- [ ] **Step 2: 在 QueryServiceFactory 注册 Skill**

在 `.abbreviation` 那行之后追加：

```swift
.init(.skill, SkillService.self, "skill_service", apiKeyRequirement: .builtIn),
```

- [ ] **Step 3: 补齐 xcstrings `skill_service`**

- zh-Hans: "Skill", zh-Hant: "Skill", en: "Skill", ja: "スキル", ko: "스킬",
  其它 locale 复制 en 值。
- 同时预先加 8 个内置 Skill 名称的本地化 key（Task 5 引用的 `skill.builtin.*.name`）：
  - `skill.builtin.outline.name`: zh-Hans "生成大纲", en "Outline"
  - `skill.builtin.bullet_points.name`: zh-Hans "提炼要点", en "Bullet Points"
  - `skill.builtin.rewrite_formal.name`: zh-Hans "改写为正式语气", en "Rewrite as Formal"
  - `skill.builtin.rewrite_casual.name`: zh-Hans "改写为口语化", en "Rewrite as Casual"
  - `skill.builtin.action_items.name`: zh-Hans "抽取待办事项", en "Action Items"
  - `skill.builtin.key_terms.name`: zh-Hans "抽取关键术语", en "Key Terms"
  - `skill.builtin.qa_pairs.name`: zh-Hans "生成问答对", en "Q&A Pairs"
  - `skill.builtin.translate_notes.name`: zh-Hans "翻译加注", en "Translate with Notes"
  - 其它 locale 复制 en。

- [ ] **Step 4: 登记 pbxproj**

在 `OpenSiri/Swift/Feature/Skill/Service` 新分组下挂 `SkillService.swift`。

- [ ] **Step 5: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 6: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/Service/SkillService.swift \
        OpenSiri/Swift/Service/Model/QueryServiceFactory.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(skill): 添加 SkillService 承载预制 Skill 流式服务

预制 Skill 需要一条真正的服务链路把「内容加 Skill 指令」跑到大模型端并回吐结构化结果,SkillService 是这条链路的入口。

新增 SkillService，继承 AIToolService 复用内置 AI 后端。activeSkillID 直接读写 SkillStore，chatMessageDicts 里从 SkillStore 取当前 Skill、按占位符渲染 user prompt，并在 Skill 声明 schema 时给 system prompt 追加严格 JSON 输出的约束。SkillService 在 QueryServiceFactory 中以 builtIn key 类型注册，skill_service 与 8 个内置 Skill 的本地化 key 均已补齐。

用户后续可以在主查询窗口挑选 Skill,或者通过菜单栏 Skills 子菜单一键运行,得到经 JsonToMarkdown 渲染的 Markdown 卡片。

----------------------------------------------------------------------

feat(skill): add SkillService as the streaming carrier for preset skills

Preset skills need an actual service pipeline that sends "content plus skill instruction" to the model and receives a structured payload back; SkillService is that entry point.

Add SkillService as an AIToolService subclass reusing the built-in AI backend. activeSkillID directly reads and writes SkillStore, chatMessageDicts fetches the current Skill from SkillStore and renders the user prompt with placeholder substitution, and when the Skill declares a schema the system prompt is extended with a strict JSON output instruction. SkillService is registered in QueryServiceFactory as a built-in key service, and the skill_service key along with the eight built-in skill name keys are filled across all locales.

Users can pick a Skill in the main query window or trigger one from the Skills submenu and see the result rendered as Markdown through JsonToMarkdown.
EOF
)
```

---

## Task 8: 主查询窗口 Skill 选择器 + JSON 到 Markdown 的接入

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/View/SkillPickerView.swift`
- Modify: `OpenSiri/Swift/Feature/Skill/Service/SkillService.swift` (`configurationListItems()`)
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `SkillStore.shared`
- Produces:
  - `struct SkillPickerView: View`：`@ObservedObject var store: SkillStore = .shared`；`Picker("skill.picker.title", selection: $store.activeSkillID)` 列出 `allSkills`
  - `SkillService.configurationListItems()` 返回一个 SwiftUI 视图，头部嵌入 SkillPickerView，后接父类 `StreamConfigurationView`

- [ ] **Step 1: 创建 `SkillPickerView.swift`**

Create `OpenSiri/Swift/Feature/Skill/View/SkillPickerView.swift`：

```swift
//
//  SkillPickerView.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import SwiftUI

/// Compact skill picker for the main query window and the settings pane.
struct SkillPickerView: View {
    @ObservedObject var store: SkillStore = .shared

    var body: some View {
        Picker(
            NSLocalizedString("skill.picker.title", comment: ""),
            selection: Binding(
                get: { store.activeSkillID ?? "" },
                set: { newValue in
                    store.activeSkillID = newValue.isEmpty ? nil : newValue
                }
            )
        ) {
            Section(NSLocalizedString("skill.section.builtin", comment: "")) {
                ForEach(store.builtInSkills) { skill in
                    Text(NSLocalizedString(skill.name, comment: ""))
                        .tag(skill.id)
                }
            }
            if !store.userSkills.isEmpty {
                Section(NSLocalizedString("skill.section.user", comment: "")) {
                    ForEach(store.userSkills) { skill in
                        Text(skill.name).tag(skill.id)
                    }
                }
            }
        }
        .pickerStyle(.menu)
    }
}
```

- [ ] **Step 2: 覆写 `SkillService.configurationListItems()`**

在 `SkillService.swift` 顶部 `import SwiftUI`；替换 `AIToolService` 的默认实现：

```swift
public override func configurationListItems() -> Any {
    VStack(alignment: .leading, spacing: 8) {
        SkillPickerView()
        StreamConfigurationView(
            service: self,
            showCustomNameSection: false,
            showAPIKeySection: false,
            showEndpointSection: false,
            showSupportedModelsSection: false,
            showUsedModelSection: true,
            showCustomPromptSection: false,
            showTranslationToggle: false,
            showSentenceToggle: false,
            showDictionaryToggle: false,
            showUsageStatusPicker: true
        )
    }
}
```

- [ ] **Step 3: 补齐三个本地化 key**

- `skill.picker.title`: zh-Hans "当前 Skill", en "Current Skill"
- `skill.section.builtin`: zh-Hans "内置", en "Built-in"
- `skill.section.user`: zh-Hans "自定义", en "Custom"
- 其它 locale 复制 en。

- [ ] **Step 4: 登记 pbxproj**

在 `OpenSiri/Swift/Feature/Skill/View` 新分组下挂 `SkillPickerView.swift`。

- [ ] **Step 5: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 6: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/View/SkillPickerView.swift \
        OpenSiri/Swift/Feature/Skill/Service/SkillService.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(skill): 主查询窗口 Skill 卡片加入 Skill 选择器

SkillService 已经具备后端能力，但主查询窗口需要一个直观的 Skill 切换入口，用户才能在不进入设置的情况下选择要跑哪个 Skill。

新增 SwiftUI 视图 SkillPickerView，直接绑定 SkillStore.shared，Picker 分组展示内置与自定义 Skill；在 SkillService.configurationListItems 中将 SkillPickerView 与父类的 StreamConfigurationView 组合成新的服务卡片头部；skill.picker.title、skill.section.builtin、skill.section.user 三个本地化 key 已补齐全部 locale。

用户在主窗口的 Skill 卡片顶部可直接切换 Skill,选择会立即写回 SkillStore, 下一次查询即生效。

----------------------------------------------------------------------

feat(skill): add a skill picker on the main-window Skill card

The SkillService is functionally complete, but the main query window still needs a discoverable way to switch skills so users can change what runs without opening the settings panel.

Add the SwiftUI SkillPickerView bound to SkillStore.shared with a segmented Picker showing built-in and user skills; override SkillService.configurationListItems to compose SkillPickerView on top of the parent StreamConfigurationView; fill skill.picker.title, skill.section.builtin, and skill.section.user in every locale.

Users can now switch the active skill from the main-window skill card; the choice is written back to SkillStore immediately and takes effect on the next query.
EOF
)
```

---

## Task 9: Skill 全局菜单 + `ActionManager.applySkill`

**Files:**
- Modify: `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`
- Modify: `OpenSiri/Swift/View/MenuItemView.swift`

**Interfaces:**
- Consumes: `SkillService` (Task 7), `SkillStore.shared`, `JsonToMarkdown` (Task 6), `EZWindowManager` (Mini window)
- Produces:
  - `ActionManager.applySkill(skillId: String)`：
    - 若 Skill 无 schema：走 `executeTextReplacementAction(.skill)` 完成替换
    - 若 Skill 有 schema：跑同样的取文本 → 请求 → 流式累积 → `JsonToMarkdown.render` → 通过 `EZWindowManager.shared().showMiniQueryWindow(withText:)` 展示 Markdown 结果
  - Menu 里新增 `Menu("menu_skills")`，动态列出 `SkillStore.shared.allSkills`；每项调用 `Task { await ActionManager.shared.applySkill(skillId: skill.id) }`

- [ ] **Step 1: `ActionManager` 增加 `.skill(id:)`**

修改 `ProcessingType`：

```swift
private enum ProcessingType {
    case translate
    case polish
    case expand
    case abbreviate
    case skill(id: String)
}
```

在 `class ActionManager` 内部加：

```swift
var skillService = SkillService()
```

`prepareTranslationRequest` 的 `switch type` 增加：

```swift
case .skill:
    request.serviceType = skillService.serviceType().rawValue
```

新增公开方法：

```swift
/// Apply the given Skill to the current selected/focused text.
/// Skills without a schema replace the text in place; skills with a
/// schema pop the result up in the mini window instead.
func applySkill(skillId: String) async {
    logInfo("Apply Skill \(skillId)")
    await MainActor.run {
        SkillStore.shared.activeSkillID = skillId
    }
    let hasSchema = await MainActor.run {
        SkillStore.shared.resolve(id: skillId).hasSchema
    }
    if hasSchema {
        await presentSkillResult(skillId: skillId)
    } else {
        await executeTextReplacementAction(.skill(id: skillId))
    }
}
```

在 private 区块加：

```swift
/// Run the Skill and present the rendered Markdown in the mini window.
private func presentSkillResult(skillId: String) async {
    let enableSelectAll = Defaults[.autoSelectAllTextFieldText]
    let elementInfo = await systemUtility.focusedElementInfo(enableSelectAll: enableSelectAll)
    var queryText = elementInfo.focusedText
    if queryText?.isEmpty ?? true {
        queryText = await systemUtility.getSelectedText()
    }
    guard let queryText, !queryText.isEmpty else {
        logInfo("No text selected/focused for Skill \(skillId), skipping")
        return
    }
    guard let request = await prepareTranslationRequest(
        queryText: queryText,
        type: .skill(id: skillId)
    ) else {
        return
    }
    guard let service = QueryServiceFactory.shared.service(withTypeId: request.serviceType),
          let streamService = service as? StreamService
    else {
        logError("SkillService lookup failed")
        return
    }
    do {
        let stream = try await streamService.contentStreamTranslate(request: request)
        var buffer = ""
        for try await chunk in stream where !chunk.isEmpty {
            buffer += chunk
        }
        let skill = await MainActor.run { SkillStore.shared.resolve(id: skillId) }
        let markdown = skill.hasSchema
            ? JsonToMarkdown.render(schemaHint: skill.id, jsonString: buffer)
            : buffer
        await MainActor.run {
            EZWindowManager.shared().showMiniQueryWindow(withText: markdown)
        }
    } catch {
        logError("Skill stream failed: \(error.localizedDescription)")
    }
}
```

（如果 `EZWindowManager` 上不存在 `showMiniQueryWindow(withText:)` 这个方法，改成调用现有等价方法：先 `EZWindowManager.shared().showMiniFloatingWindow()` 再 `EZWindowManager.shared().updateWindowContent(...)`；实现前用 `grep -n "showMiniFloatingWindow\|updateWindow" OpenSiri/objc/ViewController/Window/WindowManager/EZWindowManager.*` 确认接口名，选择最接近「以给定文本填充 Mini 窗口」的公开方法。若都不合适，则先在 `EZWindowManager` 上加一个薄封装 `func showMiniWindow(withMarkdown text: String)` 并同步更新 pbxproj。）

- [ ] **Step 2: MenuItemView 加 Skills 子菜单**

在 `MenuItemView.swift` 的 `body` 里，`abbreviateAndReplaceItem.keyboardShortcut(.abbreviateAndReplace)` 之后追加：

```swift
skillsMenu

Divider()
```

在同文件靠后处加：

```swift
@ObservedObject private var skillStore: SkillStore = .shared

@ViewBuilder private var skillsMenu: some View {
    Menu(NSLocalizedString("menu_skills", comment: "")) {
        ForEach(skillStore.allSkills) { skill in
            Button {
                Task { await ActionManager.shared.applySkill(skillId: skill.id) }
            } label: {
                let label = skill.isBuiltIn
                    ? NSLocalizedString(skill.name, comment: "")
                    : skill.name
                let suffix = skill.hasSchema
                    ? NSLocalizedString("skill.menu.present_hint", comment: "")
                    : NSLocalizedString("skill.menu.replace_hint", comment: "")
                Text("\(label) — \(suffix)")
            }
        }
    }
}
```

- [ ] **Step 3: 补齐三个 xcstrings key**

- `menu_skills`: zh-Hans "Skills", en "Skills", 其它 locale 复制 en
- `skill.menu.present_hint`: zh-Hans "展示结果", en "Show result"
- `skill.menu.replace_hint`: zh-Hans "替换选中", en "Replace selection"

- [ ] **Step 4: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 5: 提交**

```bash
git add OpenSiri/Swift/Feature/ActionManager/ActionManager.swift \
        OpenSiri/Swift/View/MenuItemView.swift \
        OpenSiri/App/Localizable.xcstrings

git commit -F <(cat <<'EOF'
feat(skill): 菜单栏 Skills 子菜单和 applySkill 全局入口

主查询窗口的 Skill 卡片已可用,但用户还需要一个不打开主窗口就能对选中文本套用 Skill 的入口。同时要根据 Skill 是否声明 schema 走不同的返回方式:无 schema 就地替换,有 schema 用 Mini 窗口展示 Markdown 结果。

在 ActionManager 中扩展 ProcessingType 加入 .skill(id:) 分支,新增 applySkill 与 presentSkillResult 两个方法:前者先写回 activeSkillID 再按 schema 分派,后者累积流式内容后调用 JsonToMarkdown 并弹出 Mini 窗口。MenuItemView 中挂上 Skills 子菜单,动态遍历 SkillStore.allSkills 并根据是否有 schema 显示不同尾标,menu_skills、skill.menu.present_hint、skill.menu.replace_hint 三个本地化 key 已补齐。

用户可以在菜单栏 Skills 子菜单里挑一个 Skill 直接跑,替换或展示行为都符合 Skill 声明,不需要打开主窗口。

----------------------------------------------------------------------

feat(skill): add Skills submenu and applySkill global entry

The main-window Skill card is already usable, but users still need a way to apply a Skill to selected text without opening the main window. The routing must also depend on whether the Skill declares a schema: no schema replaces the text in place, and a schema pops the Markdown result in the mini window.

Extend ProcessingType in ActionManager with .skill(id:), add applySkill and presentSkillResult: the former writes activeSkillID and dispatches based on schema, the latter accumulates the stream, renders through JsonToMarkdown, and shows the mini window. Add a Skills submenu in MenuItemView that iterates SkillStore.allSkills and appends a hint suffix depending on schema; the menu_skills, skill.menu.present_hint, and skill.menu.replace_hint keys are added for every locale.

Users can now pick any Skill from the Skills submenu; the replace-in-place or show-in-mini-window behavior follows the Skill declaration and no main window is required.
EOF
)
```

---

## Task 10: Skill 设置面板（列表 + 编辑器）

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/View/SkillSettingsView.swift`
- Create: `OpenSiri/Swift/Feature/Skill/View/SkillEditorView.swift`
- Modify: `OpenSiri/Swift/Feature/Skill/Service/SkillService.swift` (`configurationListItems()` 追加 Manage 按钮)
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `SkillStore.shared`, `SkillPickerView`
- Produces:
  - `struct SkillSettingsView: View`：Skill 列表，内置行右侧 `Duplicate`，用户行 `Edit` / `Delete`，顶部 `New skill`
  - `struct SkillEditorView: View`：表单 name / icon / systemPrompt / userPromptTemplate / jsonSchema + JSON 语法校验 + `Try` 就地跑一次

- [ ] **Step 1: 创建 `SkillSettingsView.swift`**

Create `OpenSiri/Swift/Feature/Skill/View/SkillSettingsView.swift`：

```swift
//
//  SkillSettingsView.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import SwiftUI

struct SkillSettingsView: View {
    @ObservedObject private var store: SkillStore = .shared
    @State private var editing: Skill?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(NSLocalizedString("skill.settings.title", comment: ""))
                    .font(.headline)
                Spacer()
                Button(NSLocalizedString("skill.action.new", comment: "")) {
                    editing = Skill(
                        id: UUID().uuidString,
                        name: "",
                        icon: nil,
                        systemPrompt: "",
                        userPromptTemplate: Skill.placeholderText,
                        jsonSchema: nil,
                        isBuiltIn: false
                    )
                }
            }
            List {
                Section(NSLocalizedString("skill.section.builtin", comment: "")) {
                    ForEach(store.builtInSkills) { skill in
                        HStack {
                            Text(NSLocalizedString(skill.name, comment: ""))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button(NSLocalizedString("skill.action.duplicate", comment: "")) {
                                let clone = store.duplicateAsUserSkill(from: skill)
                                editing = clone
                            }
                        }
                    }
                }
                Section(NSLocalizedString("skill.section.user", comment: "")) {
                    ForEach(store.userSkills) { skill in
                        HStack {
                            Text(skill.name)
                            Spacer()
                            Button(NSLocalizedString("skill.action.edit", comment: "")) {
                                editing = skill
                            }
                            Button(role: .destructive) {
                                store.deleteUserSkill(id: skill.id)
                            } label: {
                                Text(NSLocalizedString("skill.action.delete", comment: ""))
                            }
                        }
                    }
                }
            }
        }
        .sheet(item: $editing) { skill in
            SkillEditorView(initial: skill) { updated in
                if let updated {
                    store.upsertUserSkill(updated)
                }
                editing = nil
            }
        }
    }
}
```

- [ ] **Step 2: 创建 `SkillEditorView.swift`**

Create `OpenSiri/Swift/Feature/Skill/View/SkillEditorView.swift`：

```swift
//
//  SkillEditorView.swift
//  OpenSiri
//
//  Created by August on 2026-08-06.
//  Copyright © 2026 izual. All rights reserved.
//

import SwiftUI

struct SkillEditorView: View {
    let initial: Skill
    let onDone: (Skill?) -> Void

    @State private var name: String = ""
    @State private var icon: String = ""
    @State private var systemPrompt: String = ""
    @State private var userPromptTemplate: String = Skill.placeholderText
    @State private var jsonSchema: String = ""
    @State private var schemaError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(NSLocalizedString("skill.editor.title", comment: ""))
                .font(.headline)

            LabeledContent(NSLocalizedString("skill.editor.name", comment: "")) {
                TextField("", text: $name)
            }
            LabeledContent(NSLocalizedString("skill.editor.icon", comment: "")) {
                TextField("", text: $icon)
            }
            Text(NSLocalizedString("skill.editor.system_prompt", comment: ""))
            TextEditor(text: $systemPrompt).frame(minHeight: 80)
            Text(NSLocalizedString("skill.editor.user_prompt", comment: ""))
            TextEditor(text: $userPromptTemplate).frame(minHeight: 80)
            Text(NSLocalizedString("skill.editor.schema", comment: ""))
            TextEditor(text: $jsonSchema).frame(minHeight: 120)
            if let schemaError {
                Text(schemaError).foregroundStyle(.red).font(.caption)
            }
            HStack {
                Spacer()
                Button(NSLocalizedString("common.cancel", comment: "")) {
                    onDone(nil)
                }
                Button(NSLocalizedString("common.save", comment: "")) {
                    save()
                }
                .keyboardShortcut(.return)
            }
        }
        .padding()
        .frame(minWidth: 480, minHeight: 480)
        .onAppear {
            name = initial.name
            icon = initial.icon ?? ""
            systemPrompt = initial.systemPrompt
            userPromptTemplate = initial.userPromptTemplate
            jsonSchema = initial.jsonSchema ?? ""
        }
    }

    private func save() {
        let trimmed = jsonSchema.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            let ok = (try? JSONSerialization.jsonObject(with: Data(trimmed.utf8))) != nil
            if !ok {
                schemaError = NSLocalizedString("skill.editor.schema_invalid", comment: "")
                return
            }
        }
        let next = Skill(
            id: initial.id,
            name: name,
            icon: icon.isEmpty ? nil : icon,
            systemPrompt: systemPrompt,
            userPromptTemplate: userPromptTemplate,
            jsonSchema: trimmed.isEmpty ? nil : trimmed,
            isBuiltIn: initial.isBuiltIn
        )
        onDone(next)
    }
}
```

- [ ] **Step 3: 在 SkillService 卡片上加 "Manage skills" 入口**

修改 `SkillService.configurationListItems()`：在 SkillPickerView 之后追加一个按钮，点击时弹出 sheet 承载 `SkillSettingsView()`（用一个 wrapper `View` 承载 `@State var showManager: Bool`）。

具体做法：把 `configurationListItems` 返回值改成一个私有 `View` 结构体 `SkillServiceConfigView(service: SkillService)`，视图里用 `@State private var showManager = false`，Button 触发 `showManager = true`，`.sheet(isPresented: $showManager) { SkillSettingsView() }`。

- [ ] **Step 4: 补齐 xcstrings**

- `skill.settings.title`: zh-Hans "Skill 管理", en "Skill Management"
- `skill.action.new`: zh-Hans "新建", en "New"
- `skill.action.duplicate`: zh-Hans "复制", en "Duplicate"
- `skill.action.edit`: zh-Hans "编辑", en "Edit"
- `skill.action.delete`: zh-Hans "删除", en "Delete"
- `skill.action.manage`: zh-Hans "管理 Skill", en "Manage Skills"
- `skill.editor.title`: zh-Hans "编辑 Skill", en "Edit Skill"
- `skill.editor.name`: zh-Hans "名称", en "Name"
- `skill.editor.icon`: zh-Hans "SF Symbol", en "SF Symbol"
- `skill.editor.system_prompt`: zh-Hans "System Prompt", en "System Prompt"
- `skill.editor.user_prompt`: zh-Hans "用户 Prompt 模板", en "User Prompt Template"
- `skill.editor.schema`: zh-Hans "JSON Schema (可选)", en "JSON Schema (optional)"
- `skill.editor.schema_invalid`: zh-Hans "Schema 不是合法 JSON", en "Schema is not valid JSON"
- `common.cancel`: 若已存在则复用；否则加 zh-Hans "取消", en "Cancel"
- `common.save`: 若已存在则复用；否则加 zh-Hans "保存", en "Save"

对所有 locale 补齐。若 `common.cancel` / `common.save` 已存在，跳过。

- [ ] **Step 5: 登记 pbxproj**

`SkillSettingsView.swift` 与 `SkillEditorView.swift` 挂进 `OpenSiri/Swift/Feature/Skill/View` 分组。

- [ ] **Step 6: 编译**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 7: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/View/SkillSettingsView.swift \
        OpenSiri/Swift/Feature/Skill/View/SkillEditorView.swift \
        OpenSiri/Swift/Feature/Skill/Service/SkillService.swift \
        OpenSiri/App/Localizable.xcstrings \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
feat(skill): 添加 Skill 设置面板与编辑器

用户 Skill 支持已经在数据层就绪,但缺少一个可交互的界面让用户新建、复制或删除 Skill。SkillService 的卡片也需要一个明显的入口通向该界面。

新增 SkillSettingsView 列出内置与用户 Skill:内置行提供 Duplicate 按钮复制为用户 Skill 进入编辑,用户行提供 Edit 与 Delete;新增 SkillEditorView 承载名称、SF Symbol、System Prompt、User Prompt Template、JSON Schema 表单,在保存时对 schema 做 JSON 语法校验并给出错误提示。SkillService 卡片新增 "Manage Skills" 按钮弹出 SkillSettingsView 作为 sheet,skill.settings.*、skill.action.*、skill.editor.* 全套本地化 key 已补齐。

用户可以直接在 OpenSiri 设置里维护自定义 Skill 列表,而不再需要通过导入或手动编辑 UserDefaults 才能定制。

----------------------------------------------------------------------

feat(skill): add skill settings pane and editor

The user-skill data layer is ready, but there is no interactive UI to create, duplicate, or delete skills, and the SkillService card lacks a discoverable entry point into skill management.

Add SkillSettingsView listing built-in and user skills: built-in rows expose a Duplicate button that clones into a user skill and opens the editor, user rows expose Edit and Delete. Add SkillEditorView covering name, SF Symbol, system prompt, user prompt template, and JSON schema, with JSON syntax validation and an inline error when the schema is malformed. The SkillService card gains a Manage Skills button that presents SkillSettingsView in a sheet. All skill.settings.*, skill.action.*, and skill.editor.* keys are filled across locales.

Users can now maintain their custom skill catalog from inside OpenSiri settings without touching UserDefaults or import/export flows.
EOF
)
```

---

## Task 11: 目录说明 HTML + 架构 SVG（`OpenSiri/Swift/Feature/Skill/`）

**Files:**
- Create: `OpenSiri/Swift/Feature/Skill/skill-overview.html`
- Create: `OpenSiri/Swift/Feature/Skill/skill-architecture.svg`
- Modify: `OpenSiri.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: 以上所有 Skill 子模块（Model / Service / Rendering / View）
- Produces: 中文 HTML 概览 + `fireworks-tech-graph` 生成的 SVG 架构图

- [ ] **Step 1: 用 `fireworks-tech-graph` 生成 overview.html + architecture.svg**

调用 `.claude/skills` 里的 `fireworks-tech-graph` skill，输入以下内容作为 concept：

```
OpenSiri Skill 模块架构:
- Model 层: Skill (id/name/icon/systemPrompt/userPromptTemplate/jsonSchema/isBuiltIn), SkillBuiltIn (8 built-in skills), SkillStore (@MainActor, ObservableObject, wraps Defaults[.userSkills] + activeSkillID, exposes allSkills/resolve/upsert/delete/duplicate)
- Service 层: SkillService : AIToolService, chatMessageDicts reads SkillStore.shared.activeSkill, appends JSON schema constraint when Skill.hasSchema
- Rendering 层: JsonToMarkdown enum, dispatches by skill.id, falls back to generic recursion; emits warning block when parse fails
- View 层: SkillPickerView (@ObservedObject SkillStore), SkillSettingsView (list, Duplicate/Edit/Delete), SkillEditorView (form with JSON syntax validation)
- 数据流: user text + activeSkillID → SkillService → StreamService → chunks → (has schema ? accumulate & JsonToMarkdown : direct markdown) → Markdown 卡片 or Mini 窗口
- 入口: 主查询窗口 SkillService 卡片顶部 SkillPickerView + Manage Skills 按钮; 菜单栏 Skills 子菜单 → ActionManager.applySkill
- 失败降级: JSON 解析失败 → renderParseFailedWarning; SkillStore 数据损坏 → 重置为空数组; 活跃 Skill 被删 → 回落到第一个内置 Skill
```

按仓库根规则 `.agents/overrides/fireworks-tech-graph-quality-rules.md`（若存在）执行渲染质量校验。

- [ ] **Step 2: 登记 pbxproj**

将 `skill-overview.html` 和 `skill-architecture.svg` 作为 `PBXFileReference` 挂到 `OpenSiri/Swift/Feature/Skill` 顶层 PBXGroup。这些是开发者文档，**不**要加入 Resources build phase。

- [ ] **Step 3: 提交**

```bash
git add OpenSiri/Swift/Feature/Skill/skill-overview.html \
        OpenSiri/Swift/Feature/Skill/skill-architecture.svg \
        OpenSiri.xcodeproj/project.pbxproj

git commit -F <(cat <<'EOF'
docs(skill): 添加 Skill 目录概览与架构图

Skill 目录聚合了 Model、Service、Rendering、View 四个子层,子模块之间的调用与数据流对新贡献者不直观,需要一份符合仓库要求的中文 HTML 概览与配套 SVG 架构图。

新增 skill-overview.html 阐述 Skill 数据模型、SkillStore 与 Defaults 的绑定、SkillService 与 JsonToMarkdown 的协作、主窗口与菜单入口的调用关系、以及三种失败降级路径;新增由 fireworks-tech-graph 生成的 skill-architecture.svg 展示同一套关系。两份文件均以 skill 前缀挂到 pbxproj 的 Feature/Skill 分组,不进入 Resources build phase。

后续维护者可以从目录页快速理解各文件的责任边界与调用链,不再需要通读全部源码才能定位改动落点。

----------------------------------------------------------------------

docs(skill): add overview and architecture diagram for the Skill module

The Skill module now spans Model, Service, Rendering, and View layers, so its call graph and data flow are hard to grok for new contributors and it needs the mandated Chinese HTML overview plus a matching SVG architecture diagram.

Add skill-overview.html covering the Skill data model, the SkillStore/Defaults binding, the SkillService and JsonToMarkdown handshake, the main-window and menu entry points, and the three fallback paths. Add skill-architecture.svg generated by fireworks-tech-graph to visualize the same relationships. Both files are registered under the Feature/Skill group in pbxproj with the skill prefix and stay out of the Resources build phase.

Future maintainers can start from the overview to grasp each file's responsibility and the call chain instead of reading through the whole module source.
EOF
)
```

---

## Task 12: 完整集成冒烟（Xcode build + 手动测试脚本）

**Files:**
- Modify: 无
- Test: 无自动化（UI 层不加自动测试）

**Interfaces:**
- Consumes: 前 11 个 Task 全部产出
- Produces: 一份手动测试记录 + 一次 Release 构建通过

- [ ] **Step 1: 从头运行 Release 构建**

```bash
xcodebuild build \
  -workspace OpenSiri.xcworkspace \
  -scheme OpenSiri \
  -configuration Release \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/OpenSiri-Temporary | xcbeautify
```

Expected: BUILD SUCCEEDED。清理 DerivedData。

- [ ] **Step 2: 手动运行 App 并按脚本走一遍**

在 Xcode Debug 里跑，按下列步骤逐条勾选（记录在 PR 描述里）：

1. 打开 Settings → Services，找到 Expansion / Abbreviation / Skill 三张卡片，全部启用。
2. 在主查询窗口输入一段 3–5 句英文，验证 Expansion 卡片输出更长版本、Abbreviation 卡片输出更短版本。
3. Skill 卡片顶部下拉切换到「大纲」，重新查询，验证输出为 Markdown 大纲（`# title` / `## heading` / `- point`）。
4. 切换到「改写为正式语气」（无 schema），验证输出为纯文本改写。
5. 打开 Skill 卡片的 Manage Skills → 复制「大纲」为用户 Skill，改名后保存；下拉列表出现「自定义」分组。
6. 编辑该用户 Skill 的 JSON Schema，故意输入非法 JSON `{`，点击 Save，验证出现 `skill.editor.schema_invalid` 错误提示，未保存。
7. 在 Safari 里选中一段英文，按 `⌥ + Cmd + E`（举例给 Expansion 分配一个快捷键前先在 Settings 里绑定），验证选中文本被扩写替换。
8. 类似地验证 Abbreviate 快捷键。
9. 菜单栏 → Skills → 选择「提炼要点」，验证 Mini 窗口弹出 Markdown 结果；选择「改写为口语化」，验证选中文本被替换。
10. 关闭 App，重新打开，验证之前选中的 activeSkillID 仍然是上次的值。

- [ ] **Step 3: 更新 CHANGELOG / release notes**

如仓库有 `CHANGELOG` 或 `docs/` 变更日志文件，在其下追加一段说明本次功能。若无，跳过。

- [ ] **Step 4: 打 PR**

```bash
gh pr create --base dev --title "feat: 扩写 / 缩写 + 预制 Skill 结构化输出" --body-file docs/superpowers/specs/2026-08-06-expansion-abbreviation-skill-design.md
```

（或走仓库自定义的 `git-commit` / `review-pr` skill 流程。）

---

## Self-Review

**Spec 覆盖检查**（对照 `docs/superpowers/specs/2026-08-06-expansion-abbreviation-skill-design.md`）：

- Spec 2.1 In-Scope 全部覆盖：Expansion Task 2；Abbreviation Task 3；SkillService Task 7；Skill 模型 & Store Task 5；JsonToMarkdown Task 6；主窗口 Skill 卡片 Task 8；快捷键/菜单 Task 4 + Task 9；本地化 每个 Task 都补齐了自己引入的 key；`EZEnumTypes` Task 1；工厂注册 Task 2/3/7。
- Spec 5.5 结构化输出与 JsonToMarkdown：Task 6 全部内置 6 个模板 + 通用兜底 + 解析失败 warning。（`rewrite_formal` / `rewrite_casual` 无 schema，不参与渲染，符合 Spec。）
- Spec 5.6 ActionManager 扩展：Task 4（expand/abbreviate） + Task 9（applySkill 分 schema 分支）。
- Spec 5.9 设置面板：Task 10（列表 + 编辑器 + JSON 校验；`Try` 按钮 spec 有提，本计划中未实现，属简化，可作 P1）——**这里与 spec 有偏差**：spec 提到 `Try` 按钮，我把它推到 P1 以缩小交付面。已在 Task 10 提交描述里省略未实现的部分。
- Spec 10 风险表：JSON 半截问题通过 Task 9 「累积到完成再渲染」解决；后端不支持 json_schema 通过 system prompt 约束 + Task 6 fallback 解决；数据损坏由 Task 5 SkillStore 恢复。

**Placeholder 扫描**：全部 Step 都给出了具体代码 / 命令 / 本地化译文，没有 "TBD / 类似 Task N / 参考上文"。Task 9 Step 1 里在 `EZWindowManager` API 上留了一个「若不存在则加薄封装」的分支——这是运行时才能确认的实际情况，已给出具体的确认命令与两条落地路径。

**类型一致性检查**：`Skill.hasSchema`（Task 5 定义、Task 7 & Task 9 & Task 10 使用）；`SkillStore.allSkills` / `builtInSkills` / `userSkills`（Task 5 定义，Task 8 & Task 9 & Task 10 使用一致）；`ExpansionService.serviceType() = .expansion` / `AbbreviationService = .abbreviation` / `SkillService = .skill`（Task 2/3/7 与工厂注册一致）；`JsonToMarkdown.render(schemaHint:jsonString:)`（Task 6 定义，Task 9 调用一致）。

**Scope 偏差**：`SkillEditorView` 缺 `Try` 就地试跑按钮；单元测试留给下一个 agent（符合仓库规则）。其余对齐 spec。

---

Plan complete and saved to `docs/superpowers/plans/2026-08-06-expansion-abbreviation-skill.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

---

TODO:鼠标划词查询改为默认启用，“仅当选中文本语言不是”改为默认留空（所有语言启用），“点击划词查询图标时才查询（需隐藏主窗口）”默认开启。
