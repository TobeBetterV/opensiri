# OpenSiri Agent Infra Initial PPT Framework Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 19-slide, fully editable OpenSiri initial-submission deck that follows the Agent Infra scoring framework while retaining the OpenSiri brand and centering WeChat screenshot reply suggestions.

**Architecture:** Generate the deck from a repository-owned JavaScript source using `@oai/artifact-tool`. The generator will draw all text, diagrams, cards, state flows, and architecture elements as native PowerPoint objects; only the project-owner supplied OpenSiri logo may remain raster. A separate verifier will import the exported PPTX, assert structural and editability invariants, and emit an inspection record before visual QA.

**Tech Stack:** JavaScript ES modules, `@oai/artifact-tool`, bundled Node.js runtime, bundled presentation rendering tools, bundled Python visual QA tools.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md` exactly.
- Preserve `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-branded.pptx` as the 10-slide compact edition.
- Create `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx` as the 19-slide submission edition.
- Keep the slide size at 1280 × 720 pixels, equivalent to 16:9.
- Keep every title, paragraph, score badge, architecture label, flow label, timeline entry, and team field editable.
- Use images only for the supplied OpenSiri logo; never place a rendered full-slide image behind editable text.
- Use `wechat-smart-reply` as the primary Skill and include `selection-rewrite` and `screenshot-action-advisor` as the other two built-in Skills.
- Show AgentTeams as the collaboration baseline through Matrix Human Client, Team Leader, four Workers, shared state, Reviewer rejection, retry limits, and human approval.
- Distinguish `已完成`, `正在推进`, and `计划验证`; do not invent performance numbers, runtime evidence, users, testimonials, repositories, demo URLs, or team credentials.
- Use exact editable team field labels: `姓名 / NAME`, `身份或单位 / ROLE`, `相关经历 / EXPERIENCE`, `本项目分工 / RESPONSIBILITY`, `GitHub / PORTFOLIO`, and `联系方式 / CONTACT`.
- Do not stage or commit files: repository governance forbids commits without explicit authorization.
- Preserve all unrelated staged and unstaged changes.

---

## File Map

- Create: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs` — brand tokens, drawing primitives, 19 slide builders, source notes, rendering, inspection, and PPTX export.
- Create: `docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs` — deterministic assertions for slide count, required editable text, image bounds, notes, and chapter order.
- Create: `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx` — final editable deck.
- Create: `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx.inspect.ndjson` — final structural inspection output.
- Modify: `docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md` — change status from `设计已确认，待制作` to `已实现并验证` only after all checks pass.
- QA output, not retained in the repository: `/private/tmp/opensiri-initial-submission-qa/` — slide PNGs, layout JSON, montage, and test renders.

## Task 1: Create the Reproducible Presentation Design System

**Files:**
- Create: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs`

**Interfaces:**
- Consumes: `website/public/opensiri-logo.png` and `website/public/opensiri-logo-mono.png`.
- Produces: `buildDeck({ outputPath, renderDir, inspectPath, maxSlides }): Promise<void>` and slide-builder functions `buildSlide01` through `buildSlide19`.

- [ ] **Step 1: Create the source file with imports, tokens, and CLI contract**

Use this public contract:

```js
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = process.cwd();
const OUTPUT = process.argv[2];
const RENDER_DIR = process.argv[3];
const INSPECT_PATH = process.argv[4];
const MAX_SLIDES = Number(process.argv[5] ?? 19);

