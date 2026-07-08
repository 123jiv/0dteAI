"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bookmark, Chapter, Character, Story, StoryMemory, StorySettings } from "./types";
import { defaultSettings, emptyMemory } from "./types";
import { uid } from "./utils";
import { deleteStoryRemote, syncStoryUp } from "./supabase";

/* ───────────────────────────── Library store ───────────────────────────── */

interface LibraryState {
  stories: Record<string, Story>;
  collections: string[];
  createStory: (prompt: string, settings: StorySettings, characters: Character[]) => Story;
  updateStory: (id: string, patch: Partial<Story>) => void;
  appendChapter: (id: string, chapter: Chapter) => void;
  updateChapter: (id: string, chapterId: string, content: string, title?: string) => void;
  mergeMemory: (id: string, memory: Partial<StoryMemory>) => void;
  toggleFavorite: (id: string) => void;
  toggleBookmark: (id: string, bookmark: Omit<Bookmark, "id" | "createdAt">) => void;
  duplicateStory: (id: string) => Story | null;
  deleteStory: (id: string) => void;
  addCollection: (name: string) => void;
  importStories: (stories: Story[]) => void;
}

const touch = (story: Story): Story => ({ ...story, updatedAt: Date.now() });

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      stories: {},
      collections: [],

      createStory: (prompt, settings, characters) => {
        const now = Date.now();
        const story: Story = {
          id: uid("story"),
          prompt,
          settings,
          characters,
          chapters: [],
          memory: emptyMemory(),
          bookmarks: [],
          favorite: false,
          status: "draft",
          collection: "",
          createdAt: now,
          updatedAt: now,
          lastReadAt: now,
        };
        set((s) => ({ stories: { ...s.stories, [story.id]: story } }));
        return story;
      },

      updateStory: (id, patch) =>
        set((s) => {
          const story = s.stories[id];
          if (!story) return s;
          const next = touch({ ...story, ...patch });
          void syncStoryUp(id, next);
          return { stories: { ...s.stories, [id]: next } };
        }),

      appendChapter: (id, chapter) =>
        set((s) => {
          const story = s.stories[id];
          if (!story) return s;
          const next = touch({
            ...story,
            chapters: [...story.chapters, chapter],
            status: "writing" as const,
            lastChapterId: chapter.id,
          });
          void syncStoryUp(id, next);
          return { stories: { ...s.stories, [id]: next } };
        }),

      updateChapter: (id, chapterId, content, title) =>
        set((s) => {
          const story = s.stories[id];
          if (!story) return s;
          const next = touch({
            ...story,
            chapters: story.chapters.map((c) =>
              c.id === chapterId ? { ...c, content, title: title ?? c.title } : c
            ),
          });
          void syncStoryUp(id, next);
          return { stories: { ...s.stories, [id]: next } };
        }),

      mergeMemory: (id, memory) =>
        set((s) => {
          const story = s.stories[id];
          if (!story) return s;
          const m = story.memory;
          const next = touch({
            ...story,
            memory: {
              chapterSummaries: memory.chapterSummaries ?? m.chapterSummaries,
              relationships: memory.relationships ?? m.relationships,
              locations: memory.locations ?? m.locations,
              timeline: memory.timeline ?? m.timeline,
              lore: memory.lore ?? m.lore,
            },
          });
          void syncStoryUp(id, next);
          return { stories: { ...s.stories, [id]: next } };
        }),

      toggleFavorite: (id) => {
        const story = get().stories[id];
        if (story) get().updateStory(id, { favorite: !story.favorite });
      },

      toggleBookmark: (id, bookmark) =>
        set((s) => {
          const story = s.stories[id];
          if (!story) return s;
          const existing = story.bookmarks.find(
            (b) => b.chapterId === bookmark.chapterId && Math.abs(b.progress - bookmark.progress) < 0.02
          );
          const bookmarks = existing
            ? story.bookmarks.filter((b) => b.id !== existing.id)
            : [...story.bookmarks, { ...bookmark, id: uid("bm"), createdAt: Date.now() }];
          const next = touch({ ...story, bookmarks });
          void syncStoryUp(id, next);
          return { stories: { ...s.stories, [id]: next } };
        }),

      duplicateStory: (id) => {
        const story = get().stories[id];
        if (!story) return null;
        const copy: Story = {
          ...structuredClone(story),
          id: uid("story"),
          settings: { ...story.settings, title: `${story.settings.title || "Untitled"} (copy)` },
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ stories: { ...s.stories, [copy.id]: copy } }));
        void syncStoryUp(copy.id, copy);
        return copy;
      },

      deleteStory: (id) =>
        set((s) => {
          const stories = { ...s.stories };
          delete stories[id];
          void deleteStoryRemote(id);
          return { stories };
        }),

      addCollection: (name) =>
        set((s) =>
          s.collections.includes(name) ? s : { collections: [...s.collections, name] }
        ),

      importStories: (incoming) =>
        set((s) => {
          const stories = { ...s.stories };
          for (const story of incoming) {
            const existing = stories[story.id];
            if (!existing || existing.updatedAt < story.updatedAt) stories[story.id] = story;
          }
          return { stories };
        }),
    }),
    { name: "storyforge-library" }
  )
);

/* ─────────────────────────── Reader preferences ────────────────────────── */

interface PrefsState {
  theme: "dark" | "light";
  fontSize: number; // px
  serif: boolean;
  setTheme: (t: "dark" | "light") => void;
  setFontSize: (n: number) => void;
  toggleSerif: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "dark",
      fontSize: 19,
      serif: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize: Math.min(28, Math.max(14, fontSize)) }),
      toggleSerif: () => set((s) => ({ serif: !s.serif })),
    }),
    { name: "storyforge-prefs" }
  )
);
