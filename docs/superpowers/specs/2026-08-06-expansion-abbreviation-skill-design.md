# 扩写 / 缩写 + 预制 Skill（结构化输出）设计

- 状态: Draft (brainstorming approved)
- 日期: 2026-08-06
- 作者: August（Claude 协作）
- 相关代码入口: `OpenSiri/Swift/Service/AITool/`, `OpenSiri/Swift/Feature/ActionManager/`,
  `OpenSiri/Swift/Feature/Shortcut/`, `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift`,
  `OpenSiri/objc/Service/Model/EZEnumTypes.{h,m}`

## 1. 背景与目标

OpenSiri 目前已经有 `PolishingService` 与 `SummaryService` 两个 AI 工具类服务，走
`AIToolService → BuiltInAIService → StreamService`
的继承链，通过 `QueryServiceFactory` 与 `EZServiceType*` 常量注册。
本设计新增两条能力：

1. **扩写 / 缩写**：与 Polish / Summary 同构的两个纯文本流式服务。
2. **预制 Skill 框架（SkillService）**：把「内容 + 一段预制 skill 指令 + 目标结构」
   打包发给大模型，拿回结构化 JSON，再本地转 Markdown 渲染。
   Skill 由「内置 + 用户自定义」两部分组成，用户在设置里可管理。

设计遵循 `AGENTS.md` 中「简单优先」「外科手术式改动」「复用现有模式」原则，
不引入不必要的抽象。

## 2. 范围

### 2.1 In-Scope

- 两个新服务 `ExpansionService` / `AbbreviationService`（对应 `.expansion` / `.abbreviation`）。
- 一个新服务 `SkillService`（对应 `.skill`），承载所有预制 Skill。
- `Skill` 数据模型 + `SkillStore`（内置合并用户自定义，用户部分持久化到 `Defaults`）。
- 结构化 JSON → Markdown 的本地转换器，复用现有 Markdown 卡片渲染。
- 主查询窗口：三个新服务作为可开启的服务卡片；`SkillService` 卡片顶部带 Skill 选择器。
- 全局快捷键 / 菜单：
  - `expandAndReplace` / `abbreviateAndReplace`（与 `polishAndReplace` 同层级）。
  - `applySkill(skillId:)` —— 菜单里以「Skills」二级菜单动态生成。
- 本地化：所有用户可见文案更新到 `Localizable.xcstrings` 全部当前 locales。
- `EZEnumTypes.{h,m}` 三个新 `EZServiceType*` 常量。
- `QueryServiceFactory` 注册三个新服务。

### 2.2 Out-of-Scope

- 不为 Skill 单独设计 UI 结构化卡片（选定 JSON→Markdown 方案）。
- 不引入 Skill 云同步 / 导入导出（后续可选）。
- 不改动现有 Polish / Summary 服务实现。
- 不为 UI 层写单元测试（仓库规则）。
- 不做扩写 / 缩写的 API-key 表单——它们与 Polish / Summary 一样仅使用内置 AI。

## 3. 现状（要点回顾）

- `AIToolService` 继承 `BuiltInAIService`，强制 `apiKeyRequirement = .builtIn`，
  用 `serviceUsageStatusKey` 默认 `.alwaysOff`。
- `PolishingService` / `SummaryService` 通过 override `chatMessageDicts` 生成
  system prompt + few-shot + 用户消息，直接送入 `StreamService` 的
  `contentStreamTranslate`。
- `ActionManager.executeTextReplacementAction(_:ProcessingType)` 统一处理
  「取选中文本 → 检测语言 → 生成 TranslationRequest → 走 StreamService → 流式替换」。
- `ServiceType` 在 objc 头/实现中以 `NSString` 常量形式定义；
  Swift 侧通过 `NS_SWIFT_NAME(ServiceType)` 使用。
- `QueryServiceFactory` 用 `[(ServiceType, QueryService.Type)]` 的静态映射注册。
- `ShortcutAction` 是所有全局 / 应用内快捷键的枚举，配置在
  `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`。

