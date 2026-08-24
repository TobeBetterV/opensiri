import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// CommonJS resolution deliberately honors NODE_PATH, unlike Node's ESM resolver.
// This keeps the required command reproducible without a workspace node_modules link.
const require = createRequire(import.meta.url);
const { Presentation, PresentationFile } = require("@oai/artifact-tool");
const sharp = require("sharp");

const ROOT = process.cwd();
const OUTPUT = process.argv[2];
const RENDER_DIR = process.argv[3];
const INSPECT_PATH = process.argv[4];
const MAX_SLIDES = Number(process.argv[5] ?? 19);

assert(OUTPUT, "output pptx path is required");
assert(RENDER_DIR, "render directory is required");
assert(INSPECT_PATH, "inspect path is required");
assert(Number.isInteger(MAX_SLIDES) && MAX_SLIDES >= 1 && MAX_SLIDES <= 19);

export const W = 1280;
export const H = 720;

export const COLORS = Object.freeze({
  paper: "#F7F8F6",
  white: "#FFFFFF",
  ink: "#182522",
  muted: "#5C6D68",
  line: "#D8E0DC",
  blue: "#1576D1",
  mint: "#55D7B6",
  paleBlue: "#E9F4FF",
  paleMint: "#E8FBF4",
  orange: "#F59C42",
  dark: "#0D2420",
});

export const FONTS = Object.freeze({
  sans: "Arial",
  cjk: "Hiragino Sans GB",
  mono: "Menlo",
});

const LOGOS = Object.freeze({
  color: path.join(ROOT, "website/public/opensiri-logo.png"),
  mono: path.join(ROOT, "website/public/opensiri-logo-mono.png"),
});

function geometry(x, y, w, h) {
  return { left: x, top: y, width: w, height: h };
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "text";
}

export function addBox(slide, { x, y, w, h, fill = "none", stroke = "none", strokeWidth = 0, radius = 0 }) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name: "box",
    position: geometry(x, y, w, h),
    fill,
    line: { style: "solid", fill: stroke, width: strokeWidth },
    borderRadius: radius || undefined,
  });
}