assert(OUTPUT, "output pptx path is required");
assert(RENDER_DIR, "render directory is required");
assert(INSPECT_PATH, "inspect path is required");
assert(Number.isInteger(MAX_SLIDES) && MAX_SLIDES >= 1 && MAX_SLIDES <= 19);
```

Define `W = 1280`, `H = 720`, OpenSiri color tokens (`paper`, `white`, `ink`, `muted`, `line`, `blue`, `mint`, `paleBlue`, `paleMint`, `orange`, `dark`) and fonts (`Arial`, `Hiragino Sans GB`, `Menlo`).

- [ ] **Step 2: Implement native-shape primitives**

Implement these exact helpers in the same file:

```js
addBox(slide, { x, y, w, h, fill, stroke, strokeWidth, radius })
addText(slide, { value, x, y, w, h, size, color, bold, family, align, valign, name })
addRule(slide, { x, y, w, h, color })
addDot(slide, { x, y, d, fill, stroke })
addArrow(slide, { x1, y1, x2, y2, color, width, endArrow })
addGrid(slide, { dark })
addChrome(slide, { number, section })
addLogo(slide, { variant, x, y, w, h })
addSectionCover(slide, { chapter, title, score, promise })
setNotes(slide, { presenter, sources })
```

Every textbox must use `autoFit: "shrinkText"`, explicit insets, and a descriptive `name`. `addLogo` must load only the two declared logo files and set meaningful alt text.

- [ ] **Step 3: Implement four representative smoke slides**

Implement `buildSlide01`, `buildSlide02`, `buildSlide04`, and `buildSlide09` first so the style system exercises a cover, dense overview, section divider, and multi-agent diagram. Use exact editable strings from the confirmed spec, including `OpenSiri`, `截一张图，让一支 Agent 团队帮你想好怎么回`, `场景与价值`, `25%`, `TEAM LEADER`, and `QUALITY REVIEWER`.

- [ ] **Step 4: Export a four-slide smoke deck to the temporary QA directory**

Run:

```bash
NODE_PATH=/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs \
/private/tmp/opensiri-initial-submission-qa/style-smoke.pptx \
/private/tmp/opensiri-initial-submission-qa/style-smoke-render \
/private/tmp/opensiri-initial-submission-qa/style-smoke.inspect.ndjson \
4
```

The `maxSlides=4` path must render the four representative builders in their canonical slide-number order and export exactly four slides.

- [ ] **Step 5: Inspect the smoke montage**

Open `/private/tmp/opensiri-initial-submission-qa/style-smoke-render/deck-montage.webp` and verify: the cover has native text, the overview remains readable at montage scale, the section divider exposes its score badge, and Agent/connector labels do not overlap.

- [ ] **Step 6: Record the review checkpoint without staging files**

Run `git status --short` and confirm only the new presentation source, approved specification/plan files, and pre-existing unrelated user changes are visible.

## Task 2: Build Slides 01–09 Around the Scoring Narrative

**Files:**
- Modify: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs`

**Interfaces:**
- Consumes: Task 1 drawing primitives and `buildDeck` orchestration.
- Produces: the first nine canonical slide builders in this exact order: cover, one-page overview, contents, Scene/Value divider, Scene/Value content, Solution divider, Architecture, Multi-Agent divider, Multi-Agent mechanism.

- [ ] **Step 1: Finish slides 01–03**

Use these exact slide jobs:

```text
01 Cover — OpenSiri promise, OpenSiri × AgentTeams subtitle, contest line, editable personal field
02 P0 Overview — six cards: project, problem, solution, differentiation, reuse value, current progress
03 Contents — eight numbered chapters matching the official framework
```

Slide 02 must label current state as `方案与材料已完成 / 工程实现按计划推进`, not as a running product claim.

- [ ] **Step 2: Finish slides 04–05**

Slide 04 is the `场景与价值 / 25%` divider with the line `先从最难回的一句话开始`.

Slide 05 uses a native WeChat-style conversation mockup on the left and three problem statements on the right:

```text
看懂上下文，不等于知道该怎么回
同一句话，要结合关系、目的和表达习惯
用户需要建议，但不希望 AI 越权发送
```

The mockup must be labeled `对话示意 / 非真实微信截图` so it cannot be mistaken for a product capture.

- [ ] **Step 3: Finish slides 06–07**

Slide 06 is the `方案总览` divider. Slide 07 draws two explicit planes with native shapes:

```text
OpenSiri / OpenSiri Experience Plane
快捷键 → 截图 → 本地 OCR → 气泡排序 → 人工校正 → 浮窗 → 复制 / 插入

AgentTeams Collaboration Plane
Matrix Human Client → Team Leader → Worker Agents → Reviewer → evidence/log

ConversationContext → ReplyBundle
```

Place a dashed privacy boundary between local and remote processing and label it `最小必要上下文`.

- [ ] **Step 4: Finish slides 08–09**

Slide 08 is the `多 Agent 协同设计 / 25%` divider. Slide 09 must show:

```text
Conversation Analyst
User Context Agent
Reply Strategist
Quality Reviewer
Team Leader
shared run state
Reviewer 拒绝 → Strategist 重写（最多 2 次）
Worker 超时 → 降级结果 + 风险提示
用户批准 → 复制 / 插入；绝不自动发送
```

Connectors must be drawn before nodes so they remain behind the cards.

- [ ] **Step 5: Export and inspect the nine-slide checkpoint**

Run the generator with `maxSlides=9` and write to `/private/tmp/opensiri-initial-submission-qa/phase-09.pptx`. Assert the inspection file contains exactly nine `kind:"slide"` records and editable text records for `ConversationContext`, `ReplyBundle`, all four Worker names, and `25%`.

- [ ] **Step 6: Review slides 01–09 at full size**