## 4. 方案总览

采用「**两个具体服务 + 一个 Skill 服务**」的融合方案：

- 扩写 / 缩写足够高频，做成独立服务能让它们在服务列表里被单独启用 / 排序，
  并各自拥有独立的快捷键，UX 体验最好。
- 预制 Skill 框架作为长期承载点，用一个 `SkillService` + Skill 目录承载
  N 个 skill，避免为每个 skill 增加 `ServiceType` 常量与工厂条目。

```
QueryServiceFactory
 ├─ .expansion       ─ ExpansionService  : AIToolService
 ├─ .abbreviation    ─ AbbreviationService : AIToolService
 └─ .skill           ─ SkillService      : AIToolService  ──uses──▶ SkillStore
                                                                     ├─ built-in skills (code)
                                                                     └─ user skills (Defaults JSON)
```

Skill 的输出流：

```
User text ──▶ SkillService.chatMessageDicts
                 ├─ pick active Skill from SkillStore
                 ├─ render system + user prompt (变量替换)
                 └─ (可选) 附加 response_format = json_schema
             ──▶ StreamService.contentStreamTranslate
             ──▶ 流式文本
                 ├─ Skill 无 schema  → 直接作为 Markdown 展示
                 └─ Skill 有 schema  → 累积到完整 JSON 后
                                       用 JsonToMarkdown 转换 → Markdown 卡片
```

## 5. 详细设计

### 5.1 目录与文件

```
OpenSiri/Swift/Service/AITool/
  ├─ ExpansionService.swift          # 新增
  ├─ AbbreviationService.swift       # 新增
  ├─ PolishingService.swift          # 保持
  ├─ SummaryService.swift            # 保持
  └─ AIToolService.swift             # 保持

OpenSiri/Swift/Feature/Skill/         # 新增目录（含 overview.html + SVG）
  ├─ Model/
  │   ├─ Skill.swift                  # 数据模型
  │   ├─ SkillBuiltIn.swift           # 内置 Skill 列表
  │   └─ SkillStore.swift             # 内置合并 + 持久化
  ├─ Service/
  │   └─ SkillService.swift           # 继承 AIToolService
  ├─ Rendering/
  │   └─ JsonToMarkdown.swift         # JSON → Markdown 转换
  ├─ View/
  │   ├─ SkillPickerView.swift        # 主窗口顶部下拉
  │   ├─ SkillSettingsView.swift      # 设置面板 Skill 管理
  │   └─ SkillEditorView.swift        # 单个 Skill 表单
  ├─ skill-overview.html               # 目录说明（Chinese HTML）
  └─ skill-architecture.svg            # 由 fireworks-tech-graph 生成
```

同时更新：

- `OpenSiri/objc/Service/Model/EZEnumTypes.h` / `.m`：加
  `EZServiceTypeExpansion` = `@"Expansion"`,
  `EZServiceTypeAbbreviation` = `@"Abbreviation"`,
  `EZServiceTypeSkill` = `@"Skill"`.
- `OpenSiri/Swift/Service/Model/QueryServiceFactory.swift`：在 `serviceRegistrations`
  数组中追加三条 `.init(.expansion, ExpansionService.self, "expansion_service", apiKeyRequirement: .builtIn)`
  / `.init(.abbreviation, AbbreviationService.self, "abbreviation_service", apiKeyRequirement: .builtIn)`
  / `.init(.skill, SkillService.self, "skill_service", apiKeyRequirement: .builtIn, allowsMultipleInstances: false)`。
  `Skill` 服务的「多身份」通过 `SkillStore` + `activeSkillID` 内部承载，
  `allowsMultipleInstances` 保持 `false`，工厂层不感知 Skill 概念。
- `OpenSiri/Swift/Service/OpenAI/ChatMessage.swift`：`AIToolType` 加
  `.expansion`, `.abbreviation`, `.skill`（若基类根据它决定分支）。
