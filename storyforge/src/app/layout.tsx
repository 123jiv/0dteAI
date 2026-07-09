import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryForge — AI Interactive Story Studio",
  description:
    "Generate fully customizable, immersive interactive stories from a single prompt. Unlimited characters, infinite chapters, a beautiful reading experience.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInit = `try{var t=JSON.parse(localStorage.getItem("storyforge-prefs")||"{}");document.documentElement.dataset.theme=(t.state&&t.state.theme)||"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
