"use client";

import { AnimatePresence } from "framer-motion";
import { BookOpenText, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { StoryCard } from "@/components/library/story-card";
import { Button, Chip, EmptyState } from "@/components/ui";
import { useLibrary } from "@/lib/store";
import { fetchRemoteStories, supabaseEnabled } from "@/lib/supabase";
import type { Story } from "@/lib/types";

type Filter = "all" | "favorites" | "in-progress" | "completed" | string;

export default function LibraryPage() {
  const stories = useLibrary((s) => s.stories);
  const collections = useLibrary((s) => s.collections);
  const importStories = useLibrary((s) => s.importStories);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Pull down remote stories once when signed in.
  useEffect(() => {
    if (!supabaseEnabled()) return;
    void fetchRemoteStories().then((remote) => {
      if (remote.length) importStories(remote as Story[]);
    });
  }, [importStories]);

  const list = useMemo(() => {
    let items = Object.values(stories).sort((a, b) => b.updatedAt - a.updatedAt);
    if (filter === "favorites") items = items.filter((s) => s.favorite);
    else if (filter === "in-progress") items = items.filter((s) => s.status === "writing");
    else if (filter === "completed") items = items.filter((s) => s.status === "completed");
    else if (filter !== "all") items = items.filter((s) => s.collection === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (s) =>
          s.settings.title.toLowerCase().includes(q) ||
          s.prompt.toLowerCase().includes(q) ||
          s.settings.genre.toLowerCase().includes(q) ||
          s.characters.some((c) => c.name.toLowerCase().includes(q)) ||
          s.chapters.some((c) => c.content.toLowerCase().includes(q))
      );
    }
    return items;
  }, [stories, filter, query]);

  const usedCollections = useMemo(() => {
    const inUse = new Set(Object.values(stories).map((s) => s.collection).filter(Boolean));
    return Array.from(new Set([...collections.filter((c) => inUse.has(c)), ...inUse]));
  }, [stories, collections]);

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="mt-1 text-sm text-muted">
              {Object.keys(stories).length} stories, all autosaved{supabaseEnabled() ? " and synced" : " locally"}.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, characters, prose…"
              className="w-full rounded-full border border-edge bg-glass py-2.5 pl-9 pr-4 text-sm outline-none placeholder:text-faint focus:border-edge-strong"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["favorites", "Favorites"],
              ["in-progress", "In progress"],
              ["completed", "Completed"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Chip>
          ))}
          {usedCollections.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(filter === c ? "all" : c)}>
              📁 {c}
            </Chip>
          ))}
        </div>

        {list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {list.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={<BookOpenText size={36} />}
            title={query || filter !== "all" ? "Nothing matches" : "Your library is empty"}
            subtitle={
              query || filter !== "all"
                ? "Try a different search or filter."
                : "Every story you forge is saved here automatically — start your first one."
            }
            action={
              <Link href="/">
                <Button>Create a story</Button>
              </Link>
            }
          />
        )}
      </main>
    </div>
  );
}
