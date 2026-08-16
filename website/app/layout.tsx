import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "openSiri — 截一张图，让 Agent 团队帮你想好怎么回",
    description: "面向 macOS 的开源 AI 入口：识别微信对话截图，通过 AgentTeams 协作生成并验证回复建议。",
    icons: {
      icon: "/opensiri-app-icon.png",
      shortcut: "/opensiri-app-icon.png",
      apple: "/opensiri-app-icon.png",
    },
    openGraph: {
      title: "openSiri — 截一张图，让 Agent 团队帮你想好怎么回",
      description: "本地 OCR、四个 Agent 协作、三条经验证回复建议。",
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "openSiri" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "openSiri",
      description: "截一张图，让一支 Agent 团队帮你想好怎么回。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
