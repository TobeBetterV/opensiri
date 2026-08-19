# openSiri

截一张图，让一支 Agent 团队帮你想好怎么回。

openSiri 是一款面向 macOS 的开源 AI 入口：本地 OCR 识别微信对话截图，通过
AgentTeams 多个 Agent 协作，生成并验证若干条回复建议。

## 目录结构

- `website/` — 官网（Next.js / vinext），介绍产品并承载落地页
- macOS 客户端代码尚未加入本仓库

## 官网开发

```bash
cd website
npm install
npm run dev
```

查看 [`Agent 架构`](https://cdn.opensiri.ai/opensiri-agent-infra-branded-1.pdf)。

查看 [`功能演示`](https://cdn.opensiri.ai/opensiri-agent-infra-branded-1.pdf)。
