# openSiri

截一张图，让一支 Agent 团队帮你想好怎么回。

openSiri 是一款面向 macOS 的开源 AI 入口：本地 OCR 识别微信对话截图，通过
AgentTeams 多个 Agent 协作，生成并验证若干条回复建议。

## 功能演示

#### 菜单栏

![menubar](https://cdn.opensiri.ai/opensiri-menubar.png)

#### 

## 邀请测试阶段

openSiri 已经完成了基本的功能，但由于目前很多UI功能不够完善、BUG比较多，为了避免在使用过程中遇到的异常，影响正常的工作，目前 openSiri for Mac 暂时只接受申请测试的用户使用，请联系 tobe_better@outlook.com 加入内测群。

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
