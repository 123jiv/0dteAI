"use client";

import { useCallback, useRef, useState } from "react";
import { authHeaders, usePaywall } from "./billing-client";
import { useLibrary } from "./store";
import type { AIRequest, Chapter, Story, StoryMemory } from "./types";
import { splitChapterTitle, uid } from "./utils";

async function* streamAI(req: AIRequest, signal?: AbortSignal): AsyncGenerator<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = "Generation failed";
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; code?: string };
      message = data.error ?? message;
      code = data.code;
    } catch {
      /* non-JSON error body */
    }
    if (code === "auth" || code === "paywall") {
      usePaywall.getState().show(code, message);
      const err = new Error(message);
      err.name = "PaywallError";
      throw err;
    }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

function requestFromStory(story: Story, task: AIRequest["task"]): AIRequest {
  return {
    task,
    prompt: story.prompt,
    settings: story.settings,
    characters: story.characters,
    memory: story.memory,
    lastChapter: story.chapters[story.chapters.length - 1]?.content,
  };
}

/** Fire-and-forget memory update after a chapter lands. */
async function updateMemory(storyId: string, chapterText: string, story: Story): Promise<void> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ ...requestFromStory(story, "summarize"), targetChapter: chapterText }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      summary?: string;
      relationships?: string[];
      locations?: string[];
      timeline?: string[];
      lore?: string[];
    };
    const { stories, mergeMemory } = useLibrary.getState();
    const current = stories[storyId];
    if (!current) return;
    const m = current.memory;
    const dedupe = (base: string[], add?: string[]) =>
      Array.from(new Set([...base, ...(add ?? [])]));
    const memory: StoryMemory = {
      chapterSummaries: data.summary ? [...m.chapterSummaries, data.summary] : m.chapterSummaries,
      relationships: data.relationships?.length ? data.relationships : m.relationships,
      locations: dedupe(m.locations, data.locations),
      timeline: dedupe(m.timeline, data.timeline),
      lore: dedupe(m.lore, data.lore),
    };
    mergeMemory(storyId, memory);
  } catch {
    // memory updates are best-effort; the raw chapters remain the source of truth
  }
}

export function useGeneration() {
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
  }, []);

  /** Generate chapter 1 (task=generate) or the next chapter (task=continue). */
  const generateChapter = useCallback(
    async (storyId: string, task: "generate" | "continue", instruction?: string) => {
      const { stories, appendChapter, updateChapter } = useLibrary.getState();
      const story = stories[storyId];
      if (!story) return;

      setGenerating(true);
      setError(null);
      setStreamText("");
      const controller = new AbortController();
      abortRef.current = controller;

      const chapter: Chapter = {
        id: uid("ch"),
        title: `Chapter ${story.chapters.length + 1}`,
        content: "",
        createdAt: Date.now(),
      };
      appendChapter(storyId, chapter);

      let full = "";
      try {
        const req = { ...requestFromStory(story, task), instruction };
        for await (const chunk of streamAI(req, controller.signal)) {
          full += chunk;
          setStreamText(full);
          const { title, body } = splitChapterTitle(full);
          updateChapter(storyId, chapter.id, body, title || chapter.title);
        }
        const finished = useLibrary.getState().stories[storyId];
        if (finished) void updateMemory(storyId, full, finished);
      } catch (err) {
        const name = (err as Error).name;
        if (name === "PaywallError") {
          // Roll back the empty chapter shell; the upgrade modal takes it from here.
          const s = useLibrary.getState().stories[storyId];
          const shell = s?.chapters.find((c) => c.id === chapter.id);
          if (s && shell && !shell.content.trim()) {
            useLibrary.getState().updateStory(storyId, {
              chapters: s.chapters.filter((c) => c.id !== chapter.id),
            });
          }
        } else if (name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setGenerating(false);
        abortRef.current = null;
      }
    },
    []
  );

  /** Rewrite an existing chapter in place. */
  const rewriteChapter = useCallback(async (storyId: string, chapterId: string, instruction: string) => {
    const { stories, updateChapter } = useLibrary.getState();
    const story = stories[storyId];
    const target = story?.chapters.find((c) => c.id === chapterId);
    if (!story || !target) return;

    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    let full = "";
    try {
      const req: AIRequest = {
        ...requestFromStory(story, "rewrite"),
        targetChapter: target.content,
        instruction,
      };
      for await (const chunk of streamAI(req, controller.signal)) {
        full += chunk;
        const { title, body } = splitChapterTitle(full);
        updateChapter(storyId, chapterId, body, title || target.title);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, []);

  return { generating, streamText, error, stop, generateChapter, rewriteChapter };
}

export { streamAI, requestFromStory };
