import Head from "next/head";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What's the regime today?",
  "Explain my last signal",
  "Best 0DTE setup for SPY?",
  "Risk check before next trade",
  "Why did Midori flag this?",
  "Session recap",
  "ATR sizing for QQQ",
  "Cooldown rules summary"
];

export default function ChatPage() {
  const [messages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hi. I'm Midori. Ask me anything about today's regime, your signals, or risk." }
  ]);
  const [input, setInput] = useState("");
  const isEmpty = messages.length <= 1;

  return (
    <>
      <Head>
        <title>Chat — Project Midori</title>
      </Head>
      <AppShell title="Chat">
        <div
          className="flex flex-col"
          style={{ height: "calc(100vh - 56px - 24px)" }}
        >
          <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-dim text-3xl">
                  🌿
                </div>
                <h2 className="font-display text-xl font-semibold text-text">
                  Ask Midori anything
                </h2>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Get regime context, signal explanations, and risk checks in plain language.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div
                      key={i}
                      className="ml-auto max-w-[70%] rounded-[14px] rounded-tr-[4px] border border-green-border bg-green-dim px-4 py-3 text-sm text-text"
                    >
                      {m.text}
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="max-w-[80%] rounded-[14px] rounded-tl-[4px] border border-border bg-surface px-4 py-3"
                    >
                      <div className="text-xs font-medium text-green mb-1">
                        🌿 Midori
                      </div>
                      <p className="text-sm text-text2 leading-relaxed">
                        {m.text}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border bg-bg2/95 p-4 backdrop-blur-xl">
            <div className="flex items-end gap-3">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                placeholder="Ask Midori anything..."
                className="min-h-[44px] max-h-32 resize-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
              />
              <Button size="icon" className="h-10 w-10 shrink-0 rounded-[9px]">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-center text-[10px] text-muted">
              Educational only — not financial advice.
            </p>
          </div>
        </div>
      </AppShell>
    </>
  );
}