- `OpenSiri/Swift/Feature/ActionManager/ActionManager.swift`：加三个方法。
- `OpenSiri/Swift/Feature/Shortcut/Model/ShortcutAction.swift`：加两个新 case。
- `OpenSiri/Swift/Feature/Configuration/Defaults.Keys+Extension.swift`：加
  `.expandAndReplaceShortcut` / `.abbreviateAndReplaceShortcut` / `.userSkills`。
- `Localizable.xcstrings`：所有 locale 补齐新 key。
- `OpenSiri.xcodeproj/project.pbxproj`：所有新增文件挂到对应 `PBXGroup`。

### 5.2 数据模型

```swift
struct Skill: Codable, Identifiable, Equatable {
    let id: String              // UUID; 内置的用固定字符串以便升级迁移
    var name: String            // 显示名（用户可编辑）
    var icon: String?           // SF Symbol 名（可选）
    var systemPrompt: String
    var userPromptTemplate: String   // 支持 {text} / {source_lang} / {target_lang}
    var jsonSchema: String?          // 完整 JSON Schema 字符串；nil 表示纯文本
    var isBuiltIn: Bool
}
```

`SkillStore`：
- 单例 `SkillStore.shared`。
- 启动时 `builtIn + userDefaults[.userSkills]` 合并；`allSkills` 提供顺序稳定。
- 用户 Skill 存 `Defaults[.userSkills]: Data`（JSON 编码的 `[Skill]`）。
- `activeSkillID: Defaults[.activeSkillID]`（`String?`）—— 全局最近使用的 Skill。
- 提供 `resolve(id:)`、`upsertUserSkill(_:)`、`deleteUserSkill(id:)`，
  不允许删除内置项，允许克隆内置项为用户项后编辑。

### 5.3 内置 Skill 清单（首批）

| id | name | schema? |
|---|---|---|
| `outline` | 生成大纲 | ✅ |
| `bullet_points` | 提炼要点 | ✅ |
| `rewrite_formal` | 改写为正式语气 | ❌ |
| `rewrite_casual` | 改写为口语化 | ❌ |
| `action_items` | 抽取待办事项 | ✅ |
| `key_terms` | 抽取关键术语 + 释义 | ✅ |
| `qa_pairs` | 生成问答对 | ✅ |
| `translate_notes` | 逐段翻译 + 术语注释 | ✅ |

内置 Skill 硬编码在 `SkillBuiltIn.swift`，其中 `jsonSchema` 用 Swift raw string
写完整 JSON Schema。用户 Skill 可以任意 schema 或不带 schema。

### 5.4 SkillService

- 继承 `AIToolService`，`serviceType = .skill`，`name` = `NSLocalizedString("skill_service", ...)`。
- 覆写 `chatMessageDicts(_:)`：
  1. 读取当前 request 关联的 skill id（通过 request 附加字段或 `SkillStore.shared.activeSkillID`）。
  2. 变量替换：`{text}` = 用户文本；`{source_lang}` / `{target_lang}` = 检测/配置语言。
  3. 若有 `jsonSchema`，system prompt 追加固定尾巴：
     `Reply strictly with a JSON object matching this schema; do not wrap in prose.`
- 覆写一个新的 hook（若 StreamService 支持 `responseFormat`，走 OpenAI json_schema；
  若不支持则不加），失败回退到纯文本。
- `configurationListItems()`：继承 `AIToolService` 的默认表单，额外插入 SkillPicker 段落
  用于挑选默认 Skill（在设置面板；主窗口卡片也有一个更即时的 picker）。

### 5.5 结构化输出与 JsonToMarkdown

