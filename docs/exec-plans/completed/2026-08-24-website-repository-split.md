# Website Standalone Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 `website/` 的有效快照迁移到公开仓库 `TobeBetterV/opensiri-website`，验证并推送单提交的 `main`，然后从 openSiri 主仓库移除 website 且保留仍被使用的品牌资源。

**Architecture:** 新仓库从当前 tracked snapshot 创建，不导入原仓库历史，并在临时隔离目录完成清理、验证和首次提交。只有远端仓库创建、推送及读回检查全部成功后，才在 openSiri 的隔离 worktree 中迁移品牌资源、删除 `website/`、更新文档并提交收尾变更。

**Tech Stack:** Git、GitHub CLI、Node.js `>=22.13.0`、npm、vinext、Next.js、Vite、Cloudflare Workers、OpenAI Sites、Node.js test runner。

## Global Constraints

- 目标仓库固定为 public 的 `TobeBetterV/opensiri-website`，默认分支为 `main`。
- 新仓库只包含一次当前快照提交，不迁移 `website/` 的旧 Git 历史。
- 保留 `.openai/hosting.json` 中的 `project_id: appgprj_6a81ad4590688191a468ab88c6ea02b3`。
- 不升级依赖，不修改页面、数据库结构、D1/R2 绑定或部署行为。
- 不迁移 `.claude/`、`.playwright-cli/`、`tsconfig.tsbuildinfo` 或已经 ignored 的构建与依赖输出。
- openSiri 主仓库不使用 submodule 或 subtree；远端新仓库未验证成功前不得删除 `website/`。
- 历史记录、已完成计划和设计文档里的旧 `website/...` 路径保持不变。
- 新仓库与主仓库的提交都调用 `git-commit` Skill，并保持与任务无关的 staged/unstaged 变更不动。
- 所有仓库变更运行 `git diff --check`；本次不修改 Xcode 源码或测试，不运行 `xcodebuild`。

---

### Task 1: Materialize a clean current website snapshot

**Files:**
- Source: `website/**`
- Create outside source repository: `/private/tmp/opensiri-website-migration-20260824/**`

**Interfaces:**
- Consumes: 当前 `HEAD:website` tracked tree。
- Produces: 无 `.git`、无 ignored 输出、可在根目录初始化的新仓库文件树。

- [x] **Step 1: Verify the source repository boundary is clean**

Run:

```bash
git status --short --branch
git rev-parse --show-toplevel
git ls-files -s website/.claude/worktrees/distracted-turing-828f2a
```

Expected: 除本计划外没有未说明变更；仓库根为 openSiri；最后一条显示现有 mode `160000` gitlink。

- [x] **Step 2: Create the exact temporary target directory**

Run:

```bash
test ! -e /private/tmp/opensiri-website-migration-20260824
mkdir /private/tmp/opensiri-website-migration-20260824
git archive --format=tar --output=/private/tmp/opensiri-website-source-20260824.tar HEAD:website
tar -xf /private/tmp/opensiri-website-source-20260824.tar -C /private/tmp/opensiri-website-migration-20260824
```

Expected: 目标目录此前不存在；archive 只导出当前提交已跟踪的 website 内容。

- [x] **Step 3: Remove source-repository-only artifacts from the snapshot**

Resolve exact targets first:

```bash
find /private/tmp/opensiri-website-migration-20260824/.claude /private/tmp/opensiri-website-migration-20260824/.playwright-cli -maxdepth 3 -print 2>/dev/null
test -f /private/tmp/opensiri-website-migration-20260824/tsconfig.tsbuildinfo
```

Then remove only those resolved snapshot targets:

```bash
rm -rf /private/tmp/opensiri-website-migration-20260824/.claude
rm -rf /private/tmp/opensiri-website-migration-20260824/.playwright-cli
rm /private/tmp/opensiri-website-migration-20260824/tsconfig.tsbuildinfo
```

Expected: 应用源码、配置、测试和 public assets 不受影响。

- [x] **Step 4: Initialize an empty-history repository**

Run:

