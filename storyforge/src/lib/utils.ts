export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function storyWordCount(chapters: { content: string }[]): number {
  return chapters.reduce((sum, c) => sum + wordCount(c.content), 0);
}

/** Estimated reading time at ~230 wpm. */
export function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 230));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Split generated chapter text into an optional "# Title" line and body. */
export function splitChapterTitle(raw: string): { title: string; body: string } {
  const text = raw.trim();
  const match = text.match(/^#{1,3}\s*(.+)\n+([\s\S]*)$/);
  if (match) return { title: match[1].trim(), body: match[2].trim() };
  return { title: "", body: text };
}

/** Render lightweight story markdown (paragraphs, em-dashes, italics) to plain paragraphs. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

export function download(filename: string, content: string | Blob, mime = "text/plain"): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "story"
  );
}