- Skill 带 `jsonSchema` 时：
  - `SkillService` 累积 chunk 到完整字符串。
  - 尝试 `JSONSerialization.jsonObject`。
  - 成功：交给 `JsonToMarkdown.render(schemaHint: skill.id, json:)`；
    对已知 schema（前表 8 个）使用定制模板；否则通用递归展开
    （对象 → `**key**: value`；数组 → 列表；嵌套对象/数组降级为 h2/h3）。
  - 失败：把原始文本作为 Markdown 展示，并附一条 warning 行说明结构化解析失败。
- 主窗口卡片：复用 `OpenSiri/Swift/Feature/Markdown/` 的渲染栈。
- 因为流式 UX：在完整 JSON 到达前先展示 raw 流；到达完成时再一次性替换为渲染后的 Markdown。

### 5.6 ActionManager 扩展

复用 `executeTextReplacementAction(_ type: ProcessingType)`，
将 `ProcessingType` 从 `case translate, polish` 扩为：

```swift
private enum ProcessingType {
    case translate
    case polish
    case expand
    case abbreviate
    case skill(id: String)
}
```

- 每个 case 分派对应 `ServiceType`：
  - `.expand` → `.expansion`
  - `.abbreviate` → `.abbreviation`
  - `.skill(let id)` → `.skill`（同时把 `id` 塞入 request 供 SkillService 读取）
- `Skill` 情况下：**只有当 skill 无 schema 时**执行「替换选中文本」；
  有 schema 的 Skill 触发全局快捷键时改为「弹出 Mini 窗口展示 Markdown 结果」，
  避免把 JSON 写回文档。

新增方法：
- `expandAndReplace()`
- `abbreviateAndReplace()`
- `applySkill(skillId:)`（内部根据 schema 决定 replace 还是 present）

### 5.7 快捷键与菜单

- `ShortcutAction`：新增
  - `expandAndReplace`（`titleKey: "menu_expand_and_replace"`, icon: `.arrowUpAndDownAndArrowLeftAndRight`）
  - `abbreviateAndReplace`（`titleKey: "menu_abbreviate_and_replace"`, icon: `.arrowDownRightAndArrowUpLeft`）
- 两者都归入 `globalActions`。
- Skill 菜单：
  - 在 `MenuItemView.swift` 增加一个 `Menu("menu_skills") { ForEach(store.allSkills) ... }`。
  - Skill 项不使用固定快捷键（用户可在设置里为常用 Skill 单独指派——本次不做，只做菜单入口）。

### 5.8 主查询窗口交互

- 三个服务在服务列表里默认关闭；用户在设置里启用后出现服务卡片。
- `SkillService` 的卡片头部渲染 `SkillPickerView`（下拉），切换后立刻生效并写回
  `SkillStore.shared.activeSkillID`。
- Skill 有 schema 时卡片显示结构化 Markdown；无 schema 时按普通 AI 结果流式渲染。

### 5.9 设置面板

- 在「Services」页新增 Skill 管理入口（或作为 SkillService 卡片的「Manage skills」按钮）。
- `SkillSettingsView`：
  - 列表：内置（灰色行，右侧 `Duplicate` 按钮）+ 用户（可编辑/删除）。
  - 顶部 `New skill`。
  - 编辑器 `SkillEditorView`：name / icon / systemPrompt / userPromptTemplate /
    jsonSchema（Monaco 风格 TextEditor，本地不校验 schema 语法，仅做 JSON 语法校验）。
  - `Try` 按钮：粘贴一段样本文本，就地跑一次并展示结果（本地弹层，不落窗口）。

### 5.10 失败与降级

| 情况 | 处理 |
|---|---|
| StreamService 不支持 json_schema | Skill 请求不附加 responseFormat；提示模型「返回严格 JSON」 |
| JSON 解析失败 | 显示原始文本 + 顶部 warning「结构化解析失败，已按纯文本显示」 |
| Skill 被删除后仍是 activeSkillID | 回退到首个内置 Skill |
| 用户 Skill 数据损坏 | 加载失败时保留内置，`Defaults[.userSkills]` 覆盖为 `[]` 并 log |
| 快捷键触发但无选中/焦点文本 | 与 `polishAndReplace` 一致，直接 return |

