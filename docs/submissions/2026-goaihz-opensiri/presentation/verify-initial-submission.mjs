import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The required invocation supplies @oai/artifact-tool through NODE_PATH.
// createRequire deliberately honors that CommonJS resolution path.
const require = createRequire(import.meta.url);
const { FileBlob, PresentationFile } = require("@oai/artifact-tool");
const JSZip = require("jszip");

const inputPath = process.argv[2];
assert(inputPath, "usage: verify-initial-submission.mjs <deck.pptx>");

const requiredText = [
  "OpenSiri",
  "截一张图，让一支 Agent 团队帮你想好怎么回",
  "场景与价值",
  "方案总览",
  "多 Agent 协同设计",
  "Skill 工程体系",
  "工程落地、运行验证与安全可审计",
  "开放 / 开源计划",
  "落地计划与进展",
  "团队介绍",
  "25%",
  "20%",
  "5%",
  "wechat-smart-reply",
  "selection-rewrite",
  "screenshot-action-advisor",
  "Conversation Analyst",
  "User Context Agent",
  "Reply Strategist",
  "Quality Reviewer",
  "ConversationContext",
  "ReplyBundle",
  "GPL-3.0",
  "Apache-2.0",
  "不自动发送",
  "姓名 / NAME",
  "身份或单位 / ROLE",
  "相关经历 / EXPERIENCE",
  "本项目分工 / RESPONSIBILITY",
  "GitHub / PORTFOLIO",
  "联系方式 / CONTACT",
  "AI 可以建议，但最后一句始终由用户决定。",
];

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

