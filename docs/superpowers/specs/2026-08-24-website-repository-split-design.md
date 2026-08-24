# Website 独立仓库拆分设计

## 目标

将当前仓库中的 `website/` 迁移为公开 GitHub 仓库
`TobeBetterV/opensiri-website`，使官网能够独立开发、测试和部署。新仓库从当前版本
建立首次提交，不保留 `website/` 在 openSiri 仓库中的旧提交历史。

## 已确认决策

- 新仓库名称为 `TobeBetterV/opensiri-website`，可见性为 public。
- 新仓库只保留当前有效源码与运行时配置，不迁移旧 Git 历史。
- `website/` 的内容提升到新仓库根目录。
- openSiri 主仓库删除 `website/`，不添加 Git submodule 或 subtree。
- 官网继续使用现有 Node.js、vinext、Cloudflare 和 OpenAI Sites 配置。
- 新仓库沿用 openSiri 当前的 GNU GPL-3.0 许可。

## 新仓库内容边界

从当前 `website/` 复制应用源码、测试、静态资源、数据库示例、构建辅助代码、
`package.json`、`package-lock.json`、`.openai/hosting.json` 及其他手写配置。现有
`website/README.md` 的 starter 文案改写为 openSiri 官网的项目说明，记录 Node.js
`>=22.13.0`、`npm ci`、开发、lint、build 和 test 命令，并链接回主仓库。

新仓库根目录复制主仓库的 `LICENSE`。`.gitignore` 在现有规则上增加 Claude
worktree、Playwright CLI 输出和 TypeScript 增量编译产物规则。

以下内容不进入新仓库：

- `website/.claude/worktrees/distracted-turing-828f2a` gitlink；
- `website/.playwright-cli/` 下的交互日志和页面快照；
- `website/tsconfig.tsbuildinfo`；
- 已被忽略的 `.DS_Store`、`.vinext/`、`.wrangler/`、`dist/` 和
  `node_modules/`。

新仓库首次提交完成后必须不存在 mode `160000` 的 gitlink，也不能包含上述生成物。

## 主仓库收尾

新仓库推送成功后，从 openSiri 主仓库删除整个 `website/`。根 `readme.md` 删除
website 目录布局和本地开发命令，改为链接公开的新仓库。

主仓库内的参赛演示生成与校验脚本仍需要品牌 PNG。为避免依赖相邻 checkout 或
GitHub 网络，将 `website/public/opensiri-logo-color.png` 和
`website/public/opensiri-logo-mono.png` 复制到 `docs/assets/branding/`，并将
`docs/submissions/2026-goaihz-opensiri/presentation/` 下的活动脚本改为读取新位置。
历史记录、已完成计划和设计文档中的旧 `website/...` 路径保持不变，因为它们描述
的是当时的仓库状态。

## 执行顺序与故障处理

1. 在隔离目录准备无历史的 website 快照，安装锁定依赖并完成验证。
2. 创建公开 GitHub 仓库，提交快照并推送 `main`。
3. 确认远端可读取、根目录结构正确且首次提交不包含旧历史。
4. 再修改 openSiri 主仓库，迁移仍被使用的品牌资源、删除 `website/` 并更新文档。
5. 验证主仓库不再有活动代码引用 `website/`，然后提交主仓库收尾变更。

若 GitHub 未登录或仓库创建失败，保留已经验证的本地新仓库，不删除主仓库中的
`website/`。若新仓库测试失败，先修复快照或报告既有失败，也不进入主仓库删除阶段。

## 验证

新仓库至少执行：

```bash
npm ci
npm run lint
npm run build
npm test
git diff --check
```

`npm test` 当前会再次执行 build，这是预期的重复验证。随后检查 Git 根目录、提交数、
远端 URL、默认分支、ignored 文件状态以及 gitlink 数量。

主仓库至少执行 `git diff --check`，运行参赛演示的既有品牌资源路径校验，并使用
`rg` 确认除历史文档外没有活动路径继续依赖 `website/`。本次不修改 Xcode 管理的
源码或测试，因此不触发 `xcodebuild`。

## 验收标准

- `https://github.com/TobeBetterV/opensiri-website` 是 public 仓库，默认分支为
  `main`，仅有本次迁移形成的新历史。
- 新仓库 checkout 后可通过锁文件安装依赖，并通过 lint、build 和 test。
- `.openai/hosting.json` 的现有 project ID 保持不变。
- openSiri 主仓库不再跟踪 `website/`，也不通过 submodule 依赖新仓库。
- 主仓库 README 能把贡献者导向新的官网仓库，现有参赛演示脚本仍能找到品牌资源。

## 非目标

- 不重新设计官网页面，不升级依赖，不改变数据库或部署绑定。
- 不迁移 GitHub issues、pull requests、Actions secrets、branch protection 或 Pages
  设置，因为 website 当前不是独立仓库且没有这些独立资源。
- 不修改历史文档中用于描述旧仓库状态的路径。