Open the nine PNG renders and correct any line wrapping, low contrast, or visual crowding before proceeding.

## Task 3: Build Slides 10–15 for Skill Engineering, Auditability, and Open Source

**Files:**
- Modify: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs`

**Interfaces:**
- Consumes: the OpenSiri primitives and nine-slide narrative from Tasks 1–2.
- Produces: `buildSlide10` through `buildSlide15` with native Skill contracts, operational evidence fields, security boundaries, and license separation.

- [ ] **Step 1: Build the Skill Engineering divider and three-Skill comparison**

Slide 10 is `Skill 工程体系 / 25%`. Slide 11 must give each Skill an editable contract card:

```text
wechat-smart-reply — Screenshot + User Context → ReplyBundle
selection-rewrite — Selected Text + Tone → Rewritten Text
screenshot-action-advisor — Screenshot + Goal → Action Suggestions
```

Enlarge the primary Skill contract below the cards with fields `INPUT`, `OUTPUT`, `FAILURE`, and `LIFECYCLE`, using the exact values from the confirmed design.

- [ ] **Step 2: Build the engineering divider and auditability matrix**

Slide 12 is `工程落地、运行验证与安全可审计 / 20%`. Slide 13 uses four quadrants:

```text
运行证据 — input screenshot, structured context, Agent event flow, final candidates
可观测性 — run ID, agent ID, skill version, status, latency
可恢复性 — OCR correction, timeout degradation, Reviewer rejection, retry boundary
安全边界 — local OCR, minimum context, sensitive-field filtering, no DB read, no injection, no auto-send
```

Prefix future-facing fields with `计划验证` and existing design artifacts with `已完成设计`.

- [ ] **Step 3: Build the open-source divider and license boundary**

Slide 14 is `开放 / 开源计划 / 5%`. Slide 15 draws three separated license zones:

```text
OpenSiri-derived OpenSiri client — GPL-3.0
AgentTeams independent runtime dependency — Apache-2.0
OpenSiri reusable layer — Skill schemas, Agent role templates, message contracts, test fixtures, demo data, runbook
```

Add native editable text for third-party notices and the OpenSiri naming/trademark disclaimer. Do not imply relicensing of OpenSiri or ownership of AgentTeams.

- [ ] **Step 4: Export and inspect the fifteen-slide checkpoint**

Run the generator with `maxSlides=15` and write to `/private/tmp/opensiri-initial-submission-qa/phase-15.pptx`. Assert the inspection contains all three Skill IDs, all four auditability quadrant titles, `GPL-3.0`, `Apache-2.0`, `20%`, and `5%` as textbox content.

- [ ] **Step 5: Review slides 10–15 as a six-slide sequence**

Verify that slide 11 is the most information-dense page but still readable, future-facing claims are visually marked, and slide 15 clearly separates code ownership and dependency boundaries.

## Task 4: Build Slides 16–19 and Export the Complete Deck

**Files:**
- Modify: `docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs`
- Create: `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx`
- Create: `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx.inspect.ndjson`

**Interfaces:**
- Consumes: the fifteen-slide deck and confirmed schedule in `docs/superpowers/specs/2026-08-16-opensiri-agentteams-design.md`.
- Produces: the final four slides and the complete submission PPTX.

- [ ] **Step 1: Build the progress divider and truthful implementation timeline**

Slide 16 is `落地计划与进展`. Slide 17 uses three status columns and the exact dates:

```text
已完成 — 方案设计、品牌与官网、初赛材料、AgentTeams 接入边界、三个 Skill 定义
正在推进 — 本地微信截图结构化、wechat-smart-reply 垂直链路
计划验证 — 2026-08-21 AgentTeams baseline; 2026-08-25 end-to-end integration; 2026-08-29 evidence and validation; 2026-09-01 final demo hardening
```

Show risks and mitigations for screenshot variance, OCR error, AgentTeams integration, privacy, and OpenSiri naming. Use the editable field `DEMO / 复赛前补充可访问链接` instead of an invented URL or QR code.

- [ ] **Step 2: Build the team divider and editable personal-participant page**

Slide 18 is `团队介绍`. Slide 19 states `个人参赛 / 全链路负责` and includes the six exact editable field labels from Global Constraints. Use `请在提交前替换本页个人信息` as a visible orange review note. End with `AI 可以建议，但最后一句始终由用户决定。`.

- [ ] **Step 3: Add speaker notes and sources for all 19 slides**

Every slide must have presenter notes and a `[Sources]` block. Use only applicable sources from this exact set:

```text
用户提供的 Agent Infra 初赛方案 PPT 框架模板
docs/submissions/2026-goaihz-opensiri/initial-submission.md
docs/superpowers/specs/2026-08-16-opensiri-agentteams-design.md
docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md
https://github.com/TobeBetterV/opensiri
https://github.com/agentscope-ai/AgentTeams/
https://goaihz.com/tracks?track=infra
```

- [ ] **Step 4: Export the full deck**

Run:

```bash
NODE_PATH=/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
docs/submissions/2026-goaihz-opensiri/presentation/build-initial-submission.mjs \
docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx \
/private/tmp/opensiri-initial-submission-qa/final-render \
docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx.inspect.ndjson \
19
```

Expected: the command exits with code 0, the PPTX opens as a PowerPoint 2007+ file, the inspection file contains 19 slide records, and the montage exists.

- [ ] **Step 5: Confirm the compact deck remains unchanged**

Run `git diff --numstat -- docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-branded.pptx` and expect no new diff produced by this plan.

## Task 5: Add Deterministic Deck Verification

**Files:**
- Create: `docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs`
- Modify: `docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md`

**Interfaces:**
- Consumes: `opensiri-agent-infra-initial-submission.pptx`.
- Produces: a zero exit status only when structure, editability, ordering, image-size, and notes checks all pass.

- [ ] **Step 1: Write the verifier before running it**

Import `assert`, `FileBlob`, and `PresentationFile`. Inspect `slide,textbox,image,notes,layout` and assert:

```js
const chapterTitleToSlide = new Map([
  ["场景与价值", 4],
  ["方案总览", 6],
  ["多 Agent 协同设计", 8],
  ["Skill 工程体系", 10],
  ["工程落地、运行验证与安全可审计", 12],
  ["开放 / 开源计划", 14],
  ["落地计划与进展", 16],
  ["团队介绍", 18],
]);
const chapterSlides = [...chapterTitleToSlide].map(([title, expectedSlide]) => {
  const record = textboxes.find(({ text }) => text === title);
  assert(record, `missing chapter title: ${title}`);
  assert.equal(record.slide, expectedSlide);
  return record.slide;
});

