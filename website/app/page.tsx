"use client";

import Image from "next/image";
import { useState } from "react";

const replies = {
  简洁: "收到，我今晚确认一下时间，明早给你答复。",
  友好: "可以呀～我今晚先确认一下安排，明早第一时间回复你。",
  稳妥: "谢谢邀请。我需要先确认一下时间，明早给你明确答复，可以吗？",
};

const agents = [
  {
    index: "01",
    name: "Conversation Analyst",
    cn: "对话分析",
    line: "谁在说、想表达什么、哪句还没回。",
    state: "已识别 8 条消息",
  },
  {
    index: "02",
    name: "User Context Agent",
    cn: "用户上下文",
    line: "只取这次需要的关系、语气与偏好。",
    state: "偏好已最小化",
  },
  {
    index: "03",
    name: "Reply Strategist",
    cn: "回复策略",
    line: "不是写一条万能答案，而是给三种选择。",
    state: "3 个候选已生成",
  },
  {
    index: "04",
    name: "Quality Reviewer",
    cn: "独立验证",
    line: "查事实、语气、隐私和过度承诺。",
    state: "全部通过",
  },
];

const skills = [
  {
    id: "SKILL / 01",
    title: "微信截图智能回复",
    question: "“这句话，到底该怎么回？”",
    body: "识别聊天气泡、区分双方、理解话外音，再给你简洁、友好、稳妥三条建议。",
    status: "完整闭环",
  },
  {
    id: "SKILL / 02",
    title: "划词改写",
    question: "“换个说法，但还是像我。”",
    body: "选中任何文字，扩写、缩写、润色或换语气。内容变更，个人表达不丢。",
    status: "内置",
  },
  {
    id: "SKILL / 03",
    title: "截图行动建议",
    question: "“我看懂了，然后呢？”",
    body: "从通知、表格或页面截图里提炼重点、识别风险，并把下一步排成可执行清单。",
    status: "内置",
  },
];

