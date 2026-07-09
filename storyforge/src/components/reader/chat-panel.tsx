"use client";

import { motion } from "framer-motion";
import { ArrowUp, Sparkles, Square, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TypingDots } from "@/components/ui";
import { requestFromStory, streamAI } from "@/lib/use-generation";
import type { ChatMessage, Story } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const QUICK_ACTIONS: { label: string; kind: "continue" | "rewrite" | "chat"; text: string }[] = [
  { label: "Continue from here", kind: "continue", text: "" },
  { label: "Increase the tension", kind: "continue", text: "Increase the tension dramatically in this next chapter." },
  { label: "Rewrite this chapter", kind: "rewrite", text: "Rewrite it with stronger prose and deeper emotion." },
  { label: "Turn up the heat", kind: "rewrite", text: "Rewrite it with noticeably more romantic heat and sensual tension between the leads." },
  { label: "Make the ending happier", kind: "chat", text: "How could we make the ending happier without betraying the story so far?" },
  { label: "Add another character", kind: "chat", text: "Suggest a compelling new adult character we could introduce next chapter." },
  { label: "Change the setting", kind: "chat", text: "Pitch two alternative settings we could move the story to, and how the transition would work." },
  { label: "Summarize so far", kind: "chat", text: "Summarize everything that has happened so far in a few paragraphs." },
];

export function ChatPanel({
  story,
  activeChapterId,
  busy,
  onContinue,
  onRewrite,
  onClose,
}: {
  story: Story;
  activeChapterId: string | null;
  busy: boolean;
  onContinue: (instruction?: string) => void;
  onRewrite: (chapterId: string, instruction: string) => void;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendChat = async (text: string) => {
    if (!text.trim() || chatting) return;
    const userMsg: ChatMessage = { id: uid("m"), role: "user", content: text.trim() };
    const draft: ChatMessage = { id: uid("m"), role: "assistant", content: "" };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, userMsg, draft]);
    setInput("");
    setChatting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const chapter = story.chapters.find((c) => c.id === activeChapterId);
      const req = {
        ...requestFromStory(story, "chat" as const),
        lastChapter: chapter?.content,
        instruction: text.trim(),
        chatHistory: history,
      };
      let full = "";
      for await (const chunk of streamAI(req, controller.signal)) {
        full += chunk;
        setMessages((m) => m.map((msg) => (msg.id === draft.id ? { ...msg, content: full } : msg)));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === draft.id ? { ...msg, content: `⚠️ ${(err as Error).message}` } : msg
          )
        );
      }
    } finally {
      setChatting(false);
      abortRef.current = null;
    }
  };

  const runAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (busy || chatting) return;
    if (action.kind === "continue") {
      onContinue(action.text || undefined);
    } else if (action.kind === "rewrite") {
      if (activeChapterId) onRewrite(activeChapterId, action.text);
    } else {
      void sendChat(action.text);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <Wand2 size={15} className="text-accent-strong" />
        <span className="text-sm font-medium">Story Assistant</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-full p-1.5 text-muted hover:bg-glass hover:text-fg md:hidden cursor-pointer"
            aria-label="Close assistant"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Steer the story without restarting it — continue, rewrite, retune, or just talk it
              through.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => runAction(a)}
                  disabled={busy || chatting}
                  className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted transition-colors hover:border-edge-strong hover:text-fg disabled:opacity-40 cursor-pointer"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-auto bg-fg text-bg"
                : "bg-glass border border-edge text-fg"
            )}
          >
            {m.content || <TypingDots />}
          </motion.div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 rounded-2xl border border-edge bg-glass px-3.5 py-2.5 text-xs text-muted">
            <Sparkles size={13} className="text-accent-strong" />
            Writing into the story… <TypingDots />
          </div>
        )}
      </div>

      <div
        className="border-t border-edge p-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-edge bg-glass px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendChat(input);
              }
            }}
            rows={1}
            placeholder="Ask anything — 'rewrite chapter 2 darker'…"
            className="max-h-32 flex-1 resize-none bg-transparent text-base sm:text-sm text-fg placeholder:text-faint outline-none"
          />
          {chatting ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="rounded-full bg-glass p-1.5 text-muted hover:text-fg cursor-pointer"
              aria-label="Stop"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={() => void sendChat(input)}
              disabled={!input.trim()}
              className="rounded-full bg-fg p-1.5 text-bg disabled:opacity-30 cursor-pointer"
              aria-label="Send"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