const slideTextRequirements = new Map([
  [1, [
    "OpenSiri", "截一张图，让一支 Agent 团队帮你想好怎么回",
    "基于 OpenSiri × AgentTeams 的 macOS 多 Agent 回复基础设施",
    "GOAI World AI Open-Source Competition · Agent Infra",
    "参赛者 / 团队名：________________", "THE HUMAN LOOP",
    "本地 OCR → Agent Team → 用户决定",
  ]],
  [2, [
    "把一张截图，变成可验证的回复选择",
    "项目是什么", "面向 macOS 的系统级 AI 入口",
    "解决什么问题", "截图看懂了，仍不知道该怎么回",
    "核心方案", "本地 OCR + AgentTeams 协作 + 人工批准",
    "差异在哪里", "角色分工、独立审查，不是一次问答",
    "开放复用价值", "同一捕获与验证链路可承载多种 Skill",
    "当前真实进展", "方案与材料已完成 / 工程实现按计划推进",
    "OpenSiri 用一个可落地的微信回复场景，验证桌面 Agent 团队如何被触发、协作、审计和由人接管。",
  ]],
  [3, [
    "八章，把一个场景讲成一套可信基础设施",
    "场景与价值", "方案总览", "多 Agent 协同设计", "Skill 工程体系",
    "工程落地、运行验证与安全可审计", "开放 / 开源计划", "落地计划与进展", "团队介绍",
    "评分叙事：价值 25% · 多 Agent 协同 25% · 工程与安全可审计",
  ]],
  [4, ["场景与价值", "25%", "先从最难回的一句话开始"]],
  [5, [
    "看懂上下文，不等于知道该怎么回", "对话文本结构卡 / 非真实微信截图",
    "对方 · 任务推进 周三的方案你能先给我个版本吗？",
    "用户草稿 · 尚未发送 我今天在外面，晚些给你。",
    "对方 · 时间压力 项目很急，最好上午能有。",
    "同一句话，要结合关系、目的和表达习惯",
    "用户需要建议，但不希望 AI 越权发送",
    "系统级入口 · 本地 OCR · 个性化上下文 · 多人协作式推理 · 人工最终控制",
  ]],
  [6, ["方案总览", "桌面入口与 Agent Infra 是同一条链路，而不是两个演示拼接。"]],
  [7, [
    "一次触发，穿过两层可审计的协作平面",
    "OpenSiri / OpenSiri Experience Plane", "AgentTeams Collaboration Plane",
    "快捷键", "截图", "本地 OCR", "气泡排序", "人工校正", "浮窗", "复制 / 插入",
    "ConversationContext", "ReplyBundle", "最小必要上下文", "Matrix Human Client",
    "Team Leader", "Worker Agents", "Reviewer", "evidence / log",
  ]],
  [8, [
    "多 Agent 协同设计", "25%",
    "不是同时调用四次模型，而是有角色、有状态、有驳回的团队协作。",
  ]],
  [9, [
    "四个 Worker，共享状态，人工最终批准",
    "Matrix Human Client", "Team Leader", "Conversation Analyst", "User Context Agent",
    "Reply Strategist", "Quality Reviewer", "SHARED STATE", "Reviewer 拒绝 → Strategist 重写（最多 2 次）",
    "Worker 超时 → 降级结果 + 风险提示", "TIMEOUT / RETRY BOUNDARY · 120s · ≤2 retries",
    "LEADER FAN-OUT · 4/4", "用户批准", "绝不自动发送",
  ]],
  [10, [
    "Skill 工程体系", "25%", "Skill 是有输入、输出、失败与生命周期的可审计合同。",
  ]],
  [11, [
    "首发 3 项 Skill：合同先于实现",
    "wechat-smart-reply", "selection-rewrite", "screenshot-action-advisor",
    "Screenshot + User Context → ReplyBundle", "Selected Text + Tone → Rewritten Text",
    "Screenshot + Goal → Action Suggestions", "INPUT", "OUTPUT", "FAILURE", "LIFECYCLE",
    "低置信 OCR → 用户校正 Reviewer 拒绝 → 重写 / 降级",
    "capture → OCR → minimize → team → verify → user approve",
  ]],
  [12, [
    "工程落地、运行验证与安全可审计", "20%",
    "把运行状态、失败边界与安全承诺放进同一条可审计链路",
  ]],
  [13, [
    "可审计，不靠一句“我们会保证”", "蓝色为已完成设计；橙色为复赛前计划验证。",
    "运行证据", "已完成设计 · structured context", "已完成设计 · Agent event flow",
    "已完成设计 · final candidates", "计划验证 · input screenshot 的脱敏记录",
    "可观测性", "已完成设计 · 事件字段与状态机边界",
    "计划验证 · run ID · agent ID", "计划验证 · skill version · status · latency",
    "可恢复性", "已完成设计 · OCR correction", "已完成设计 · Reviewer rejection",
    "计划验证 · timeout degradation", "计划验证 · retry boundary",
    "安全边界", "已完成设计 · local OCR · minimum context",
    "已完成设计 · sensitive-field filtering", "已完成设计 · no DB read · no injection · no auto-send",
    "计划验证 · 敏感字段过滤的回归测试",
  ]],
  [14, [
    "开放 / 开源计划", "5%", "复用清晰的合同与模板，依赖、代码与名称边界保持独立",
  ]],
  [15, [
    "许可证、依赖与命名边界必须清楚",
    "DERIVED CLIENT", "INDEPENDENT DEPENDENCY", "REUSABLE LAYER", "GPL-3.0",
    "Apache-2.0", "OpenSiri-derived OpenSiri client", "AgentTeams independent runtime dependency",
    "OpenSiri reusable layer", "Skill schemas · Agent role templates message contracts · test fixtures demo data · runbook",
    "THIRD-PARTY NOTICES", "NAMING / TRADEMARK",
  ]],
  [16, [
    "落地计划与进展", "先完成一条可信垂直链路，再扩展泛化能力。",
  ]],
  [17, [
    "真实进展分层，验证路径写清", "已完成",
    "方案设计 品牌与官网 初赛材料 AgentTeams 接入边界 三个 Skill 定义",
    "正在推进", "本地微信截图结构化 wechat-smart-reply 垂直链路",
    "计划验证", "2026-08-21 AgentTeams baseline", "2026-08-25 end-to-end integration",
    "2026-08-29 evidence and validation", "2026-09-01 final demo hardening",
    "P1–P5 · 2026-08-17 → 2026-09-03",
    "P1 · 08-17 → 08-20", "本地垂直 链路", "P2 · 08-21 → 08-24", "AgentTeams baseline",
    "P3 · 08-25 → 08-28", "端到端 集成", "P4 · 08-29 → 08-31", "证据与 验证",
    "P5 · 09-01 → 09-03", "Demo 收尾 加固",
    "START · 08-17", "END · 09-03",
    "DEMO / 复赛前补充可访问链接", "截图差异", "多样 fixture 校验",
    "OCR 误差", "人工校对后入队", "集成复杂度", "固定版本 / 分阶段验收",
    "隐私", "本地 OCR / 最小上下文", "OpenSiri 命名", "提交前复核商标与上架",
  ]],
  [18, [
    "团队介绍", "个人参赛，也以产品、客户端与 Agent Infra 的全链路标准交付。",
  ]],
  [19, [
    "个人参赛 / 全链路负责", "请在提交前替换本页个人信息",
    "姓名 / NAME", "身份或单位 / ROLE", "相关经历 / EXPERIENCE",
    "本项目分工 / RESPONSIBILITY", "GitHub / PORTFOLIO", "联系方式 / CONTACT",
    "AI 可以建议，但最后一句始终由用户决定。",
  ]],
]);

const normalizeText = (text = "") => text.replace(/\s+/g, " ").trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function resolveRelationshipTarget(target) {
  return target.startsWith("/")
    ? target.slice(1)
    : path.posix.normalize(path.posix.join("ppt/slides", target));
}