```bash
git init -b main /private/tmp/opensiri-website-migration-20260824
git -C /private/tmp/opensiri-website-migration-20260824 rev-list --all --count
```

Expected: 输出 `0`。

### Task 2: Make the snapshot self-contained

**Files:**
- Create: `/private/tmp/opensiri-website-migration-20260824/LICENSE`
- Modify: `/private/tmp/opensiri-website-migration-20260824/README.md`
- Modify: `/private/tmp/opensiri-website-migration-20260824/.gitignore`

**Interfaces:**
- Consumes: Task 1 的 clean snapshot 和主仓库 `LICENSE`。
- Produces: 能够离开 openSiri 主仓库独立理解、安装和维护的网站根目录。

- [x] **Step 1: Copy the repository license**

Run:

```bash
cp LICENSE /private/tmp/opensiri-website-migration-20260824/LICENSE
cmp LICENSE /private/tmp/opensiri-website-migration-20260824/LICENSE
```

Expected: `cmp` 返回 0，新仓库沿用 GNU GPL-3.0 全文。

- [x] **Step 2: Replace starter README with project documentation**

Use `apply_patch` to make `README.md` contain exactly this project-level structure and commands:

````markdown
# openSiri Website

openSiri 官网与产品落地页。macOS 客户端源码位于
[TobeBetterV/opensiri](https://github.com/TobeBetterV/opensiri)。

## Requirements

- Node.js `>=22.13.0`
- npm（使用仓库中的 `package-lock.json`）

## Development

```bash
npm ci
npm run dev
```

本地服务默认监听 `http://localhost:3000`。

## Checks

```bash
npm run lint
npm run build
npm test
```

`npm test` 会先执行 vinext production build，再验证服务端渲染 HTML。

## Deployment

`.openai/hosting.json` 保存 OpenAI Sites project ID。vinext 和 Cloudflare
Workers 的运行入口分别位于 `vite.config.ts` 与 `worker/index.ts`。

## License

GNU GPL-3.0。完整条款见 [LICENSE](LICENSE)。
````

- [x] **Step 3: Ignore repository-local generated state**

Append these rules to `.gitignore` with `apply_patch`:

```gitignore

# local agent and browser state
/.claude/
/.playwright-cli/

# TypeScript incremental build state
*.tsbuildinfo
```

- [x] **Step 4: Assert the self-contained boundary**

Run from `/private/tmp/opensiri-website-migration-20260824`:

```bash
test -f LICENSE
test -f .openai/hosting.json
test "$(node -p "require('./package.json').engines.node")" = ">=22.13.0"
test ! -e .claude
test ! -e .playwright-cli
test ! -e tsconfig.tsbuildinfo
git check-ignore .claude/example .playwright-cli/example tsconfig.tsbuildinfo node_modules/example
```

Expected: 所有 `test` 返回 0，`git check-ignore` 列出四个示例路径。

### Task 3: Verify and create the single snapshot commit

**Files:**
- Test: `/private/tmp/opensiri-website-migration-20260824/tests/rendered-html.test.mjs`
- Verify: 新仓库全部 tracked files。

**Interfaces:**
- Consumes: Task 2 的 self-contained tree 和 `package-lock.json`。
- Produces: 本地 `main` 上恰好一个通过检查的首次提交。

- [x] **Step 1: Install exactly the locked dependencies**

Run:

```bash
cd /private/tmp/opensiri-website-migration-20260824
npm ci
```

Expected: 安装成功且 `package-lock.json` 无变更。

- [x] **Step 2: Run website checks**

Run:

```bash
npm run lint
npm run build
npm test
```

Expected: lint、两次 vinext build 和 rendered HTML test 全部通过。

- [x] **Step 3: Verify the staged file boundary before committing**

Run:

```bash
git add .
git status --short
git diff --cached --check
git ls-files -s | awk '$1 == "160000" { print $4 }'
git ls-files | rg '(^|/)(\.claude|\.playwright-cli)(/|$)|tsconfig\.tsbuildinfo$' || true
```

Expected: staged files只包含源码、配置、文档、测试与静态资源；后三个检查无输出。

- [x] **Step 4: Create the initial commit with `git-commit`**

Use bilingual Angular message with subject:

```text
chore(repo): 建立独立官网仓库
```

English subject:

```text
chore(repo): initialize standalone website repository
```

Expected: `main` 创建一个 root commit。

- [x] **Step 5: Prove that the repository has no imported history**

Run:

```bash
test "$(git rev-list --count HEAD)" -eq 1
test "$(git rev-list --max-parents=0 --count HEAD)" -eq 1
git status --short --branch
```

Expected: 两个计数均为 1，工作树干净。

### Task 4: Create and publish the GitHub repository

**Files:**
- External repository: `https://github.com/TobeBetterV/opensiri-website`
- Local Git config: `/private/tmp/opensiri-website-migration-20260824/.git/config`

**Interfaces:**
- Consumes: Task 3 的单提交 `main`。
- Produces: public GitHub repository、`origin` remote 和已推送的 `main`。

- [x] **Step 1: Check authentication and target nonexistence**

Run:

```bash
gh auth status
gh repo view TobeBetterV/opensiri-website --json nameWithOwner,visibility,defaultBranchRef
```

Expected: GitHub 已认证；第二条在首次执行时报告仓库不存在。若仓库已存在，停止并检查 owner、visibility、commit count，不覆盖未知内容。

- [x] **Step 2: Authenticate without collecting credentials if needed**

If Step 1 shows no authenticated host, run:

```bash
gh auth login --hostname github.com --git-protocol ssh --web
```

Expected: 用户在 GitHub 页面完成授权，`gh auth status` 随后成功；Agent 不读取或记录密码/token。

- [x] **Step 3: Create an empty public remote and push**

Run:

```bash
gh repo create TobeBetterV/opensiri-website --public --source /private/tmp/opensiri-website-migration-20260824 --remote origin --push
```

Expected: GitHub 不创建额外 README/LICENSE，local `main` 成为 `origin/main`。

- [x] **Step 4: Read back the published repository**

Run:

```bash
gh repo view TobeBetterV/opensiri-website --json nameWithOwner,visibility,defaultBranchRef,url
git -C /private/tmp/opensiri-website-migration-20260824 ls-remote --heads origin main
git -C /private/tmp/opensiri-website-migration-20260824 status --short --branch
```

Expected: `nameWithOwner` 正确、visibility 为 `PUBLIC`、默认分支为 `main`、remote SHA 等于 local `HEAD`、工作树干净。

### Task 5: Remove website coupling from the openSiri repository

**Files:**
- Create: `docs/assets/branding/opensiri-logo.png`
- Create: `docs/assets/branding/opensiri-logo-mono.png`
- Modify: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs`
- Modify: `docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs`
- Modify: `readme.md`
- Delete: `website/**`

**Interfaces:**
- Consumes: 已验证的 remote website repository 和当前 website 品牌 PNG。
- Produces: 不依赖 website checkout 的 openSiri 主仓库。

- [x] **Step 1: Preserve presentation-owned brand assets before deletion**

Run from the isolated openSiri worktree:

```bash
mkdir -p docs/assets/branding
cp website/public/opensiri-logo-color.png docs/assets/branding/opensiri-logo.png
cp website/public/opensiri-logo-mono.png docs/assets/branding/opensiri-logo-mono.png
cmp website/public/opensiri-logo-color.png docs/assets/branding/opensiri-logo.png
cmp website/public/opensiri-logo-mono.png docs/assets/branding/opensiri-logo-mono.png
```

Expected: 两个 `cmp` 均返回 0。

- [x] **Step 2: Point presentation scripts at repository-owned assets**

Use `apply_patch` to make the build script mapping exactly:

```js
const LOGOS = Object.freeze({
  color: path.join(ROOT, "docs/assets/branding/opensiri-logo.png"),
  mono: path.join(ROOT, "docs/assets/branding/opensiri-logo-mono.png"),
});
```

In the same build script, replace both presentation-note source strings with:

```js
"Logo: docs/assets/branding/opensiri-logo.png"
```

Change the verifier's `allowedLogoPath` suffix to:

```js
"../../../../docs/assets/branding/opensiri-logo.png"
```

- [x] **Step 3: Replace README website-directory instructions with the external repository**

In `## 目录结构`, remove the `website/` entry and add:

```markdown
- [官网仓库](https://github.com/TobeBetterV/opensiri-website) — Next.js / vinext 产品落地页
```

Replace the `## 官网开发` command block with:

```markdown
## 官网开发

官网已经拆分到独立仓库：
[TobeBetterV/opensiri-website](https://github.com/TobeBetterV/opensiri-website)。
```

- [x] **Step 4: Delete the resolved website tree only after remote verification**

Run:

```bash
git status --short website
git rm -r -- website
```

Expected: 删除清单只位于 `website/`；`docs/assets/branding/` 中的副本继续存在。

### Task 6: Verify, document, commit, and publish the source-repository cleanup

**Files:**
- Create: `docs/histories/2026-08/20260824-website-repository-split.md`
- Move: `docs/exec-plans/active/2026-08-24-website-repository-split.md` to `docs/exec-plans/completed/2026-08-24-website-repository-split.md`
- Verify: files changed in Task 5。

**Interfaces:**
- Consumes: Task 5 的 detached source tree 和 Task 4 的 published URL。
- Produces: 可审查、可合并并可推送的 openSiri 收尾提交和历史记录。

- [x] **Step 1: Check source and active-reference boundaries**

Run:

```bash
test ! -e website
test -f docs/assets/branding/opensiri-logo.png
test -f docs/assets/branding/opensiri-logo-mono.png
rg -n 'website/public|cd website|`website/`' readme.md docs/submissions scripts .github || true
node --check docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs
node --check docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs
git diff --check
```

Expected: `rg` 无活动引用；两个脚本语法通过；diff check 无输出。

- [x] **Step 2: Rebuild and verify the presentation asset path**

Run:

```bash
mkdir -p /private/tmp/opensiri-website-split-verification/rendered
NODE_PATH=/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs /private/tmp/opensiri-website-split-verification/openSiri.pptx /private/tmp/opensiri-website-split-verification/rendered /private/tmp/opensiri-website-split-verification/inspect.ndjson 19
NODE_PATH=/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs /private/tmp/opensiri-website-split-verification/openSiri.pptx
```

Expected: 构建 19 页 deck；verifier 报告 19 slides、19 notes、2 images，并确认 logo SHA-256。

- [x] **Step 3: Write the repository history record**

Create `docs/histories/2026-08/20260824-website-repository-split.md` from `docs/histories/template.md` with:

- 用户请求：官网迁移到独立 public GitHub 仓库，不保留历史；
- Changes：新仓库 URL、首次提交、排除的生成物、主仓库删除与品牌资源新位置；
- Design intent：远端先验证成功再删除源目录，不使用 submodule；
- Validation：记录 Task 3、4、6 的实际命令和结果；
- Affected files：README、两份 presentation scripts、branding assets、plan 和 website 删除；
- Follow-ups：`None`，除非 GitHub 返回尚未处理的仓库设置限制。

- [x] **Step 4: Complete the execution plan**

Mark every completed checkbox, then move with:

```bash
mv docs/exec-plans/active/2026-08-24-website-repository-split.md docs/exec-plans/completed/2026-08-24-website-repository-split.md
```

- [x] **Step 5: Review and commit the openSiri cleanup**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Stage only this task's paths and invoke `git-commit` with bilingual subjects:

```text
chore(repo): 将官网迁移到独立仓库
```

```text
chore(repo): move website to standalone repository
```

Expected: commit includes website deletion, README link, local branding assets, script path updates, completed plan and history record only。

- [x] **Step 6: Integrate and push the source repository**

Use `worktree-rebase-merge` to rebase the task branch onto current `main`, resolve only task-related conflicts, merge from the main worktree, rerun `git diff --check`, then push:

```bash
git push origin main
```

Expected: `origin/main` contains the design commit and cleanup commit; `git status --short --branch` is clean and not ahead/behind。
