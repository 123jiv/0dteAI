"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Flame, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Nav } from "@/components/nav";
import { StoryCard } from "@/components/library/story-card";
import { Button, Card, EmptyState } from "@/components/ui";
import { useLibrary } from "@/lib/store";
import { readingTime, storyWordCount } from "@/lib/utils";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent-strong">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-tight">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}

function Row({ title, stories, empty }: { title: string; stories: ReturnType<typeof useLibrary.getState>["stories"][string][]; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">{title}</h2>
      {stories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-edge px-5 py-8 text-center text-sm text-faint">
          {empty}
        </p>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const stories = useLibrary((s) => s.stories);

  const {
    all,
    recentlyRead,
    continueWriting,
    favorites,
    drafts,
    completed,
    totalWords,
    totalChapters,
  } = useMemo(() => {
    const all = Object.values(stories);
    const byRead = [...all].sort((a, b) => b.lastReadAt - a.lastReadAt);
    const byUpdated = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      all,
      recentlyRead: byRead.filter((s) => s.chapters.length).slice(0, 3),
      continueWriting: byUpdated.filter((s) => s.status === "writing").slice(0, 3),
      favorites: byUpdated.filter((s) => s.favorite).slice(0, 3),
      drafts: byUpdated.filter((s) => s.status === "draft").slice(0, 3),
      completed: byUpdated.filter((s) => s.status === "completed").slice(0, 3),
      totalWords: all.reduce((n, s) => n + storyWordCount(s.chapters), 0),
      totalChapters: all.reduce((n, s) => n + s.chapters.length, 0),
    };
  }, [stories]);

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Your worlds, at a glance.</p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<BookOpen size={18} />} label="Stories" value={String(all.length)} />
            <Stat icon={<PenLine size={18} />} label="Total words written" value={totalWords.toLocaleString()} />
            <Stat icon={<Clock size={18} />} label="Total reading time" value={readingTime(totalWords)} />
            <Stat icon={<Flame size={18} />} label="Chapters forged" value={String(totalChapters)} />
          </div>
        </motion.div>

        {all.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={36} />}
            title="Nothing here yet"
            subtitle="Forge your first story and your dashboard will come alive."
            action={
              <Link href="/">
                <Button>Create a story</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Row title="Continue writing" stories={continueWriting} empty="No stories in progress — continue one from your library." />
            <Row title="Recently read" stories={recentlyRead} empty="Open a story and it will show up here." />
            <Row title="Favorites" stories={favorites} empty="Tap the ♥ on any story to pin it here." />
            <Row title="Drafts" stories={drafts} empty="Prompts you've started but haven't generated yet." />
            <Row title="Completed" stories={completed} empty="Finish a story to earn its place here." />
          </>
        )}

        <div className="h-10" />
      </main>
    </div>
  );
}
