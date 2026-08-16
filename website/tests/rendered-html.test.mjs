import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertSquarePng(image, label) {
  assert.deepEqual(image.subarray(0, 8), pngSignature, `${label} must be a PNG`);
  assert.equal(image.readUInt32BE(16), 252, `${label} must keep the supplied width`);
  assert.equal(image.readUInt32BE(20), 252, `${label} must keep the supplied height`);
}

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the OpenSiri product site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const decodedHtml = html.replaceAll("%2F", "/");
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>OpenSiri — 截一张图，让 Agent 团队帮你想好怎么回<\/title>/i);
  assert.match(html, /不用说“嘿，Siri”/);
  assert.match(html, /微信截图智能回复/);
  assert.match(html, /Conversation Analyst/);
  assert.match(html, /Quality Reviewer/);
  assert.match(html, /我不会替你发送，所以也不会替你社死/);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/);
  assert.match(decodedHtml, /\/opensiri-logo-color\.png/);
  assert.match(decodedHtml, /\/opensiri-logo-mono\.png/);
  assert.match(decodedHtml, /\/opensiri-app-icon\.png/);
  assert.match(html, /<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="\/opensiri-app-icon\.png")[^>]*>/i);
  assert.doesNotMatch(html, /\/opensiri-logo-(?:color|mono)\.svg|\/favicon\.svg/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships the supplied logo family, metadata and interactive reply choices", async () => {
  const [page, layout, packageJson, colorLogo, monoLogo, appIcon, socialCard] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/opensiri-logo-color.png", import.meta.url)),
    readFile(new URL("../public/opensiri-logo-mono.png", import.meta.url)),
    readFile(new URL("../public/opensiri-app-icon.png", import.meta.url)),
    readFile(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(page, /^"use client";/);
  assert.match(page, /useState<keyof typeof replies>/);
  assert.match(page, /aria-pressed=\{tone === item\}/);
  assert.match(page, /wechat-smart-reply|微信截图智能回复/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /x-forwarded-host/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/opensiri-app-icon\.png/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assertSquarePng(colorLogo, "transparent color logo");
  assertSquarePng(monoLogo, "monochrome logo");
  assertSquarePng(appIcon, "rounded app icon");
  assert.ok(socialCard.byteLength > 10_000);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/opensiri-logo-color.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/opensiri-logo-mono.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/opensiri-app-icon.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/og.png", import.meta.url)));
  await assert.doesNotReject(access(new URL(".openai/hosting.json", projectRoot)));
});
