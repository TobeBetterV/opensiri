# openSiri

截一张图，让一支 Agent 团队帮你想好怎么回。

openSiri 是一款面向 macOS 的开源 AI 入口：本地 OCR 识别微信对话截图，通过
AgentTeams 多个 Agent 协作，生成并验证若干条回复建议。

macOS 客户端从 [Easydict](https://github.com/tisfeng/Easydict) fork 而来，
继承其取词、翻译、OCR 与服务框架，在此基础上叠加 AgentTeams 回复能力。

## 功能演示

#### 菜单栏

![menubar](https://cdn.opensiri.ai/opensiri-menubar.png)

#### 读图

![img-ocr](https://cdn.opensiri.ai/opensiri-show-1.png)

## 邀请测试阶段

openSiri 已经完成了基本的功能，但由于目前很多UI功能不够完善、BUG比较多，为了避免在使用过程中遇到的异常，影响正常的工作，目前 openSiri for Mac 暂时只接受申请测试的用户使用，请联系 tobe_better@outlook.com 加入内测群。

## 目录结构

- `OpenSiri/` — macOS 客户端源码（App / Swift / objc）
- `OpenSiriTests/` — 单元测试与 OCR 样本
- `OpenSiri.xcworkspace` — Xcode 工作区入口（CocoaPods，勿直接开 `.xcodeproj`）
- `website/` — 官网（Next.js / vinext），介绍产品并承载落地页
- `docs/` — 架构、执行计划、用户文档；`docs/inherited/` 存放继承自 Easydict 的说明
- `scripts/` — 构建、发布与统计脚本

## 客户端开发

```bash
pod install
open OpenSiri.xcworkspace
```

首次签名构建前，需在 `OpenSiri.xcconfig` 填入自己的 Apple Developer Team ID。

## 官网开发

```bash
cd website
npm install
npm run dev
```

查看 [`Agent 架构`](https://cdn.opensiri.ai/opensiri-agent-infra-branded-1.pdf)。

查看 [`功能演示`](https://cdn.opensiri.ai/opensiri-agent-infra-branded-1.pdf)。

## 许可与致谢

本项目基于 [Easydict](https://github.com/tisfeng/Easydict)（作者
[tisfeng](https://github.com/tisfeng)）fork，遵循 **GNU GPL-3.0** 许可证，
完整条款见 [LICENSE](LICENSE)。

源码中的 `Copyright © izual` 版权声明、以及指向上游 issue / PR / wiki 的引用
链接均按原样保留。openSiri 与上游 Easydict 项目无隶属关系，请勿就本 fork 的
问题向上游提交 issue。
