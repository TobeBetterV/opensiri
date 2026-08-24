## 2026-08-16 | Task: 采用 OpenSiri 最终品牌 Logo

### User request

使用项目方提供的黑白线条、透明彩色线条和圆角矩形三套 Logo，替换官网和 GOAI
Agent Infra 初赛 PPT 中此前的临时品牌标识。

### Changes

- 官网导航使用透明彩色线条版，页尾使用黑白版，隐私主视觉与 favicon 使用圆角
  矩形版。
- Open Graph 分享卡使用圆角矩形版作为主应用图标，并在回复卡上复用透明彩色线条
  版。
- PNG 渲染脚本改为以项目方提供的最终位图为源，测试改为验证三份源资产及服务端
  渲染结果。
- PPT 保留原有 10 页母版、布局、文字和备注，替换第 1 页封面位图中的旧 Logo
  和第 8 页独立 Logo；封面的 `OpenSiri` 字标及三行主标题进一步拆为原生可编辑
  PowerPoint 文本，右侧 Agent 协作图仍作为图片保留。

### Design intent

三套资源按使用背景分工，不再从单一 SVG 派生全部场景：透明彩色线条版负责主要
品牌识别，黑白版服务浅色单色场景，圆角矩形版用于应用图标与分享卡。PPT 使用
透明彩色线条版，以保持封面白底和隐私页深色背景上的一致识别。

### Validation

- 官网构建通过；服务端渲染与品牌资产测试 2/2 通过。
- 官网 ESLint 通过，无输出。
- 三份 252 × 252 RGBA 官网资产与项目方源文件逐字节一致；1024 × 1024 派生图和
  1200 × 630 Open Graph 分享卡已重新生成并视觉检查。
- PPT 模板一致性检查通过，10 页逐页渲染检查通过，未检测到画布溢出或空占位符。
- 第 2—10 页渲染与修改前逐字节一致；封面四段文案均可在 slide XML 和对象清单中
  解析为原生文本框，来源备注已保留。

### Affected files

- `website/public/opensiri-logo-color.png`
- `website/public/opensiri-logo-mono.png`
- `website/public/opensiri-app-icon.png`
- `website/public/opensiri-logo-color-v2.png`
- `website/public/opensiri-logo-monochrome-v2.png`
- `website/public/og.png`
- `website/app/page.tsx`
- `website/app/layout.tsx`
- `website/app/globals.css`
- `website/scripts/render-logo-pngs.mjs`
- `website/scripts/render-og.mjs`
- `website/tests/rendered-html.test.mjs`
- `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-branded.pptx`

### Deployment

本次品牌替换未执行新的远端发布；仓库内官网产物和品牌版 PPT 已完成。
