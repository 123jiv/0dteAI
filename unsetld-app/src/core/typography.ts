// Display rules for lines: typographic quotes and the size steps from the spec.

/** Straight quotes to typographic: ' → ’ (and ‘ at a word start), "x" → “x”. */
export function typo(s: string): string {
  return s
    .replace(/(^|[\s([{—-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{—-])'/g, '$1‘')
    .replace(/'/g, '’');
}

export interface LineSize {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/** line.xl ≤32 chars, line.l 33–56, line.m 57–80, line.s >80 (attributed quotes). */
export function lineSize(text: string, scale = 1): LineSize {
  const n = text.length;
  const [size, lh, ls] = n <= 32 ? [52, 54, -0.8] : n <= 56 ? [46, 48, -0.7] : n <= 80 ? [40, 43, -0.5] : [34, 37, -0.3];
  return { fontSize: size * scale, lineHeight: lh * scale, letterSpacing: ls * scale };
}

/** Share card sizes in px for a 1080-wide card. */
export function shareSize(text: string): number {
  const n = text.length;
  return n <= 32 ? 112 : n <= 56 ? 96 : n <= 80 ? 84 : 72;
}

/** Two-beat lines: each sentence starts on its own line. Authored '\n' wins. */
export function breakBeats(text: string): string {
  if (text.includes('\n')) return text;
  const parts = text.match(/[^.?]+[.?]+["”’)]*\s*/g);
  if (!parts || parts.length !== 2) return text;
  const joined = parts.join('');
  if (joined.trim() !== text.trim()) return text;
  return parts.map(p => p.trim()).join('\n');
}

/** 'No. 0412' */
export function catalogueNo(no: number): string {
  return `No. ${String(no).padStart(4, '0')}`;
}

/** '007' */
export function milestoneNo(day: number): string {
  return String(day).padStart(3, '0');
}