async function inspectLogoMedia(pptxPath) {
  const zip = await JSZip.loadAsync(await readFile(pptxPath));
  const mediaEntries = Object.values(zip.files)
    .filter((entry) => !entry.dir && entry.name.startsWith("ppt/media/"));
  const allowedLogoPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../docs/assets/branding/opensiri-logo.png",
  );
  const allowedHash = sha256(await readFile(allowedLogoPath));
  const media = await Promise.all(mediaEntries.map(async (entry) => ({
    name: entry.name,
    hash: sha256(await entry.async("nodebuffer")),
  })));
  assert(media.length > 0, "missing PPTX media entries");
  assert(media.every(({ name }) => name.endsWith(".png")), "logo media must remain PNG");
  assert(media.every(({ hash }) => hash === allowedHash), "PPTX media is not the approved OpenSiri logo");

  const imageRelationships = [];
  for (const entry of Object.values(zip.files)) {
    const match = entry.name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!match) continue;
    const xml = await entry.async("string");
    for (const relationship of xml.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)) {
      const attributes = relationship[1];
      const type = attributes.match(/\bType="([^"]+)"/)?.[1] ?? "";
      const target = attributes.match(/\bTarget="([^"]+)"/)?.[1];
      if (!type.endsWith("/image")) continue;
      assert(target, `image relationship missing target on slide ${match[1]}`);
      imageRelationships.push({ slide: Number(match[1]), target: resolveRelationshipTarget(target) });
    }
  }
  const mediaNames = media.map(({ name }) => name).sort();
  const relationTargets = imageRelationships.map(({ target }) => target).sort();
  assert(imageRelationships.every(({ target }) => mediaNames.includes(target)), "image relationship points outside PPTX media");
  assert.deepEqual(relationTargets, mediaNames, "each PPTX media entry must be referenced exactly once");
  return { allowedHash, media, imageRelationships };
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(inputPath));
const inspection = await presentation.inspect({
  kind: "slide,textbox,image,notes,layout",
  maxChars: 100000,
});
const records = inspection.ndjson
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const slides = records.filter(({ kind }) => kind === "slide");
const allTextboxes = records.filter(({ kind }) => kind === "textbox");
const textboxes = allTextboxes.filter(({ name }) => name === "section-title");
const images = records.filter(({ kind }) => kind === "image");
const notes = records.filter(({ kind }) => kind === "notes");
const allEditableText = allTextboxes.map(({ text = "" }) => text).join("\n");
const logoMedia = await inspectLogoMedia(inputPath);

assert.equal(slides.length, 19);
assert.equal(notes.length, 19);
const missingRequiredText = requiredText.filter((value) => !allEditableText.includes(value));
assert.deepEqual(missingRequiredText, [], "missing required editable text");

const chapterSlides = [...chapterTitleToSlide].map(([title, expectedSlide]) => {
  const record = textboxes.find(({ text }) => text === title);
  assert(record, `missing chapter title: ${title}`);
  assert.equal(record.slide, expectedSlide);
  return record.slide;
});
assert.deepEqual(chapterSlides, [4, 6, 8, 10, 12, 14, 16, 18]);

assert(images.every(({ bbox: [, , w, h] }) => w <= 180 && h <= 180), "image exceeds 180 × 180");
assert(images.every(({ slide }) => slide === 1 || slide === 2), "only logo images are allowed on slides 1–2");
assert.equal(images.length, 2, "exactly one logo is required on each of slides 1–2");
assert.deepEqual(images.map(({ slide }) => slide), [1, 2]);
assert.equal(logoMedia.media.length, images.length, "PPTX media entry count must equal imported image records");
assert.equal(logoMedia.imageRelationships.length, images.length, "PPTX image relationship count must equal imported image records");
assert.deepEqual(logoMedia.imageRelationships.map(({ slide }) => slide).sort(), images.map(({ slide }) => slide).sort());
assert(notes.every(({ text }) => text.includes("[Sources]")), "each slide must include [Sources] notes");

assert.equal(slideTextRequirements.size, 19, "slide text matrix must cover all 19 slides");
assert.deepEqual(
  [...slideTextRequirements.keys()],
  Array.from({ length: 19 }, (_, index) => index + 1),
  "slide text matrix keys must be the canonical slides 1–19",
);
for (const [slide, labels] of slideTextRequirements) {
  assert(labels.length > 0, `slide ${slide} must bind at least one identity or structure label`);
  const slideTextboxes = allTextboxes.filter((record) => record.slide === slide);
  for (const label of labels) {
    assert(
      slideTextboxes.some(({ text = "" }) => normalizeText(text).includes(normalizeText(label))),
      `missing editable diagram label on slide ${slide}: ${label}`,
    );
  }
}

const coverTitle = allTextboxes.find(({ slide, name }) => slide === 1 && name === "cover-title");
const coverPromise = allTextboxes.find(({ slide, name }) => slide === 1 && name === "cover-promise");
assert.equal(coverTitle?.text, "OpenSiri");
assert.equal(coverPromise?.text, "截一张图，让一支 Agent 团队帮你想好怎么回");

console.log("verified: 19 slides, 19 matrix pages, native editable content, chapter order, notes, and image bounds");
console.log(`verified structure: ${notes.length} notes, ${images.length} images, ${slideTextRequirements.size} matrix pages`);
console.log(`verified media: ${logoMedia.media.length} entries, SHA-256 ${logoMedia.allowedHash}`);
