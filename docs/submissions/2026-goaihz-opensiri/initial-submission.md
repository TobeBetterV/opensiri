# OpenSiri — GOAI Agent Infra 初赛提交材料

## 项目简介（500 字以内）

OpenSiri 是一个面向 macOS 的开源系统级 AI 入口，复用 OpenSiri 成熟的划词、截图、OCR、全局快捷键、浮窗与文本回写能力，并以 AgentTeams 作为多 Agent 协同基座。首个核心场景是“微信截图智能回复”：用户截取一段微信对话，OpenSiri 在本地完成 OCR、气泡排序、说话人识别与人工校对，仅将完成任务所需的对话文本和最小化用户偏好提交给 AgentTeams。Reply Team Leader 调度对话分析、用户上下文、回复策略、质量验证四个不同职能 Agent，生成简洁、友好、稳妥三条候选回复，并对事实、语气、隐私和过度承诺进行独立检查。用户可查看协作进度与验证证据，最终自主复制或插入回复，首版永不自动发送。项目内置微信截图回复、划词改写、截图行动建议三个 Skill，使同一套捕获、协作、验证和人工审批基础设施可以持续扩展。

## 一句话介绍

截一张图，让一支 Agent 团队帮你想好怎么回。

## 参赛亮点

- **真实多 Agent 分工：** 四个 Worker 的输入、输出、工具和禁止事项不同，Reviewer 可以打回 Strategist 重写。
- **AgentTeams 原生：** OpenSiri 作为 Matrix Human 客户端接入 AgentTeams，不在 App 内自建一套伪编排器。
- **三项内置 Skill：** `wechat-smart-reply`、`selection-rewrite`、`screenshot-action-advisor`。
- **完整人机闭环：** 截图、OCR 校对、上下文最小化、任务拆解、协作状态、验证证据、人工审批、复制/插入与失败恢复。
- **隐私默认值：** 本地 OCR、原始截图默认不上传、凭证进入 Keychain、不同 Agent 只接收任务所需上下文。

## 演示口径

“不用说‘嘿，Siri’，截一张图就行。OpenSiri 不会替你发送，所以也不会替你社死；它会先让四个 Agent 把上下文商量明白，再把三条经验证的回复交给你。”

## 方案边界

- 不读取微信数据库，不注入微信进程，不绕过系统权限。
- 首版不自动点击发送或模拟回车。
- 复赛前主攻微信截图智能回复完整链路；另外两个 Skill 提供可执行合同、Worker Skill 与可重放样例。
- 已知名称风险：`Siri` 是 Apple 商标；参赛阶段按项目名 OpenSiri 推进，正式分发前需要再次完成商标与上架审核。

## 参考链接

- GOAI Agent Infra 赛道：<https://goaihz.com/tracks?track=infra>
- AgentTeams：<https://github.com/agentscope-ai/AgentTeams/>
- OpenSiri：<https://github.com/TobeBetterV/opensiri>
