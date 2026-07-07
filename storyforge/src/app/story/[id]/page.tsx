"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ALargeSmall,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  MessageSquareText,
  Minus,
  PenLine,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/reader/chat-panel";
import { Button, Skeleton } from "@/components/ui";
import { useLibrary, usePrefs } from "@/lib/store";
import { useGeneration } from "@/lib/use-generation";
import { cn, readingTime, storyWordCount, toParagraphs, wordCount } from "@/lib/utils";

function StoryReader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const story = useLibrary((s) => s.stories[id]);
  const { updateStory, toggleBookmark } = useLibrary.getState();
  const { fontSize, setFontSize, serif, toggleSerif } = usePrefs();
  const { generating, error, generateChapter, rewriteChapter, stop } = useGeneration();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [progress, setProgress] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const chapters = story?.chapters ?? [];
  const active = chapters.find((c) => c.id === activeId) ?? chapters[chapters.length - 1];
  const activeIndex = active ? chapters.indexOf(active) : -1;

  // Kick off first-chapter generation when arriving from the home page.
  useEffect(() => {
    if (!story || startedRef.current) return;
    if (searchParams.get("generate") === "1" && story.chapters.length === 0) {
      startedRef.current = true;
      router.replace(`/story/${story.id}`);
      void generateChapter(story.id, "generate");
    }
  }, [story, searchParams, router, generateChapter]);

  // Follow the newest chapter while generating.
  useEffect(() => {
    if (generating && chapters.length) setActiveId(chapters[chapters.length - 1].id);
  }, [generating, chapters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read + track scroll progress.
  useEffect(() => {
    if (story) updateStory(story.id, { lastReadAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 0);
  }, []);

  const continueStory = useCallback(
    (instruction?: string) => {
      if (story && !generating) void generateChapter(story.id, "continue", instruction);
    },
    [story, generating, generateChapter]
  );

  const bookmarked = useMemo(
    () =>
      story?.bookmarks.some(
        (b) => b.chapterId === active?.id && Math.abs(b.progress - progress) < 0.02
      ) ?? false,
    [story?.bookmarks, active?.id, progress]
  );

  const addBookmark = useCallback(() => {
    if (!story || !active) return;
    toggleBookmark(story.id, {
      chapterId: active.id,
      label: `${active.title} · ${Math.round(progress * 100)}%`,
      progress,
    });
  }, [story, active, progress, toggleBookmark]);

  // Keyboard shortcuts: ← → chapters · +/- font size · b bookmark · c chat · s chapters
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft" && activeIndex > 0) setActiveId(chapters[activeIndex - 1].id);
      if (e.key === "ArrowRight" && activeIndex < chapters.length - 1)
        setActiveId(chapters[activeIndex + 1].id);
      if (e.key === "+" || e.key === "=") setFontSize(fontSize + 1);
      if (e.key === "-") setFontSize(fontSize - 1);
      if (e.key === "b") addBookmark();
      if (e.key === "c") setShowChat((v) => !v);
      if (e.key === "s") setShowChapters((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, chapters, fontSize, setFontSize, addBookmark]);

  if (!story) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-muted">Story not found.</p>
        <Link href="/library" className="text-sm text-accent-strong underline">
          Back to library
        </Link>
      </div>
    );
  }

  const words = storyWordCount(chapters);
  const title = story.settings.title || story.prompt.slice(0, 48) + (story.prompt.length > 48 ? "…" : "");

  return (
    <div className="flex h-dvh flex-col">
      {/* progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-edge bg-bg/80 px-3 backdrop-blur-xl sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/library" className="rounded-full p-2 text-muted hover:bg-glass hover:text-fg" aria-label="Back to library">
            <ArrowLeft size={17} />
          </Link>
          <button
            onClick={() => setShowChapters((v) => !v)}
            className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-sm hover:bg-glass cursor-pointer"
            title="Chapters (s)"
          >
            <ListOrdered size={15} className="shrink-0 text-muted" />
            <span className="truncate font-medium">{title}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-2 hidden text-xs text-faint md:block">
            {words.toLocaleString()} words · {readingTime(words)}
          </span>
          <button onClick={() => setFontSize(fontSize - 1)} className="rounded-full p-2 text-muted hover:bg-glass hover:text-fg cursor-pointer" aria-label="Smaller text (-)">
            <Minus size={15} />
          </button>
          <button onClick={toggleSerif} className={cn("rounded-full p-2 hover:bg-glass cursor-pointer", serif ? "text-accent-strong" : "text-muted hover:text-fg")} aria-label="Toggle serif" title="Toggle serif font">
            <ALargeSmall size={17} />
          </button>
          <button onClick={() => setFontSize(fontSize + 1)} className="rounded-full p-2 text-muted hover:bg-glass hover:text-fg cursor-pointer" aria-label="Larger text (+)">
            <Plus size={15} />
          </button>
          <button onClick={addBookmark} className={cn("rounded-full p-2 hover:bg-glass cursor-pointer", bookmarked ? "text-accent-strong" : "text-muted hover:text-fg")} aria-label="Bookmark (b)" title="Bookmark (b)">
            {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
          <button
            onClick={() => setShowChat((v) => !v)}
            className={cn(
              "ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm cursor-pointer",
              showChat ? "bg-fg text-bg" : "bg-glass text-muted hover:text-fg"
            )}
            title="Story assistant (c)"
          >
            <MessageSquareText size={15} />
            <span className="hidden sm:inline">Assistant</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* chapters sidebar */}
        <AnimatePresence>
          {showChapters && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute z-30 h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-edge bg-raised p-3 md:relative md:h-auto"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Chapters</p>
                <button onClick={() => setShowChapters(false)} className="text-faint hover:text-fg md:hidden cursor-pointer" aria-label="Close">
                  <X size={15} />
                </button>
              </div>
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    mainRef.current?.scrollTo({ top: 0 });
                  }}
                  className={cn(
                    "mb-1 block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
                    c.id === active?.id ? "bg-glass text-fg" : "text-muted hover:bg-glass hover:text-fg"
                  )}
                >
                  <span className="block truncate font-medium">
                    {i + 1}. {c.title}
                  </span>
                  <span className="text-xs text-faint">
                    {wordCount(c.content).toLocaleString()} words
                  </span>
                </button>
              ))}

              {story.bookmarks.length > 0 && (
                <>
                  <p className="mb-2 mt-5 px-1 text-xs font-medium uppercase tracking-wider text-muted">
                    Bookmarks
                  </p>
                  {story.bookmarks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveId(b.chapterId);
                        requestAnimationFrame(() => {
                          const el = mainRef.current;
                          if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * b.progress;
                        });
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-muted hover:bg-glass hover:text-fg cursor-pointer"
                    >
                      <BookmarkCheck size={13} className="shrink-0 text-accent-strong" />
                      <span className="truncate">{b.label}</span>
                    </button>
                  ))}
                </>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* reading pane */}
        <main ref={mainRef} onScroll={onScroll} className="min-w-0 flex-1 overflow-y-auto scroll-smooth">
          <article
            className={cn("prose-story mx-auto max-w-2xl px-5 pb-40 pt-12 sm:px-8", serif && "font-serif")}
            style={{ ["--reader-size" as string]: `${fontSize}px` }}
          >
            {active ? (
              <>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-strong">
                  Chapter {activeIndex + 1}
                </p>
                <h1 className="mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {active.title}
                </h1>
                {toParagraphs(active.content).map((p, i, arr) => (
                  <p
                    key={i}
                    className={cn(
                      generating && activeIndex === chapters.length - 1 && i === arr.length - 1 && "caret"
                    )}
                    dangerouslySetInnerHTML={{
                      __html: p
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/\*([^*]+)\*/g, "<em>$1</em>"),
                    }}
                  />
                ))}

                {!generating && (
                  <div className="mt-16 flex flex-col items-center gap-4 border-t border-edge pt-10">
                    {activeIndex < chapters.length - 1 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveId(chapters[activeIndex + 1].id);
                          mainRef.current?.scrollTo({ top: 0 });
                        }}
                      >
                        Next chapter <ChevronRight size={15} />
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => continueStory()}>
                          <Sparkles size={15} /> Continue the story
                        </Button>
                        <button
                          onClick={() => updateStory(story.id, { status: story.status === "completed" ? "writing" : "completed" })}
                          className="text-xs text-faint hover:text-muted cursor-pointer"
                        >
                          {story.status === "completed" ? "Mark as in progress" : "Mark as completed"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : generating ? (
              <div className="space-y-4 pt-8">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Sparkles size={15} className="text-accent-strong" />
                  <span>Forging your story…</span>
                </div>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 pt-20 text-center">
                <BookOpenText size={32} className="text-faint" />
                <p className="text-muted">This story has no chapters yet.</p>
                <Button onClick={() => void generateChapter(story.id, "generate")}>
                  <PenLine size={15} /> Write Chapter 1
                </Button>
              </div>
            )}

            {error && (
              <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </article>

          {/* prev/next floating on wide screens */}
          {activeIndex > 0 && (
            <button
              onClick={() => {
                setActiveId(chapters[activeIndex - 1].id);
                mainRef.current?.scrollTo({ top: 0 });
              }}
              className="fixed left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-edge bg-raised/80 p-2.5 text-muted backdrop-blur hover:text-fg xl:block cursor-pointer"
              aria-label="Previous chapter (←)"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {generating && (
            <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
              <button
                onClick={stop}
                className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted hover:text-fg cursor-pointer"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Writing… click to stop
              </button>
            </div>
          )}
        </main>

        {/* chat side panel */}
        <AnimatePresence>
          {showChat && (
            <motion.aside
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 z-30 h-[calc(100dvh-3.5rem)] w-full max-w-sm shrink-0 border-l border-edge bg-raised md:relative md:h-auto"
            >
              <ChatPanel
                story={story}
                activeChapterId={active?.id ?? null}
                busy={generating}
                onContinue={continueStory}
                onRewrite={(chapterId, instruction) => void rewriteChapter(story.id, chapterId, instruction)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function StoryPage() {
  return (
    <Suspense>
      <StoryReader />
    </Suspense>
  );
}