assert.equal(slides.length, 19);
assert.equal(notes.length, 19);
assert(requiredText.every((value) => allEditableText.includes(value)));
assert.deepEqual(chapterSlides, [4, 6, 8, 10, 12, 14, 16, 18]);
assert(images.every(({ bbox: [, , w, h] }) => w <= 180 && h <= 180));
assert(notes.every(({ text }) => text.includes("[Sources]")));
```

Set `requiredText` to include `OpenSiri`, the cover promise, the eight chapter titles, `25%`, `20%`, `5%`, all three Skill IDs, all four Worker names, `ConversationContext`, `ReplyBundle`, `GPL-3.0`, `Apache-2.0`, `不自动发送`, all six team field labels, and the final human-control promise.

- [ ] **Step 2: Run the verifier**

```bash
NODE_PATH=/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
docs/submissions/2026-goaihz-opensiri/presentation/verify-initial-submission.mjs \
docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx
```

Expected: `verified: 19 slides, native editable content, chapter order, notes, and image bounds`.

- [ ] **Step 3: Run canvas-overflow verification**

```bash
/Users/humanown/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
/Users/humanown/.codex/plugins/cache/openai-primary-runtime/presentations/26.813.12317/skills/presentations/container_tools/slides_test.py \
docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx
```

Expected: no overflowing-content failures.

- [ ] **Step 4: Inspect every final render and the montage**

Review all files in `/private/tmp/opensiri-initial-submission-qa/final-render/` at full size and the montage as a complete sequence. Correct all text clipping, connector overlap, inconsistent margins, unreadable copy, isolated last words, and accidental slide-to-slide style shifts, then repeat Tasks 4.4, 5.2, and 5.3.

- [ ] **Step 5: Verify editable content, not just visual output**

Open the final inspection NDJSON and confirm no image exceeds 180 × 180. Confirm slide 1 has separate textbox records for `OpenSiri` and the cover promise, and slides 7, 9, 11, 13, 15, and 17 expose their diagram labels as textbox records.

- [ ] **Step 6: Mark the specification implemented only after evidence passes**

Change the design document status line to `状态：已实现并验证` and add the relative output path `docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx`.

- [ ] **Step 7: Run final repository checks**

Run:

```bash
git diff --check
git status --short
file docs/submissions/2026-goaihz-opensiri/opensiri-agent-infra-initial-submission.pptx
```

Expected: no whitespace errors, the output is reported as `Microsoft PowerPoint 2007+`, unrelated user changes remain untouched, and no files are staged or committed.