export default function Home() {
  const [tone, setTone] = useState<keyof typeof replies>("友好");

  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="openSiri 首页">
          <Image
            className="brand-logo"
            src="/opensiri-logo-color.png"
            alt=""
            width={38}
            height={38}
            priority
          />
          <span>OPENSIRI</span>
        </a>
        <nav aria-label="主导航">
          <a href="#workflow">怎么工作</a>
          <a href="#agents">Agent 团队</a>
          <a href="#skills">多 Skills 架构</a>
          <a href="#privacy">隐私</a>
        </nav>
        <a className="header-cta" href="#open-source">
          查看方案 <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero shell grid-paper" id="top">
        <div className="hero-copy">
          <p className="eyebrow">适用于 macOS 15.5 及以上</p>
          <h2 className="">试试 openSiri</h2>
          <h1>
            <span>一样强大，更通用。</span>
          </h1>
          <p className="hero-lead">
            openSiri 是 macOS 上的 AI 助理，属于 HumanPilot 的组成部分，跟 Siri 不太一样，这个用了就离不开。
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href="#workflow">
              功能演示 <span aria-hidden="true">→</span>
            </a>
            <a className="button button-light" href="#architecture">
              查看 Agent 架构
            </a>
          </div>
          <p className="local-note">
            <span className="pulse-dot" aria-hidden="true" />
            隐私优先：OCR 等操作默认在本地完成 · 原始截图不上传
          </p>
        </div>

        <div className="hero-visual" aria-label="openSiri 回复窗口示意">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="agent-node node-a">A1</div>
          <div className="agent-node node-b">A2</div>
          <div className="agent-node node-c">A3</div>
          <div className="agent-node node-d">A4</div>
          <div className="reply-window">
            <div className="window-bar">
              <span className="window-dot" />
              <span>OPEN_SIRI / REPLY_TASK_047</span>
              <span>•••</span>
            </div>
            <div className="chat-lines">
              <div className="bubble peer">周六一起吃饭？老地方？</div>
              <div className="bubble me">我可能要先确认一下安排</div>
              <div className="bubble peer">好呀，明天告诉我就行</div>
            </div>
            <div className="processing-line">
              <span /> 4 AGENTS VERIFIED
            </div>
            <div className="suggestion">
              <small>友好 · 推荐</small>
              <p>可以呀～我今晚先确认一下安排，明早第一时间回复你。</p>
            </div>
            <div className="window-actions">
              <span>复制</span>
              <strong>插入输入框 →</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="signal-strip shell" aria-label="产品能力摘要">
        <span>SCREENSHOT → CONTEXT → TEAMWORK → VERIFIED REPLY</span>
        <strong>多 Agent 协同完成复杂任务，内置多种复杂功能 Skill</strong>
      </div>

      <section className="workflow shell" id="workflow">
        <div className="section-heading">
          <p className="section-index">01 / PRIMARY FLOW</p>
          <h2>
            你负责截图，
            <span>剩下得交给我。</span>
          </h2>
          <p>
            截图、OCR、上下文和 AgentTeams 协作被收进一个窗口。
            你始终能看见它读到了什么、谁在处理、为什么推荐这句话。
          </p>
        </div>

        <div className="demo-grid">
          <article className="capture-card">
            <div className="card-label">
              <span>INPUT / 微信对话截图</span>
              <span className="status-good">本地 OCR 96%</span>
            </div>
            <div className="wechat-preview">
              <div className="date-chip">昨天 22:18</div>
              <div className="chat-row left">
                <span className="avatar">L</span>
                <p>周六一起吃饭？老地方？</p>
              </div>
              <div className="chat-row right">
                <p>我可能要先确认一下安排</p>
                <span className="avatar mine">ME</span>
              </div>
              <div className="chat-row left">
                <span className="avatar">L</span>
                <p>好呀，明天告诉我就行</p>
              </div>
            </div>
            <div className="context-row">
              <span>关系：朋友</span>
              <span>语气：自然</span>
              <span>避免：过度承诺</span>
            </div>
          </article>

          <article className="result-card">
            <div className="card-label">
              <span>OUTPUT / 回复建议</span>
              <span className="status-good">REVIEWED</span>
            </div>
            <div className="tone-picker" aria-label="选择回复语气">
              {(Object.keys(replies) as Array<keyof typeof replies>).map((item) => (
                <button
                  className={tone === item ? "active" : ""}
                  key={item}
                  onClick={() => setTone(item)}
                  type="button"
                  aria-pressed={tone === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <blockquote>{replies[tone]}</blockquote>
            <div className="reason-grid">
              <p><span>语气</span><strong>匹配朋友关系</strong></p>
              <p><span>事实</span><strong>没有凭空补充</strong></p>
              <p><span>承诺</span><strong>给出明确边界</strong></p>
              <p><span>隐私</span><strong>无敏感信息</strong></p>
            </div>
            <button className="insert-button" type="button">
              复制这条回复 <span aria-hidden="true">↗</span>
            </button>
            <small>我不会替你发送，所以也不会替你社死。</small>
          </article>
        </div>
      </section>

      <section className="agents shell grid-paper" id="agents">
        <div className="section-heading compact" id="architecture">
          <p className="section-index">02 / AGENTTEAMS INFRA</p>
          <h2>
            一句话背后，
            <span>是一支有分工的团队。</span>
          </h2>
          <p>
            不是把同一个提示词跑四遍。每个 Agent 都有独立输入、输出、工具和边界，
            Team Leader 负责交接，Reviewer 有权打回重写。
          </p>
        </div>
        <div className="agent-list">
          {agents.map((agent) => (
            <article className="agent-card" key={agent.index}>
              <div className="agent-topline">
                <span>{agent.index}</span>
                <span className="mini-orbit" aria-hidden="true" />
              </div>
              <h3>{agent.cn}</h3>
              <p className="agent-name">{agent.name}</p>
              <p>{agent.line}</p>
              <div className="agent-state"><i /> {agent.state}</div>
            </article>
          ))}
        </div>
        <div className="trace-line" aria-label="Agent 状态传递示意">
          <span>CAPTURE_ACCEPTED</span><i />
          <span>CONTEXT_RESOLVED</span><i />
          <span>3_CANDIDATES</span><i />
          <span>VERIFICATION_PASSED</span>
        </div>
      </section>

      <section className="skills shell" id="skills">
        <div className="section-heading horizontal">
          <div>
            <p className="section-index">03 / BUILT-IN SKILLS</p>
            <h2>三种入口，<span>同一支团队。</span></h2>
          </div>
          <p>
            从微信回复起步，但不止于微信。
            截图和划词会成为 macOS 上最自然的 AI 调用方式。
          </p>
        </div>
        <div className="skill-list">
          {skills.map((skill) => (
            <article className="skill-card" key={skill.id}>
              <div className="skill-meta">
                <span>{skill.id}</span>
                <span>{skill.status}</span>
              </div>
              <h3>{skill.title}</h3>
              <p className="skill-question">{skill.question}</p>
              <p>{skill.body}</p>
              <span className="skill-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="privacy shell" id="privacy">
        <div className="privacy-graphic" aria-hidden="true">
          <div className="privacy-ring ring-one" />
          <div className="privacy-ring ring-two" />
          <Image src="/opensiri-app-icon.png" alt="" width={205} height={205} />
          <span>隐私优先</span>
        </div>
        <div className="privacy-copy">
          <p className="section-index">04 / PRIVACY BY DEFAULT</p>
          <h2>我会学习你的需求，<br /><span>但不会追踪你。</span></h2>
          <p>
            OCR 默认在本地完成。只有校对后的必要文本、任务目标和你本次授权的偏好
            会进入 AgentTeams。Token 放在 Keychain，原始截图不默认上传。
          </p>
          <ul>
            <li><span>01</span>你能在提交前校对每一条识别结果</li>
            <li><span>02</span>不同 Agent 只看到完成任务所需的最小上下文</li>
            <li><span>03</span>最终发送权永远在你手上</li>
          </ul>
        </div>
      </section>

      <section className="opensource shell grid-paper" id="open-source">
        <p className="section-index">OPEN SOURCE · MACOS · AGENTTEAMS</p>
        <h2>
          AgentTeams 的
          {/*<br/>*/}
          <span>好搭档</span>
        </h2>
        <p>
          openSiri 复用成熟的截图、OCR、划词、快捷键与窗口能力，
          用 AgentTeams 把一次回复变成可观察、可验证、可回滚的多 Agent 协作任务。
        </p>
        <div className="opensource-actions">
          <a className="button button-dark" href="#workflow">功能演示 →</a>
          <a className="text-link" href="#agents">查看多个 Agent 的分工 ↗</a>
        </div>
        <div className="build-stamp">
          <span>OPEN_BUILD / 2026</span>
          <span>HUMAN APPROVAL REQUIRED</span>
          <span>NO AUTO-SEND</span>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top" aria-label="返回顶部">
          <Image src="/opensiri-logo-mono.png" alt="" width={38} height={38} />
          <span>OPENSIRI</span>
        </a>
        <p>截一张图，让一支 Agent 团队帮你想好怎么回。</p>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