## 6. 本地化

新增 String Catalog keys（示例）：

- `menu_expand_and_replace` / `menu_abbreviate_and_replace`
- `service.expansion.name` = "扩写"
- `service.abbreviation.name` = "缩写"
- `service.skill.name` = "Skill"
- `skill.settings.title`, `skill.editor.name`, `skill.editor.prompt`,
  `skill.editor.schema`, `skill.builtin.badge`, `skill.action.try`,
  `skill.action.new`, `skill.action.duplicate`, `skill.action.delete`
- `skill.warning.json_parse_failed`

按仓库规则枚举 `Localizable.xcstrings` 中所有 locale 补齐这些 key，
不做动态拼接、不做键名动态生成。

## 7. 兼容性

- 保持既有服务、快捷键、Defaults 100% 兼容。
- 三个新 `ServiceType` 均为纯新增；启用需要用户手动打开。
- 用户 Skill 数据模型使用 `Codable` 默认策略；未来字段扩展用 `Optional`，
  首版模型即预留 `icon`、`jsonSchema` 为可选。

## 8. 测试策略

- 遵循仓库规则「实现与测试不在同一 agent 会话」。生产代码由本次实现，
  测试由另一个 agent 会话跟进。
- 单元测试目标：
  - `SkillStore`：内置 + 用户合并、增删改、损坏数据回退。
  - `Skill` 模板变量替换（`renderPrompt(text:sourceLanguage:targetLanguage:)`）。
  - `JsonToMarkdown`：内置 8 个 schema 各写 1 条快照；通用递归 3 种典型 JSON 形状。
- 不为 UI 层加测试。

## 9. 交付分期

- **P0**（本 spec 主要范围）：
  - 扩写 / 缩写两个 AI 工具服务（含快捷键、菜单、本地化）。
  - `SkillService` + 8 个内置 Skill（其中 5 个带 schema）。
  - 设置面板 Skill 列表（只支持查看 + Duplicate + 删除/新建/编辑用户 Skill）。
  - `JsonToMarkdown` 通用 + 内置 schema 模板。
  - 目录 overview.html + SVG。
- **P1**（不在本 spec 强制范围，可留 TODO）：
  - Skill 的导入 / 导出 JSON 文件。
  - 为常用 Skill 单独绑定全局快捷键。
  - Skill 的用量统计与最近使用排序。

## 10. 风险

| 风险 | 缓解 |
|---|---|
| 不同 AI 后端对 json_schema 支持差异大 | 一律容错到纯文本；system prompt 显式约束返回 JSON |
| 流式 JSON 用户体验（半截 JSON 无法渲染） | 展示 raw 流 + 完成时切换到结构化 Markdown |
| `EZEnumTypes` 是 objc 头，Swift 无法动态注册 | 用一个 `.skill` 常量承载所有 Skill，用户 Skill 只走数据层 |
| UI 变动波及主查询窗口 | 服务卡片自定义头部使用现有 API，不改主窗口骨架 |
| 单元测试与实现同会话 | 明确约定测试交给下一个 agent |

## 11. 已定的实现细节

1. **Skill id 的传递路径**：不改 `TranslationRequest` 的公共结构。改为在
   `SkillService` 实例上直接存 `activeSkillID`（读写 `SkillStore.shared.activeSkillID`）；
   `ActionManager.applySkill(skillId:)` 在获取到 `SkillService` 实例后先写入
   `activeSkillID`，再调 `contentStreamTranslate`。`SkillService.chatMessageDicts`
   从自身读，`StreamService` 基类 API 保持不动。
2. **Skill 菜单图标区分**：无 schema 项标 `↩︎` 徽标（表示会替换选中文本），
   有 schema 项标 `□` 徽标（表示会在 Mini 窗口展示结构化结果），副标签由
   `Localizable.xcstrings` 提供 `skill.menu.replace_hint` / `skill.menu.present_hint`。

—— END ——
