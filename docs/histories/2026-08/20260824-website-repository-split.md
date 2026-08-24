## 2026-08-24 | Task: 将官网迁移到独立仓库

**Links:** [执行计划](../../exec-plans/completed/2026-08-24-website-repository-split.md)、[独立官网仓库](https://github.com/TobeBetterV/opensiri-website)

### User request

将 `website/` 从 openSiri 主仓库迁移到新的公开 Git 仓库，不保留原目录的提交历史，并在确认远端可用后从主仓库移除官网代码。

### Changes

- 建立公开仓库 `TobeBetterV/opensiri-website`，以单个根提交导入官网源代码、许可证和独立说明文档。
- 排除原仓库专用的 worktree gitlink、浏览器调试产物和生成缓存；更新两项已过期的渲染测试断言，使独立仓库检查与当前页面资源一致。
- 从主仓库删除 `website/`，并将 README 中的官网开发入口改为独立仓库链接。
- 将演示文稿使用的彩色与单色 Logo 迁移到 `docs/assets/branding/`，同步修正构建脚本、校验脚本和拆分文档中的路径。

### Design intent

独立仓库采用无历史快照，而不是 subtree 或 submodule，以保持官网与 macOS 客户端的发布、依赖和 CI 边界独立。主仓库删除动作只在远端提交 SHA、公开可见性和完整构建测试均得到确认后执行；演示文稿所需品牌资产归属主仓库文档目录，避免重新引入跨仓库运行时依赖。

### Validation

- `npm ci && npm run lint && npm run build && npm test`：独立官网仓库全部通过，测试 2/2 通过。
- `git rev-list --count HEAD`：独立官网仓库只有 1 个根提交 `0965c43ca30b7306234c3939c9191abae43a9745`。
- `git ls-remote git@github.com:TobeBetterV/opensiri-website.git refs/heads/main`：远端 `main` 与本地根提交一致。
- GitHub 未登录页面检查：仓库公开可访问，默认分支为 `main`。
- 演示文稿完整构建与验证：19 页全部通过章节顺序、备注、图片边界、可编辑结构和媒体哈希检查。
- `test ! -e website`、活动引用扫描、`node --check` 和 `git diff --check`：全部通过。

### Affected files

- `website/`
- `readme.md`
- `docs/assets/branding/`
- `docs/submissions/2026-goaihz-opensiri/presentation/`
- `docs/superpowers/specs/2026-08-24-website-repository-split-design.md`
- `docs/exec-plans/completed/2026-08-24-website-repository-split.md`

### Follow-ups

None
