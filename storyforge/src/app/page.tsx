"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Nav } from "@/components/nav";
import { CharacterBuilder } from "@/components/home/character-builder";
import { StoryControls } from "@/components/home/story-controls";
import { EXAMPLE_PROMPTS } from "@/lib/constants";
import { useLibrary } from "@/lib/store";
import type { Character } from "@/lib/types";
import { defaultSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const createStory = useLibrary((s) => s.createStory);
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState(defaultSettings());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [launching, setLaunching] = useState(false);

  const begin = useCallback(() => {
    if (!prompt.trim() || launching) return;
    setLaunching(true);
    const story = createStory(
      prompt.trim(),
      settings,
      characters.filter((c) => c.name.trim())
    );
    router.push(`/story/${story.id}?generate=1`);
  }, [prompt, settings, characters, createStory, router, launching]);

  return (
    <div className="min-h-dvh">
      <Nav />

      <main className="hero-glow">
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-edge bg-glass px-3 py-1 text-xs text-muted">
              <Sparkles size={12} className="text-accent-strong" />
              AI story studio
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              One prompt.
              <br />
              <span className="text-muted">An entire world.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm text-muted sm:text-base">
              Describe the story you're craving — StoryForge writes it chapter by chapter,
              remembers everything, and lets you steer every twist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="glass mt-10 rounded-3xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-5"
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) begin();
              }}
              rows={3}
              placeholder='"Write a mafia romance between Luca and Isabella…"'
              className="w-full resize-none bg-transparent px-2 pt-1 text-base text-fg placeholder:text-faint outline-none sm:text-lg"
              autoFocus
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <CharacterBuilder characters={characters} onChange={setCharacters} />
                <button
                  onClick={() => setShowControls((v) => !v)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted hover:text-fg cursor-pointer"
                >
                  Story controls
                  <ChevronDown
                    size={13}
                    className={cn("transition-transform", showControls && "rotate-180")}
                  />
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={begin}
                disabled={!prompt.trim() || launching}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-fg text-bg transition-opacity disabled:opacity-30 cursor-pointer"
                aria-label="Generate story (⌘↵)"
                title="Generate story (⌘↵)"
              >
                <ArrowUp size={18} />
              </motion.button>
            </div>

            <AnimatePresence>
              {showControls && (
                <StoryControls
                  settings={settings}
                  onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
                />
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="rounded-full border border-edge px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-edge-strong hover:text-fg cursor-pointer"
              >
                {p}
              </button>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