export function addText(slide, {
  value,
  x,
  y,
  w,
  h,
  size = 20,
  color = COLORS.ink,
  bold = false,
  family = FONTS.sans,
  align = "left",
  valign = "top",
  name,
}) {
  const text = slide.shapes.add({
    geometry: "textbox",
    name: name ?? `text-${safeName(value).slice(0, 40)}`,
    position: geometry(x, y, w, h),
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  text.text = value;
  text.text.style = {
    fontSize: size,
    fontFamily: family,
    color,
    bold,
    alignment: align,
    verticalAlignment: valign,
    autoFit: "shrinkText",
    wrap: "square",
    insets: { top: 2, right: 3, bottom: 2, left: 3 },
  };
  return text;
}

export function addRule(slide, { x, y, w, h = 1, color = COLORS.line }) {
  return addBox(slide, { x, y, w, h, fill: color });
}

export function addDashedRule(slide, { x, y, w, h = 2, color = COLORS.line, dash = 12, gap = 8, vertical = false }) {
  const length = vertical ? h : w;
  for (let offset = 0; offset < length; offset += dash + gap) {
    const segment = Math.min(dash, length - offset);
    addBox(slide, vertical
      ? { x, y: y + offset, w, h: segment, fill: color }
      : { x: x + offset, y, w: segment, h, fill: color });
  }
}

export function addDot(slide, { x, y, d, fill = COLORS.mint, stroke = "none" }) {
  return slide.shapes.add({
    geometry: "ellipse",
    name: "dot",
    position: geometry(x, y, d, d),
    fill,
    line: { style: "solid", fill: stroke, width: stroke === "none" ? 0 : 1 },
  });
}

export function addArrow(slide, { x1, y1, x2, y2, color = COLORS.blue, width = 2, endArrow = true }) {
  const line = slide.shapes.add({
    geometry: "line",
    name: "arrow",
    position: {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      horizontalFlip: x2 < x1,
      verticalFlip: y2 < y1,
    },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
  if (endArrow) {
    line.lineEnd = { type: "triangle", width: "sm", length: "sm" };
  }
  return line;
}

export function addGrid(slide, { dark = false } = {}) {
  const color = dark ? "#28433D" : "#E5ECE8";
  for (let x = 48; x < W; x += 64) addRule(slide, { x, y: 0, w: 1, h: H, color });
  for (let y = 40; y < H; y += 64) addRule(slide, { x: 0, y, w: W, h: 1, color });
}

export function addChrome(slide, { number, section }) {
  addRule(slide, { x: 64, y: 650, w: 1152, h: 1, color: COLORS.line });
  addText(slide, { value: section.toUpperCase(), x: 64, y: 662, w: 400, h: 24, size: 12, color: COLORS.muted, bold: true, family: FONTS.mono, name: "chrome-section" });
  addText(slide, { value: String(number).padStart(2, "0"), x: 1146, y: 660, w: 70, h: 26, size: 14, color: COLORS.muted, bold: true, family: FONTS.mono, align: "right", name: "chrome-number" });
}

export async function addLogo(slide, { variant = "color", x, y, w, h }) {
  assert(variant === "color" || variant === "mono", "logo variant must be color or mono");
  const logoPath = LOGOS[variant];
  const bytes = await fs.readFile(logoPath);
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: "image/png",
    alt: variant === "color" ? "OpenSiri color logo" : "OpenSiri monochrome logo",
    fit: "contain",
    position: geometry(x, y, w, h),
  });
}

export function addSectionCover(slide, { chapter, title, score, promise }) {
  slide.background.fill = COLORS.dark;
  addGrid(slide, { dark: true });
  addText(slide, { value: chapter.toUpperCase(), x: 72, y: 76, w: 300, h: 28, size: 14, color: COLORS.mint, bold: true, family: FONTS.mono, name: "section-chapter" });
  addText(slide, { value: title, x: 72, y: 196, w: 760, h: 142, size: 70, color: COLORS.white, bold: true, family: FONTS.cjk, name: "section-title" });
  addText(slide, { value: promise, x: 76, y: 372, w: 660, h: 70, size: 25, color: "#BBD1C8", family: FONTS.cjk, name: "section-promise" });
  if (score) {
    addBox(slide, { x: 1006, y: 80, w: 166, h: 166, fill: COLORS.mint, radius: 83 });
    addText(slide, { value: score, x: 1018, y: 122, w: 142, h: 56, size: 42, color: COLORS.dark, bold: true, family: FONTS.mono, align: "center", valign: "middle", name: "section-score" });
    addText(slide, { value: "EVALUATION\nWEIGHT", x: 1018, y: 181, w: 142, h: 46, size: 11, color: COLORS.dark, bold: true, family: FONTS.mono, align: "center", name: "section-score-label" });
  }
}

const ALLOWED_SOURCES = new Set([
  "用户提供的 Agent Infra 初赛方案 PPT 框架模板",
  "docs/submissions/2026-goaihz-opensiri/initial-submission.md",
  "docs/superpowers/specs/2026-08-16-opensiri-agentteams-design.md",
  "docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md",
  "https://github.com/TobeBetterV/opensiri",
  "https://github.com/agentscope-ai/AgentTeams/",
  "https://goaihz.com/tracks?track=infra",
]);

function normalizedSources(sources) {
  return sources.split("\n").flatMap((source) => {
    if (ALLOWED_SOURCES.has(source)) return [source];
    if (source.startsWith("OpenSiri 参赛材料")) {
      return ["docs/submissions/2026-goaihz-opensiri/initial-submission.md"];
    }
    if (source.startsWith("Logo:")) {
      return ["docs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md"];
    }
    if (source.includes("OpenSiri repository license") || source.includes("AgentTeams repository license")) {
      const normalized = [];
      if (source.includes("OpenSiri repository license")) normalized.push("https://github.com/TobeBetterV/opensiri");
      if (source.includes("AgentTeams repository license")) normalized.push("https://github.com/agentscope-ai/AgentTeams/");
      if (source.includes("OpenSiri 参赛材料")) normalized.push("docs/submissions/2026-goaihz-opensiri/initial-submission.md");
      return normalized;
    }
    if (source === "无外部来源。") return ["用户提供的 Agent Infra 初赛方案 PPT 框架模板"];
    assert.fail(`Unsupported speaker-note source: ${source}`);
  });
}

export function setNotes(slide, { presenter, sources }) {
  const normalized = normalizedSources(sources);
  assert(normalized.length > 0, "every slide requires at least one source");
  normalized.forEach((source) => assert(ALLOWED_SOURCES.has(source), `source must be allowlisted: ${source}`));
  slide.speakerNotes.textFrame.setText(`${presenter}\n\n[Sources]\n${normalized.map((source) => `- ${source}`).join("\n")}`);
  slide.speakerNotes.setVisible(true);
}

function newSlide(presentation, number, section, background = COLORS.paper) {
  const slide = presentation.slides.add();
  slide.background.fill = background;
  if (background === COLORS.paper) addGrid(slide);
  addChrome(slide, { number, section });
  return slide;
}

function addSlideHeader(slide, eyebrow, title, subtitle) {
  addText(slide, { value: eyebrow.toUpperCase(), x: 72, y: 64, w: 340, h: 26, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, name: "slide-eyebrow" });
  addText(slide, { value: title, x: 72, y: 106, w: 900, h: 62, size: 40, color: COLORS.ink, bold: true, family: FONTS.cjk, name: "slide-title" });
  if (subtitle) addText(slide, { value: subtitle, x: 74, y: 177, w: 900, h: 46, size: 19, color: COLORS.muted, family: FONTS.cjk, name: "slide-subtitle" });
}

export async function buildSlide01(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.dark;
  addGrid(slide, { dark: true });
  await addLogo(slide, { variant: "color", x: 72, y: 58, w: 178, h: 46 });
  addText(slide, { value: "OpenSiri", x: 72, y: 177, w: 620, h: 88, size: 76, color: COLORS.white, bold: true, family: FONTS.sans, name: "cover-title" });
  addText(slide, { value: "截一张图，让一支 Agent 团队帮你想好怎么回", x: 76, y: 290, w: 755, h: 70, size: 31, color: "#C2D7CF", family: FONTS.cjk, name: "cover-promise" });
  addRule(slide, { x: 76, y: 396, w: 188, h: 5, color: COLORS.mint });
  addText(slide, { value: "基于 OpenSiri × AgentTeams 的 macOS 多 Agent 回复基础设施", x: 76, y: 422, w: 680, h: 32, size: 17, color: "#C2D7CF", family: FONTS.cjk, name: "cover-subtitle" });
  addText(slide, { value: "GOAI World AI Open-Source Competition · Agent Infra", x: 76, y: 463, w: 520, h: 28, size: 14, color: COLORS.mint, bold: true, family: FONTS.mono, name: "cover-context" });
  addBox(slide, { x: 76, y: 538, w: 300, h: 42, fill: "#153B35", stroke: "#31564D", strokeWidth: 1, radius: 12 });
  addText(slide, { value: "参赛者 / 团队名：________________", x: 92, y: 548, w: 268, h: 21, size: 13, color: "#BBD1C8", family: FONTS.cjk, name: "cover-editable-personal-field" });
  addBox(slide, { x: 874, y: 164, w: 255, h: 255, fill: "#153B35", stroke: "#31564D", strokeWidth: 1, radius: 32 });
  addText(slide, { value: "THE HUMAN LOOP", x: 900, y: 196, w: 202, h: 24, size: 12, color: COLORS.mint, bold: true, family: FONTS.mono, align: "center", name: "cover-loop-title" });
  addArrow(slide, { x1: 958, y1: 291, x2: 983, y2: 291, color: "#78E1C7", width: 2 });
  addArrow(slide, { x1: 1020, y1: 291, x2: 1045, y2: 291, color: "#78E1C7", width: 2 });
  addDot(slide, { x: 906, y: 244, d: 52, fill: COLORS.mint });
  addDot(slide, { x: 983, y: 244, d: 52, fill: COLORS.paleBlue });
  addDot(slide, { x: 1060, y: 244, d: 52, fill: COLORS.orange });
  addText(slide, { value: "截图", x: 910, y: 258, w: 44, h: 24, size: 13, color: COLORS.dark, bold: true, family: FONTS.cjk, align: "center", name: "cover-capture" });
  addText(slide, { value: "协作", x: 987, y: 258, w: 44, h: 24, size: 13, color: COLORS.dark, bold: true, family: FONTS.cjk, align: "center", name: "cover-teamwork" });
  addText(slide, { value: "确认", x: 1064, y: 258, w: 44, h: 24, size: 13, color: COLORS.dark, bold: true, family: FONTS.cjk, align: "center", name: "cover-approval" });
  addText(slide, { value: "本地 OCR  →  Agent Team  →  用户决定", x: 894, y: 338, w: 216, h: 34, size: 13, color: "#C2D7CF", bold: true, family: FONTS.cjk, align: "center", name: "cover-loop-caption" });
  addText(slide, { value: "01", x: 1110, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "cover-number" });
  setNotes(slide, { presenter: "先从用户只需截图这个动作切入，再说明团队协作不会自动发送。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。\nLogo: website/public/opensiri-logo.png" });
}

export async function buildSlide02(presentation) {
  const slide = newSlide(presentation, 2, "Overview");
  await addLogo(slide, { variant: "color", x: 1038, y: 58, w: 130, h: 34 });
  addSlideHeader(slide, "One-shot overview", "把一张截图，变成可验证的回复选择", "从捕获、校对到人工审批，所有关键决策都清晰可见。");
  const cards = [
    ["PROJECT", "项目是什么", "面向 macOS 的系统级 AI 入口", COLORS.paleBlue],
    ["PROBLEM", "解决什么问题", "截图看懂了，仍不知道该怎么回", COLORS.paleMint],
    ["SOLUTION", "核心方案", "本地 OCR + AgentTeams 协作 + 人工批准", "#FFF2E2"],
    ["DIFFERENCE", "差异在哪里", "角色分工、独立审查，不是一次问答", COLORS.paleBlue],
    ["REUSE", "开放复用价值", "同一捕获与验证链路可承载多种 Skill", COLORS.paleMint],
    ["STATUS", "当前真实进展", "方案与材料已完成 / 工程实现按计划推进", "#FFF2E2"],
  ];
  cards.forEach(([eyebrow, title, body, fill], i) => {
    const x = 72 + (i % 3) * 382;
    const y = 260 + Math.floor(i / 3) * 150;
    addBox(slide, { x, y, w: 352, h: 126, fill, stroke: COLORS.line, strokeWidth: 1, radius: 18 });
    addText(slide, { value: eyebrow, x: x + 20, y: y + 16, w: 120, h: 20, size: 12, color: COLORS.blue, bold: true, family: FONTS.mono, name: `overview-eyebrow-${safeName(eyebrow)}` });
    addText(slide, { value: title, x: x + 20, y: y + 43, w: 142, h: 31, size: 22, color: COLORS.ink, bold: true, family: FONTS.cjk, name: `overview-title-${safeName(title)}` });
    addText(slide, { value: body, x: x + 166, y: y + 42, w: 166, h: 58, size: 15, color: COLORS.muted, family: FONTS.cjk, name: `overview-body-${safeName(title)}` });
  });
  addRule(slide, { x: 72, y: 575, w: 1136, h: 1, color: COLORS.line });
  addText(slide, { value: "OpenSiri 用一个可落地的微信回复场景，验证桌面 Agent 团队如何被触发、协作、审计和由人接管。", x: 72, y: 596, w: 1040, h: 32, size: 17, color: COLORS.ink, bold: true, family: FONTS.cjk, name: "overview-verdict" });
  setNotes(slide, { presenter: "用这页建立完整闭环；后续每一节只展开其中一个关键承诺。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。\nLogo: website/public/opensiri-logo.png" });
}

export async function buildSlide03(presentation) {
  const slide = newSlide(presentation, 3, "Contents");
  addSlideHeader(slide, "Contents", "八章，把一个场景讲成一套可信基础设施", "先回答用户为什么需要，再说明团队如何协作、验证与落地。");
  const chapters = ["场景与价值", "方案总览", "多 Agent 协同设计", "Skill 工程体系", "工程落地、运行验证与安全可审计", "开放 / 开源计划", "落地计划与进展", "团队介绍"];
  chapters.forEach((chapter, i) => {
    const col = i < 4 ? 0 : 1;
    const row = i % 4;
    const x = col === 0 ? 72 : 652;
    const y = 258 + row * 80;
    addText(slide, { value: String(i + 1).padStart(2, "0"), x, y: y + 5, w: 48, h: 26, size: 15, color: COLORS.blue, bold: true, family: FONTS.mono, name: `contents-number-${i + 1}` });
    addRule(slide, { x: x + 58, y: y + 18, w: 46, h: 2, color: i < 3 ? COLORS.mint : COLORS.line });
    addText(slide, { value: chapter, x: x + 122, y, w: 430, h: 38, size: 24, color: COLORS.ink, bold: true, family: FONTS.cjk, name: `contents-chapter-${i + 1}` });
    if (row < 3) addRule(slide, { x: x, y: y + 58, w: 510, h: 1, color: COLORS.line });
  });
  addText(slide, { value: "评分叙事：价值 25% · 多 Agent 协同 25% · 工程与安全可审计", x: 72, y: 600, w: 960, h: 26, size: 15, color: COLORS.muted, bold: true, family: FONTS.cjk, name: "contents-scoring-narrative" });
  setNotes(slide, { presenter: "目录按评分框架展开：前半段建立价值与协同可信度，后半段提供工程、开放和落地证据。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide04(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, { chapter: "Chapter 01", title: "场景与价值", score: "25%", promise: "先从最难回的一句话开始" });
  addText(slide, { value: "04", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "这是价值章节的分隔页。强调不是替人发消息，而是降低回复压力。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide05(presentation) {
  const slide = newSlide(presentation, 5, "Value");
  addSlideHeader(slide, "Scene / Value", "看懂上下文，不等于知道该怎么回", "OpenSiri 把系统级截图入口与可控协作建议放在同一条链路里。 ");
  addBox(slide, { x: 72, y: 242, w: 466, h: 314, fill: COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 18 });
  addText(slide, { value: "对话文本结构卡 / 非真实微信截图", x: 98, y: 266, w: 300, h: 20, size: 13, color: COLORS.muted, bold: true, family: FONTS.mono, name: "conversation-text-card-disclaimer" });
  addRule(slide, { x: 98, y: 296, w: 414, h: 1, color: COLORS.line });
  addBox(slide, { x: 98, y: 316, w: 414, h: 58, fill: "#F7F8F6", stroke: COLORS.line, strokeWidth: 1, radius: 10 });
  addText(slide, { value: "对方 · 任务推进\n周三的方案你能先给我个版本吗？", x: 116, y: 324, w: 372, h: 38, size: 14, color: COLORS.ink, family: FONTS.cjk, name: "conversation-text-card-message-1" });
  addBox(slide, { x: 98, y: 392, w: 414, h: 58, fill: COLORS.paleBlue, stroke: COLORS.line, strokeWidth: 1, radius: 10 });
  addText(slide, { value: "用户草稿 · 尚未发送\n我今天在外面，晚些给你。", x: 116, y: 400, w: 372, h: 38, size: 14, color: COLORS.ink, family: FONTS.cjk, name: "conversation-text-card-message-2" });
  addBox(slide, { x: 98, y: 468, w: 414, h: 58, fill: "#F7F8F6", stroke: COLORS.line, strokeWidth: 1, radius: 10 });
  addText(slide, { value: "对方 · 时间压力\n项目很急，最好上午能有。", x: 116, y: 476, w: 372, h: 38, size: 14, color: COLORS.ink, family: FONTS.cjk, name: "conversation-text-card-message-3" });
  const problems = [
    "看懂上下文，不等于知道该怎么回",
    "同一句话，要结合关系、目的和表达习惯",
    "用户需要建议，但不希望 AI 越权发送",
  ];
  problems.forEach((problem, i) => {
    const y = 260 + i * 92;
    addDot(slide, { x: 600, y: y + 7, d: 24, fill: i === 2 ? COLORS.orange : COLORS.mint });
    addText(slide, { value: String(i + 1), x: 600, y: y + 9, w: 24, h: 17, size: 11, color: COLORS.dark, bold: true, family: FONTS.mono, align: "center", name: `value-problem-index-${i + 1}` });
    addText(slide, { value: problem, x: 646, y, w: 510, h: 48, size: 24, color: COLORS.ink, bold: true, family: FONTS.cjk, name: `value-problem-${i + 1}` });
    if (i < 2) addRule(slide, { x: 646, y: y + 64, w: 510, h: 1, color: COLORS.line });
  });
  addBox(slide, { x: 72, y: 584, w: 1136, h: 42, fill: COLORS.paleMint, stroke: COLORS.line, strokeWidth: 1, radius: 14 });
  addText(slide, { value: "系统级入口 · 本地 OCR · 个性化上下文 · 多人协作式推理 · 人工最终控制", x: 94, y: 593, w: 1092, h: 23, size: 16, color: COLORS.ink, bold: true, family: FONTS.cjk, align: "center", name: "value-differentiators" });
  setNotes(slide, { presenter: "此页采用纯文字对话结构卡，不使用或模拟微信截图。重点在于：用户可以授权建议，但保留最后一句的决定权。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。对话内容为概念示意。" });
}

export async function buildSlide06(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, { chapter: "Chapter 02", title: "方案总览", score: "", promise: "桌面入口与 Agent Infra 是同一条链路，而不是两个演示拼接。" });
  addText(slide, { value: "06", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "由用户熟悉的桌面入口承接到可审计的协作平面，两者通过明确合同连接。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide07(presentation) {
  const slide = newSlide(presentation, 7, "Architecture");
  addSlideHeader(slide, "Two-plane architecture", "一次触发，穿过两层可审计的协作平面", "本地先结构化，远程只接收完成任务所需的最小必要上下文。 ");
  addBox(slide, { x: 72, y: 248, w: 1136, h: 162, fill: COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 18 });
  addText(slide, { value: "OpenSiri / OpenSiri Experience Plane", x: 94, y: 264, w: 420, h: 22, size: 14, color: COLORS.blue, bold: true, family: FONTS.mono, name: "experience-plane-title" });
  addBox(slide, { x: 72, y: 442, w: 1136, h: 154, fill: "#F1FAF7", stroke: COLORS.line, strokeWidth: 1, radius: 18 });
  addText(slide, { value: "AgentTeams Collaboration Plane", x: 94, y: 458, w: 420, h: 22, size: 14, color: COLORS.blue, bold: true, family: FONTS.mono, name: "collaboration-plane-title" });
  const experience = [
    { x: 94, label: "快捷键", fill: COLORS.paleBlue },
    { x: 206, label: "截图", fill: COLORS.paleBlue },
    { x: 318, label: "本地 OCR", fill: COLORS.paleBlue },
    { x: 430, label: "气泡排序", fill: COLORS.paleBlue },
    { x: 542, label: "人工校正", fill: COLORS.paleBlue },
    { x: 730, label: "浮窗", fill: COLORS.paleMint },
    { x: 858, label: "复制 / 插入", fill: COLORS.paleMint },
  ];
  const collaboration = ["Matrix Human\nClient", "Team Leader", "Worker\nAgents", "Reviewer", "evidence / log"];
  // The plane surfaces are established first; connectors then sit behind cards.
  experience.slice(0, -1).forEach((step, i) => {
    addArrow(slide, { x1: step.x + 100, y1: 332, x2: experience[i + 1].x, y2: 332, color: i < 4 ? COLORS.blue : COLORS.mint });
  });
  collaboration.slice(0, -1).forEach((_, i) => {
    const x = 94 + i * 208;
    addArrow(slide, { x1: x + 164, y1: 528, x2: x + 208, y2: 528, color: COLORS.blue });
  });
  // The privacy boundary is intentionally in the whitespace between local and remote cards/contracts.
  addDashedRule(slide, { x: 684, y: 238, w: 2, h: 368, color: COLORS.orange, vertical: true });
  addText(slide, { value: "最小必要上下文", x: 694, y: 236, w: 122, h: 18, size: 11, color: COLORS.orange, bold: true, family: FONTS.cjk, name: "privacy-boundary" });
  experience.forEach((step, i) => {
    addBox(slide, { x: step.x, y: 304, w: 100, h: 56, fill: step.fill, stroke: COLORS.line, strokeWidth: 1, radius: 14 });
    addText(slide, { value: step.label, x: step.x + 8, y: 319, w: 84, h: 26, size: 14, color: COLORS.ink, bold: true, family: FONTS.cjk, align: "center", name: `experience-${i + 1}` });
  });
  collaboration.forEach((label, i) => {
    const x = 94 + i * 208;
    addBox(slide, { x, y: 500, w: 164, h: 56, fill: i === 3 ? "#FFF2E2" : COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 14 });
    addText(slide, { value: label, x: x + 8, y: 509, w: 148, h: 34, size: 13, color: COLORS.ink, bold: true, family: i === 0 ? FONTS.mono : FONTS.cjk, align: "center", valign: "middle", name: `collaboration-${i + 1}` });
  });
  addBox(slide, { x: 462, y: 386, w: 180, h: 38, fill: COLORS.paleBlue, stroke: COLORS.blue, strokeWidth: 1, radius: 12 });
  addText(slide, { value: "ConversationContext", x: 472, y: 396, w: 160, h: 18, size: 12, color: COLORS.ink, bold: true, family: FONTS.mono, align: "center", name: "conversation-context" });
  addArrow(slide, { x1: 642, y1: 405, x2: 720, y2: 405, color: COLORS.blue, width: 2 });
  addBox(slide, { x: 720, y: 386, w: 150, h: 38, fill: COLORS.paleMint, stroke: COLORS.mint, strokeWidth: 1, radius: 12 });
  addText(slide, { value: "ReplyBundle", x: 730, y: 396, w: 130, h: 18, size: 12, color: COLORS.ink, bold: true, family: FONTS.mono, align: "center", name: "reply-bundle" });
  setNotes(slide, { presenter: "上层是用户体验的本地链路，下层是 AgentTeams 的协作链路。中间只交换结构化合同，并在隐私边界处执行最小化。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide08(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, { chapter: "Chapter 03", title: "多 Agent 协同设计", score: "25%", promise: "不是同时调用四次模型，而是有角色、有状态、有驳回的团队协作。" });
  addText(slide, { value: "08", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "这一章说明多 Agent 的价值来自可分工、可回退、可审查的协作，而非并行调用数量。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide09(presentation) {
  const slide = newSlide(presentation, 9, "Agent Teams");
  addSlideHeader(slide, "Native collaboration", "四个 Worker，共享状态，人工最终批准", "Matrix Human Client 发起任务；Team Leader 在超时边界内编排并交付可复核建议。" );
  const nodes = [
    { x: 72, y: 258, w: 178, h: 88, title: "Matrix Human Client", body: "截图发起 · 人工批准", fill: COLORS.paleBlue },
    { x: 304, y: 258, w: 178, h: 88, title: "Team Leader", body: "分解任务 · 汇总证据", fill: "#DDEEFF" },
    { x: 72, y: 402, w: 202, h: 88, title: "WORKER 01\nConversation Analyst", body: "对话与意图", fill: COLORS.paleMint },
    { x: 304, y: 402, w: 202, h: 88, title: "WORKER 02\nUser Context Agent", body: "偏好与边界", fill: COLORS.paleMint },
    { x: 548, y: 402, w: 202, h: 88, title: "WORKER 03\nReply Strategist", body: "候选与语气", fill: "#FFF2E2" },
    { x: 790, y: 402, w: 202, h: 88, title: "WORKER 04\nQuality Reviewer", body: "事实 · 隐私 · 承诺", fill: COLORS.paleMint },
    { x: 1048, y: 258, w: 160, h: 88, title: "用户批准", body: "复制 / 插入\n绝不自动发送", fill: "#FFF2E2" },
  ];
  // Draw the Leader fan-out as a native branch bus in the whitespace between
  // rows. Each terminal drop enters one Worker directly and never crosses a
  // sibling card; all connector segments remain behind the nodes.
  addArrow(slide, { x1: 250, y1: 302, x2: 304, y2: 302, color: COLORS.blue, width: 2 });
  addArrow(slide, { x1: 393, y1: 346, x2: 393, y2: 374, color: COLORS.blue, width: 2, endArrow: false });
  addArrow(slide, { x1: 173, y1: 374, x2: 891, y2: 374, color: COLORS.blue, width: 2, endArrow: false });
  [173, 405, 649, 891].forEach((x) => {
    addArrow(slide, { x1: x, y1: 374, x2: x, y2: 402, color: COLORS.blue, width: 2 });
  });
  addArrow(slide, { x1: 992, y1: 446, x2: 1048, y2: 302, color: COLORS.orange, width: 2 });
  // Reviewer rejection returns beneath the worker row, so it remains distinct
  // from the approval path and leaves the node labels unobscured.
  addArrow(slide, { x1: 890, y1: 490, x2: 890, y2: 512, color: COLORS.orange, width: 2, endArrow: false });
  addArrow(slide, { x1: 890, y1: 512, x2: 650, y2: 512, color: COLORS.orange, width: 2, endArrow: false });
  addArrow(slide, { x1: 650, y1: 512, x2: 650, y2: 490, color: COLORS.orange, width: 2 });
  nodes.forEach((node) => {
    addBox(slide, { x: node.x, y: node.y, w: node.w, h: node.h, fill: node.fill, stroke: COLORS.line, strokeWidth: 1, radius: 20 });
    addText(slide, { value: node.title, x: node.x + 14, y: node.y + 12, w: node.w - 28, h: 36, size: 13, color: COLORS.ink, bold: true, family: FONTS.mono, name: `agent-${safeName(node.title)}` });
    addText(slide, { value: node.body, x: node.x + 14, y: node.y + 54, w: node.w - 28, h: 30, size: 14, color: COLORS.muted, family: FONTS.cjk, name: `agent-body-${safeName(node.title)}` });
  });
  addText(slide, { value: "LEADER FAN-OUT · 4/4", x: 510, y: 350, w: 310, h: 18, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, align: "center", name: "leader-fanout-label" });
  addBox(slide, { x: 548, y: 538, w: 444, h: 42, fill: COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 16 });
  addText(slide, { value: "Reviewer 拒绝 → Strategist 重写（最多 2 次）", x: 548, y: 516, w: 444, h: 18, size: 13, color: COLORS.orange, bold: true, family: FONTS.cjk, align: "center", name: "reviewer-rework-loop" });
  addText(slide, { value: "SHARED STATE · OCR 校对 · 证据 · 候选回复", x: 566, y: 548, w: 408, h: 22, size: 13, color: COLORS.ink, bold: true, family: FONTS.mono, align: "center", name: "shared-state" });
  addText(slide, { value: "Worker 超时 → 降级结果 + 风险提示", x: 548, y: 596, w: 444, h: 20, size: 13, color: COLORS.orange, bold: true, family: FONTS.cjk, align: "center", name: "timeout-fallback" });
  addText(slide, { value: "TIMEOUT / RETRY BOUNDARY · 120s · ≤2 retries", x: 548, y: 617, w: 444, h: 18, size: 13, color: COLORS.muted, bold: true, family: FONTS.mono, align: "center", name: "timeout-retry-boundary" });
  setNotes(slide, { presenter: "四个 Worker 读取最小必要上下文并把证据写入共享状态；Quality Reviewer 不通过时，Leader 在超时和重试边界内重派任务。人工批准后才可复制或插入。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

function buildPlaceholder(presentation, number, section, title) {
  const slide = newSlide(presentation, number, section);
  addSlideHeader(slide, section, title, "初赛主 deck 的后续内容由同一套原生图形、文字与备注系统承载。");
  addBox(slide, { x: 72, y: 276, w: 1136, h: 260, fill: COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 24 });
  addText(slide, { value: "SYSTEM PLACEHOLDER", x: 104, y: 326, w: 390, h: 28, size: 15, color: COLORS.blue, bold: true, family: FONTS.mono, name: "placeholder-eyebrow" });
  addText(slide, { value: "This builder is intentionally ready for the full 19-slide narrative.", x: 104, y: 378, w: 760, h: 44, size: 26, color: COLORS.ink, bold: true, family: FONTS.sans, name: "placeholder-message" });
  setNotes(slide, { presenter: "占位：后续任务将以当前原生绘图系统替换为正式内容。", sources: "无外部来源。" });
}

export async function buildSlide10(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, {
    chapter: "Chapter 04",
    title: "Skill 工程体系",
    score: "25%",
    promise: "Skill 是有输入、输出、失败与生命周期的可审计合同。",
  });
  addText(slide, { value: "10", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "从协作机制进入可复用的 Skill 合同：首发三项 Skill 共用同一条人机闭环。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide11(presentation) {
  const slide = newSlide(presentation, 11, "Skill Engineering");
  addSlideHeader(slide, "Skill contracts", "首发 3 项 Skill：合同先于实现", "同一套捕获、协作、验证与人工审批基础设施，可由不同输入输出合同复用。");
  const skills = [
    { label: "SKILL 01 · HERO", id: "wechat-smart-reply", contract: "Screenshot + User Context\n→ ReplyBundle", fill: COLORS.paleMint, stroke: COLORS.mint },
    { label: "SKILL 02", id: "selection-rewrite", contract: "Selected Text + Tone\n→ Rewritten Text", fill: COLORS.white, stroke: COLORS.line },
    { label: "SKILL 03", id: "screenshot-action-advisor", contract: "Screenshot + Goal\n→ Action Suggestions", fill: COLORS.white, stroke: COLORS.line },
  ];
  skills.forEach((skill, i) => {
    const x = 72 + i * 388;
    addBox(slide, { x, y: 246, w: 360, h: 112, fill: skill.fill, stroke: skill.stroke, strokeWidth: i === 0 ? 2 : 1, radius: 16 });
    addText(slide, { value: skill.label, x: x + 18, y: 258, w: 190, h: 18, size: 11, color: COLORS.blue, bold: true, family: FONTS.mono, name: `skill-label-${i + 1}` });
    addText(slide, { value: skill.id, x: x + 18, y: 285, w: 324, h: 24, size: i === 2 ? 15 : 17, color: COLORS.ink, bold: true, family: FONTS.mono, name: `skill-id-${safeName(skill.id)}` });
    addText(slide, { value: skill.contract, x: x + 18, y: 318, w: 324, h: 30, size: 13, color: COLORS.muted, family: FONTS.mono, name: `skill-contract-${i + 1}` });
  });
  addBox(slide, { x: 72, y: 388, w: 1136, h: 222, fill: COLORS.white, stroke: COLORS.mint, strokeWidth: 2, radius: 20 });
  addText(slide, { value: "PRIMARY SKILL CONTRACT · wechat-smart-reply", x: 98, y: 408, w: 560, h: 22, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, name: "primary-skill-contract-title" });
  addText(slide, { value: "微信截图智能回复：把已校对的最小必要上下文，变为可复核、由用户决定的回复候选。", x: 98, y: 440, w: 1000, h: 28, size: 20, color: COLORS.ink, bold: true, family: FONTS.cjk, name: "primary-skill-contract-promise" });
  const fields = [
    ["INPUT", "Screenshot + User Context\n（本地 OCR 后的结构化上下文）"],
    ["OUTPUT", "ReplyBundle\n候选回复 + 验证证据"],
    ["FAILURE", "低置信 OCR → 用户校正\nReviewer 拒绝 → 重写 / 降级"],
    ["LIFECYCLE", "capture → OCR → minimize →\nteam → verify → user approve"],
  ];
  fields.forEach(([label, value], i) => {
    const x = 98 + i * 272;
    if (i) addRule(slide, { x: x - 14, y: 486, w: 1, h: 94, color: COLORS.line });
    addText(slide, { value: label, x, y: 486, w: 230, h: 18, size: 12, color: COLORS.orange, bold: true, family: FONTS.mono, name: `primary-skill-${label.toLowerCase()}` });
    addText(slide, { value, x, y: 516, w: 242, h: 60, size: 14, color: COLORS.ink, family: i === 3 ? FONTS.mono : FONTS.cjk, name: `primary-skill-${label.toLowerCase()}-value` });
  });
  setNotes(slide, { presenter: "先让评委看到三个真实、可编辑的 Skill ID 与输入输出合同，再把主 Skill 的失败与生命周期展开。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。Skill 合同为参赛设计。" });
}

export async function buildSlide12(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, {
    chapter: "Chapter 05",
    title: "工程落地、运行验证与安全可审计",
    score: "20%",
    promise: "把运行状态、失败边界与安全承诺放进同一条可审计链路",
  });
  addText(slide, { value: "12", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "这一章区分已经完成的设计工件与复赛前需要运行验证的证据。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。" });
}

export async function buildSlide13(presentation) {
  const slide = newSlide(presentation, 13, "Auditability");
  addSlideHeader(slide, "Evidence / guardrails", "可审计，不靠一句“我们会保证”", "蓝色为已完成设计；橙色为复赛前计划验证。两类内容不混作已运行事实。");
  const quadrants = [
    {
      title: "运行证据", x: 72, y: 250, fill: COLORS.paleBlue,
      done: "已完成设计 · structured context\n已完成设计 · Agent event flow\n已完成设计 · final candidates",
      plan: "计划验证 · input screenshot 的脱敏记录",
    },
    {
      title: "可观测性", x: 658, y: 250, fill: COLORS.paleMint,
      done: "已完成设计 · 事件字段与状态机边界",
      plan: "计划验证 · run ID · agent ID\n计划验证 · skill version · status · latency",
    },
    {
      title: "可恢复性", x: 72, y: 440, fill: "#FFF7EB",
      done: "已完成设计 · OCR correction\n已完成设计 · Reviewer rejection",
      plan: "计划验证 · timeout degradation\n计划验证 · retry boundary",
    },
    {
      title: "安全边界", x: 658, y: 440, fill: COLORS.white,
      done: "已完成设计 · local OCR · minimum context\n已完成设计 · sensitive-field filtering\n已完成设计 · no DB read · no injection · no auto-send",
      plan: "计划验证 · 敏感字段过滤的回归测试",
    },
  ];
  quadrants.forEach((q) => {
    addBox(slide, { x: q.x, y: q.y, w: 550, h: 164, fill: q.fill, stroke: COLORS.line, strokeWidth: 1, radius: 18 });
    addText(slide, { value: q.title, x: q.x + 22, y: q.y + 18, w: 220, h: 28, size: 24, color: COLORS.ink, bold: true, family: FONTS.cjk, name: `audit-${safeName(q.title)}-title` });
    addText(slide, { value: q.done, x: q.x + 22, y: q.y + 58, w: 500, h: 62, size: 13, color: COLORS.blue, family: FONTS.mono, name: `audit-${safeName(q.title)}-done` });
    addText(slide, { value: q.plan, x: q.x + 22, y: q.y + 121, w: 500, h: 36, size: 13, color: COLORS.orange, bold: true, family: FONTS.mono, name: `audit-${safeName(q.title)}-plan` });
  });
  addText(slide, { value: "标注原则：已完成设计 = 已产出合同、流程或边界工件；计划验证 = 需以真实 run 记录与回归测试证明。", x: 74, y: 621, w: 1080, h: 20, size: 13, color: COLORS.muted, family: FONTS.cjk, name: "audit-status-legend" });
  setNotes(slide, { presenter: "四个象限给出将来可审计的证据目录，且清楚标示哪些是已完成设计、哪些仍是计划验证。", sources: "OpenSiri 参赛材料（仓库内，非外部来源）。所有计划验证项均非已完成运行声明。" });
}

export async function buildSlide14(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, {
    chapter: "Chapter 06",
    title: "开放 / 开源计划",
    score: "5%",
    promise: "复用清晰的合同与模板，依赖、代码与名称边界保持独立",
  });
  addText(slide, { value: "14", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, { presenter: "开放复用建立在清楚的许可证、独立依赖与名称边界之上。", sources: "OpenSiri repository license；AgentTeams repository license；OpenSiri 参赛材料。" });
}

export async function buildSlide15(presentation) {
  const slide = newSlide(presentation, 15, "Open Source");
  addSlideHeader(slide, "License boundary", "许可证、依赖与命名边界必须清楚", "OpenSiri 不重许可 OpenSiri，也不拥有 AgentTeams；可复用层将在发布前确认其许可范围。");
  const zones = [
    {
      eyebrow: "DERIVED CLIENT", title: "OpenSiri-derived\nOpenSiri client", license: "GPL-3.0",
      body: "衍生客户端代码按 OpenSiri 的许可约束处理。\n不重许可 OpenSiri。", fill: COLORS.paleMint, stroke: COLORS.mint,
    },
    {
      eyebrow: "INDEPENDENT DEPENDENCY", title: "AgentTeams independent\nruntime dependency", license: "Apache-2.0",
      body: "独立第三方运行时依赖。\n不归 OpenSiri 所有。", fill: COLORS.paleBlue, stroke: COLORS.blue,
    },
    {
      eyebrow: "REUSABLE LAYER", title: "OpenSiri reusable layer", license: "计划确认许可",
      body: "Skill schemas · Agent role templates\nmessage contracts · test fixtures\ndemo data · runbook", fill: COLORS.white, stroke: COLORS.line,
    },
  ];
  zones.forEach((zone, i) => {
    const x = 72 + i * 388;
    addBox(slide, { x, y: 252, w: 360, h: 264, fill: zone.fill, stroke: zone.stroke, strokeWidth: 1.5, radius: 18 });
    addText(slide, { value: zone.eyebrow, x: x + 20, y: 272, w: 320, h: 20, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, name: `license-zone-eyebrow-${i + 1}` });
    addText(slide, { value: zone.title, x: x + 20, y: 305, w: 316, h: 58, size: 21, color: COLORS.ink, bold: true, family: i === 2 ? FONTS.cjk : FONTS.sans, name: `license-zone-title-${i + 1}` });
    addRule(slide, { x: x + 20, y: 382, w: 316, h: 1, color: zone.stroke });
    addText(slide, { value: zone.license, x: x + 20, y: 399, w: 316, h: 24, size: 17, color: i === 2 ? COLORS.orange : COLORS.blue, bold: true, family: FONTS.mono, name: `license-zone-license-${i + 1}` });
    addText(slide, { value: zone.body, x: x + 20, y: 439, w: 316, h: 58, size: 14, color: COLORS.muted, family: FONTS.cjk, name: `license-zone-body-${i + 1}` });
  });
  addBox(slide, { x: 72, y: 542, w: 1136, h: 70, fill: "#F7F8F6", stroke: COLORS.line, strokeWidth: 1, radius: 14 });
  addText(slide, { value: "THIRD-PARTY NOTICES · OpenSiri、AgentTeams 及其他依赖的版权与许可证 notices 将随发行物保留。", x: 94, y: 555, w: 1085, h: 20, size: 13, color: COLORS.ink, bold: true, family: FONTS.cjk, name: "third-party-notices" });
  addText(slide, { value: "NAMING / TRADEMARK · OpenSiri 是项目名称；“Siri”为 Apple 商标。正式分发前将完成商标与上架审核。", x: 94, y: 581, w: 1085, h: 20, size: 13, color: COLORS.muted, family: FONTS.cjk, name: "opensiri-trademark-disclaimer" });
  setNotes(slide, { presenter: "明确三个不同的边界：OpenSiri 衍生客户端、AgentTeams 独立依赖、以及计划开放的可复用层。不要将 AgentTeams 描述为 OpenSiri 资产，也不要暗示 OpenSiri 被重许可。", sources: "OpenSiri repository license；AgentTeams repository license；OpenSiri 参赛材料。" });
}
export async function buildSlide16(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, {
    chapter: "Chapter 07",
    title: "落地计划与进展",
    score: "",
    promise: "先完成一条可信垂直链路，再扩展泛化能力。",
  });
  addText(slide, { value: "16", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, {
    presenter: "进入落地章节时，先明确范围：复赛前优先让微信截图智能回复的一条链路可验证，不以未验证的泛化能力替代真实进展。",
    sources: "docs/submissions/2026-goaihz-opensiri/initial-submission.md\ndocs/superpowers/specs/2026-08-16-opensiri-agentteams-design.md\ndocs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md",
  });
}

export async function buildSlide17(presentation) {
  const slide = newSlide(presentation, 17, "Progress");
  addSlideHeader(slide, "Progress / Roadmap", "真实进展分层，验证路径写清", "绿色是已完成工作，蓝色是在推进链路，橙色只表示后续计划验证。");
  const statuses = [
    {
      label: "已完成",
      body: "方案设计\n品牌与官网\n初赛材料\nAgentTeams 接入边界\n三个 Skill 定义",
      fill: COLORS.paleMint,
      stroke: COLORS.mint,
      color: COLORS.blue,
    },
    {
      label: "正在推进",
      body: "本地微信截图结构化\nwechat-smart-reply 垂直链路",
      fill: COLORS.paleBlue,
      stroke: COLORS.blue,
      color: COLORS.blue,
    },
    {
      label: "计划验证",
      body: "2026-08-21  AgentTeams baseline\n2026-08-25  end-to-end integration\n2026-08-29  evidence and validation\n2026-09-01  final demo hardening",
      fill: "#FFF7EB",
      stroke: COLORS.orange,
      color: COLORS.orange,
    },
  ];
  statuses.forEach((status, index) => {
    const x = 72 + index * 388;
    addBox(slide, { x, y: 238, w: 360, h: 150, fill: status.fill, stroke: status.stroke, strokeWidth: 1.5, radius: 18 });
    addText(slide, { value: status.label, x: x + 20, y: 257, w: 150, h: 28, size: 23, color: status.color, bold: true, family: FONTS.cjk, name: `progress-status-${index + 1}` });
    addText(slide, { value: status.body, x: x + 20, y: 298, w: 320, h: 76, size: index === 2 ? 13 : 14, color: COLORS.ink, family: index === 2 ? FONTS.mono : FONTS.cjk, name: `progress-status-body-${index + 1}` });
  });
  addText(slide, { value: "P1–P5 · 2026-08-17 → 2026-09-03", x: 72, y: 407, w: 420, h: 22, size: 14, color: COLORS.muted, bold: true, family: FONTS.mono, name: "progress-timeline-label" });
  const phases = [
    { range: "P1 · 08-17 → 08-20", task: "本地垂直\n链路", color: COLORS.mint },
    { range: "P2 · 08-21 → 08-24", task: "AgentTeams\nbaseline", color: COLORS.blue },
    { range: "P3 · 08-25 → 08-28", task: "端到端\n集成", color: COLORS.mint },
    { range: "P4 · 08-29 → 08-31", task: "证据与\n验证", color: COLORS.blue },
    { range: "P5 · 09-01 → 09-03", task: "Demo 收尾\n加固", color: COLORS.orange },
  ];
  const phaseStarts = [96, 320, 544, 768, 992];
  const phaseEnds = [320, 544, 768, 992, 1184];
  phases.forEach((phase, index) => {
    const start = phaseStarts[index];
    const end = phaseEnds[index];
    const center = (start + end) / 2;
    addRule(slide, { x: start, y: 458, w: end - start, h: 4, color: phase.color });
    addDot(slide, { x: start - 10, y: 449, d: 22, fill: phase.color, stroke: COLORS.white });
    addText(slide, { value: phase.range, x: center - 104, y: 470, w: 208, h: 20, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, align: "center", name: `progress-date-${index + 1}` });
    addText(slide, { value: phase.task, x: center - 104, y: 498, w: 208, h: 36, size: 13, color: COLORS.ink, bold: true, family: FONTS.cjk, align: "center", name: `progress-milestone-${index + 1}` });
  });
  addDot(slide, { x: 1174, y: 449, d: 22, fill: COLORS.orange, stroke: COLORS.white });
  addText(slide, { value: "START · 08-17", x: 72, y: 435, w: 140, h: 18, size: 13, color: COLORS.mint, bold: true, family: FONTS.mono, name: "progress-start-boundary" });
  addText(slide, { value: "END · 09-03", x: 1068, y: 435, w: 140, h: 18, size: 13, color: COLORS.orange, bold: true, family: FONTS.mono, align: "right", name: "progress-end-boundary" });
  addBox(slide, { x: 898, y: 402, w: 310, h: 34, fill: COLORS.white, stroke: COLORS.orange, strokeWidth: 1, radius: 10 });
  addText(slide, { value: "DEMO / 复赛前补充可访问链接", x: 910, y: 410, w: 286, h: 18, size: 13, color: COLORS.orange, bold: true, family: FONTS.cjk, align: "center", name: "progress-demo-placeholder" });
  const risks = [
    ["截图差异", "多样 fixture 校验"],
    ["OCR 误差", "人工校对后入队"],
    ["集成复杂度", "固定版本 / 分阶段验收"],
    ["隐私", "本地 OCR / 最小上下文"],
    ["OpenSiri 命名", "提交前复核商标与上架"],
  ];
  risks.forEach(([risk, mitigation], index) => {
    const x = 72 + index * 228;
    addBox(slide, { x, y: 556, w: 208, h: 66, fill: COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 12 });
    addText(slide, { value: risk, x: x + 12, y: 565, w: 184, h: 18, size: 13, color: COLORS.orange, bold: true, family: FONTS.cjk, name: `risk-title-${index + 1}` });
    addText(slide, { value: mitigation, x: x + 12, y: 589, w: 184, h: 22, size: 13, color: COLORS.ink, family: FONTS.cjk, name: `risk-mitigation-${index + 1}` });
  });
  setNotes(slide, {
    presenter: "依次说明三种状态：已完成是现有材料和设计工件；正在推进是主链路；后续四个日期是计划验证，不应被描述成已经运行。五项风险都配有可执行的缓解方式。",
    sources: "docs/submissions/2026-goaihz-opensiri/initial-submission.md\ndocs/superpowers/specs/2026-08-16-opensiri-agentteams-design.md\ndocs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md",
  });
}

export async function buildSlide18(presentation) {
  const slide = presentation.slides.add();
  addSectionCover(slide, {
    chapter: "Chapter 08",
    title: "团队介绍",
    score: "",
    promise: "个人参赛，也以产品、客户端与 Agent Infra 的全链路标准交付。",
  });
  addText(slide, { value: "18", x: 1108, y: 646, w: 100, h: 30, size: 14, color: "#BBD1C8", bold: true, family: FONTS.mono, align: "right", name: "section-number" });
  setNotes(slide, {
    presenter: "团队介绍按个人参赛呈现，只说明全链路负责的边界；下一页的个人信息全部保留给参赛者在提交前填写。",
    sources: "用户提供的 Agent Infra 初赛方案 PPT 框架模板\ndocs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md",
  });
}

export async function buildSlide19(presentation) {
  const slide = newSlide(presentation, 19, "Team");
  addSlideHeader(slide, "Participant", "个人参赛 / 全链路负责", "身份与经历均保留为可编辑占位，不虚构姓名、单位或履历。");
  addBox(slide, { x: 72, y: 226, w: 1136, h: 38, fill: "#FFF2E2", stroke: COLORS.orange, strokeWidth: 1, radius: 12 });
  addText(slide, { value: "请在提交前替换本页个人信息", x: 92, y: 234, w: 1096, h: 20, size: 14, color: COLORS.orange, bold: true, family: FONTS.cjk, align: "center", name: "participant-review-note" });
  const fields = [
    "姓名 / NAME",
    "身份或单位 / ROLE",
    "相关经历 / EXPERIENCE",
    "本项目分工 / RESPONSIBILITY",
    "GitHub / PORTFOLIO",
    "联系方式 / CONTACT",
  ];
  fields.forEach((label, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 72 : 658;
    const y = 292 + row * 96;
    addBox(slide, { x, y, w: 550, h: 72, fill: row === 1 ? COLORS.paleBlue : COLORS.white, stroke: COLORS.line, strokeWidth: 1, radius: 14 });
    addText(slide, { value: label, x: x + 20, y: y + 14, w: 260, h: 19, size: 13, color: COLORS.blue, bold: true, family: FONTS.mono, name: `participant-field-${index + 1}-label` });
    addText(slide, { value: "________________________________", x: x + 20, y: y + 40, w: 494, h: 18, size: 14, color: COLORS.muted, family: FONTS.mono, name: `participant-field-${index + 1}-value` });
  });
  addRule(slide, { x: 72, y: 601, w: 1136, h: 1, color: COLORS.mint });
  addText(slide, { value: "AI 可以建议，但最后一句始终由用户决定。", x: 72, y: 616, w: 1136, h: 26, size: 22, color: COLORS.ink, bold: true, family: FONTS.cjk, align: "center", name: "participant-closing-promise" });
  setNotes(slide, {
    presenter: "个人参赛不意味着模糊职责：本页只保留六项可编辑身份字段，并在提交前提示替换。最后回到产品承诺——AI 只提供建议，最终文本由用户决定。",
    sources: "用户提供的 Agent Infra 初赛方案 PPT 框架模板\ndocs/superpowers/specs/2026-08-16-opensiri-initial-ppt-framework-redesign.md",
  });
}

const CANONICAL_BUILDERS = [
  buildSlide01, buildSlide02, buildSlide03, buildSlide04, buildSlide05,
  buildSlide06, buildSlide07, buildSlide08, buildSlide09, buildSlide10,
  buildSlide11, buildSlide12, buildSlide13, buildSlide14, buildSlide15,
  buildSlide16, buildSlide17, buildSlide18, buildSlide19,
];
const SMOKE_BUILDERS = [buildSlide01, buildSlide02, buildSlide04, buildSlide09];

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function writeContactSheet(renderDir, slidePaths) {
  const columns = slidePaths.length <= 4 ? 2 : Math.ceil(Math.sqrt(slidePaths.length));
  const rows = Math.ceil(slidePaths.length / columns);
  const width = Math.round(W / columns);
  const height = Math.round(H / columns);
  const cells = await Promise.all(slidePaths.map((slidePath) => sharp(slidePath).resize(width, height).png().toBuffer()));
  const composite = cells.map((input, index) => ({
    input,
    left: (index % columns) * width,
    top: Math.floor(index / columns) * height,
  }));
  await sharp({ create: { width: W, height: height * rows, channels: 4, background: COLORS.paper } })
    .composite(composite)
    .webp({ quality: 88 })
    .toFile(path.join(renderDir, "deck-montage.webp"));
}

export async function buildDeck({ outputPath, renderDir, inspectPath, maxSlides }) {
  assert(outputPath, "output pptx path is required");
  assert(renderDir, "render directory is required");
  assert(inspectPath, "inspect path is required");
  assert(Number.isInteger(maxSlides) && maxSlides >= 1 && maxSlides <= 19);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(renderDir, { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const builders = maxSlides === 4 ? SMOKE_BUILDERS : CANONICAL_BUILDERS.slice(0, maxSlides);
  for (const build of builders) await build(presentation);
  assert.equal(presentation.slides.items.length, maxSlides, "slide count must match maxSlides");

  const slidePaths = [];
  for (const [index, slide] of presentation.slides.items.entries()) {
    const slidePath = path.join(renderDir, `slide-${String(index + 1).padStart(2, "0")}.png`);
    slidePaths.push(slidePath);
    await writeBlob(slidePath, await presentation.export({ slide, format: "png", scale: 1 }));
  }
  await writeContactSheet(renderDir, slidePaths);
  const inspection = await presentation.inspect({ kind: "slide,textbox,shape,image,notes", maxChars: 100000 });
  await fs.writeFile(inspectPath, inspection.ndjson);
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildDeck({ outputPath: OUTPUT, renderDir: RENDER_DIR, inspectPath: INSPECT_PATH, maxSlides: MAX_SLIDES });
}
