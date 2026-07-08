"use client";

import { motion } from "framer-motion";
import {
  BookText,
  Copy,
  FileText,
  FolderPlus,
  Heart,
  MoreHorizontal,
  Printer,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { exportEpub, exportMarkdown, exportPdf } from "@/lib/export";
import { useLibrary } from "@/lib/store";
import type { Story } from "@/lib/types";
import { cn, readingTime, storyWordCount, timeAgo } from "@/lib/utils";

const statusLabel: Record<Story["status"], string> = {
  draft: "Draft",
  writing: "In progress",
  completed: "Completed",
};

export function StoryCard({ story }: { story: Story }) {
  const { toggleFavorite, duplicateStory, deleteStory, updateStory, collections, addCollection } =
    useLibrary.getState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const words = storyWordCount(story.chapters);
  const title = story.settings.title || story.prompt.slice(0, 60);

  const menuItem =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-glass hover:text-fg cursor-pointer";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass group relative flex flex-col rounded-2xl p-5 transition-colors hover:border-edge-strong"
    >
      <Link href={`/story/${story.id}`} className="flex-1">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              story.status === "completed"
                ? "bg-emerald-500/15 text-emerald-400"
                : story.status === "writing"
                  ? "bg-accent/15 text-accent-strong"
                  : "bg-glass text-faint"
            )}
          >
            {statusLabel[story.status]}
          </span>
          {story.settings.genre && (
            <span className="text-[10px] uppercase tracking-wider text-faint">
              {story.settings.genre}
            </span>
          )}
        </div>
        <h3 className="mb-1.5 line-clamp-2 font-medium leading-snug">{title}</h3>
        <p className="line-clamp-2 text-xs text-muted">{story.prompt}</p>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-edge pt-3 text-xs text-faint">
        <span>
          {story.chapters.length} ch · {words.toLocaleString()} words · {readingTime(words)}
        </span>
        <span>{timeAgo(story.updatedAt)}</span>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={() => toggleFavorite(story.id)}
          className={cn(
            "rounded-full p-1.5 backdrop-blur cursor-pointer",
            story.favorite ? "text-accent-strong" : "text-faint hover:text-fg"
          )}
          aria-label="Favorite"
        >
          <Heart size={15} fill={story.favorite ? "currentColor" : "none"} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1.5 text-faint backdrop-blur hover:text-fg cursor-pointer"
            aria-label="More"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-edge bg-raised p-1.5 shadow-2xl"
            >
              <button className={menuItem} onClick={() => { duplicateStory(story.id); setMenuOpen(false); }}>
                <Copy size={14} /> Duplicate
              </button>
              <button
                className={menuItem}
                onClick={() => {
                  const name = window.prompt(
                    `Move to collection:\n(existing: ${collections.join(", ") || "none"})`,
                    story.collection
                  );
                  if (name !== null) {
                    const trimmed = name.trim();
                    if (trimmed) addCollection(trimmed);
                    updateStory(story.id, { collection: trimmed });
                  }
                  setMenuOpen(false);
                }}
              >
                <FolderPlus size={14} /> {story.collection ? `In: ${story.collection}` : "Add to collection"}
              </button>
              <div className="my-1 border-t border-edge" />
              <button className={menuItem} onClick={() => { exportMarkdown(story); setMenuOpen(false); }}>
                <FileText size={14} /> Export Markdown
              </button>
              <button className={menuItem} onClick={() => { void exportEpub(story); setMenuOpen(false); }}>
                <BookText size={14} /> Export EPUB
              </button>
              <button className={menuItem} onClick={() => { exportPdf(story); setMenuOpen(false); }}>
                <Printer size={14} /> Export PDF
              </button>
              <div className="my-1 border-t border-edge" />
              <button
                className={cn(menuItem, "text-red-400 hover:text-red-300")}
                onClick={() => {
                  if (window.confirm("Delete this story permanently?")) deleteStory(story.id);
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
