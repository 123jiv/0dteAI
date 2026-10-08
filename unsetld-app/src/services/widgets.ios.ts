import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Directory, File } from 'expo-file-system';
import { Image } from 'react-native';
import type { LineWidgetProps } from '../../widgets/UnsetldLine';
import type { RecordWidgetProps } from '../../widgets/UnsetldRecord';
import type { StandardWidgetProps } from '../../widgets/UnsetldStandard';
import { isClean, isLockEligible, pickFor, todayLine } from '../core/feed';
import { dayCount, week } from '../core/record';
import { addDays, dayStart, widgetDate, type DayKey } from '../core/time';
import { catalogueNo, typo } from '../core/typography';
import type { Colorway, Line } from '../core/types';
import { chapterLabel, LINE_BY_NO, LINES, SCHEDULE } from '../content';
import { COPY } from '../content/copy';
import { composePlan } from './notifications';
import type { WidgetInput } from './widgets.types';

// expo-widgets isn't in Expo Go, so the widget modules (and expo-widgets itself)
// load lazily and everything here no-ops there. Dev and TestFlight builds get widgets.
type LineWidget = typeof import('../../widgets/UnsetldLine').default;
type RecordWidget = typeof import('../../widgets/UnsetldRecord').default;
type StandardWidget = typeof import('../../widgets/UnsetldStandard').default;

interface Loaded {
  line: LineWidget;
  record: RecordWidget;
  standard: StandardWidget;
  /** The App Group folder the widgets can read, as a file:// URL ending in '/'; null without an app group. */
  directory: string | null;
}

let loaded: Loaded | null | undefined;

function load(): Loaded | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return loaded;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const dir: string | null = require('expo-widgets').widgetsDirectory ?? null;
    loaded = {
      line: require('../../widgets/UnsetldLine').default,
      record: require('../../widgets/UnsetldRecord').default,
      standard: require('../../widgets/UnsetldStandard').default,
      directory: dir ? (dir.endsWith('/') ? dir : `${dir}/`) : null,
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    loaded = null;
  }
  return loaded;
}

export const widgetsAvailable = () => Boolean(load());

// ---------------------------------------------------------------------------
// Images: the walker and the colorway plates, copied into the App Group folder
// once per ASSET_VERSION. Bump it when any of these files change.

const ASSET_VERSION = '1';
const MARKER = 'unsetld-assets.txt';
const INLINE_WALKER = 'walker-inline.png';

const ASSETS: Record<string, number> = {
  'walker-bone.png': require('../../assets/brand/walker-bone.png'),
  'walker-ink.png': require('../../assets/brand/walker-ink.png'),
  'walker-template.png': require('../../assets/brand/walker-template.png'),
  'black-widget.jpg': require('../../assets/colorways/black-widget.jpg'),
  'bone-widget.jpg': require('../../assets/colorways/bone-widget.jpg'),
  'snow-wash-widget.jpg': require('../../assets/colorways/snow-wash-widget.jpg'),
  'sun-fade-widget.jpg': require('../../assets/colorways/sun-fade-widget.jpg'),
  'concrete-widget.jpg': require('../../assets/colorways/concrete-widget.jpg'),
  'charcoal-widget.jpg': require('../../assets/colorways/charcoal-widget.jpg'),
  'plum-widget.jpg': require('../../assets/colorways/plum-widget.jpg'),
  'coffee-widget.jpg': require('../../assets/colorways/coffee-widget.jpg'),
  'olive-widget.jpg': require('../../assets/colorways/olive-widget.jpg'),
  'midnight-widget.jpg': require('../../assets/colorways/midnight-widget.jpg'),
};

/**
 * walker-template.png downsampled to 7x15 px. The inline Lock Screen family
 * draws an image at its own size and ignores frames, and the widget's Image
 * loads files at scale 1, so the inline walker needs a file that is already
 * 7x15 points.
 */
const INLINE_WALKER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAcAAAAPCAYAAAAoAdW+AAAA50lEQVR42kXQsUqWcRiG8d/7+hVCVFDkZFBDR1BbtIljWwU1GNjuGXgKjnYUtUWh0GgQbhJEgwVutWQFDcLV0D+64Z6ee7ieS6WaRl9UH6pL1TT7n3AR13EezZiwhHP4gg18w2IehzM8wCZuYsbZVMF9bGEZP/AKL6fqKt6N9UPs4iOOFng01ldwiBPcwrV5kK3geMDtYRXbqqXqebU/fr5XnVbL/wS8rY6r29X76kl1YcYz3MXXIeMO1vFrqg7wE6cD7gSXcWPG4wH1Zsh4jQP8Vj3tb1YG0Eb1qTJjDTv4jsVQ+BmLP7t/iKKVmj8rAAAAAElFTkSuQmCC';

async function copyAsset(source: number, dest: File): Promise<void> {
  const uri = Image.resolveAssetSource(source)?.uri;
  if (!uri) throw new Error('unresolved asset');
  // Dev builds serve assets from Metro; release builds have them in the app bundle.
  if (/^https?:/i.test(uri)) await File.downloadFileAsync(uri, dest, { idempotent: true });
  else await new File(uri).copy(dest, { overwrite: true });
}

/**
 * Copies the walker PNGs and the ten widget plates into the App Group folder
 * so the widgets can draw them. Skips work when this version is already there.
 * Never throws: without the images, widgets fall back to the colorway colour.
 */
export async function prepareWidgetAssets(): Promise<void> {
  try {
    const w = load();
    if (!w?.directory) return;
    const dir = new Directory(w.directory);
    const marker = new File(dir, MARKER);
    const names = [...Object.keys(ASSETS), INLINE_WALKER];
    if (marker.exists && marker.textSync() === ASSET_VERSION && names.every(n => new File(dir, n).exists)) return;

    let ok = true;
    for (const [name, source] of Object.entries(ASSETS)) {
      try {
        await copyAsset(source, new File(dir, name));
      } catch {
        ok = false;
      }
    }
    try {
      new File(dir, INLINE_WALKER).write(INLINE_WALKER_PNG, { encoding: 'base64' });
    } catch {
      ok = false;
    }
    if (ok) marker.write(ASSET_VERSION);

    // Entries written before the copy already point at these paths; redraw them.
    for (const widget of [w.line, w.record, w.standard]) {
      try {
        widget.reload();
      } catch {
        // Widget extension not in this build.
      }
    }
  } catch {
    // No App Group container or file access: widgets draw without images.
  }
}

// ---------------------------------------------------------------------------
// Timelines

/** Days of 4:00 AM boundaries written ahead. */
const DAYS_AHEAD = 7;
/** Line timeline cap (WidgetKit keeps the whole timeline in memory). */
const MAX_LINE_ENTRIES = 60;
/** Inks of the light colorways (Bone, Snow Wash, Concrete): they take the ink walker. */
const LIGHT_INKS = ['#11100F', '#0E0D0C'];

const byNo = (a: Line, b: Line) => a.no - b.no;
/** Clean, unattributed, 60 characters or fewer: the Lock Screen pool. */
const LOCK_POOL = LINES.filter(isLockEligible).sort(byNo);

type Planned = ReturnType<typeof composePlan>[number];

interface Art {
  plate: string;
  walker: string;
  walkerTemplate: string;
  walkerInline: string;
}

function artFor(directory: string | null, c: Colorway): Art {
  const at = (name: string) => (directory ? `${directory}${name}` : '');
  const plate = `${c.id}-widget.jpg`;
  return {
    plate: ASSETS[plate] ? at(plate) : '',
    walker: at(LIGHT_INKS.includes(c.ink.toUpperCase()) ? 'walker-ink.png' : 'walker-bone.png'),
    walkerTemplate: at('walker-template.png'),
    walkerInline: at(INLINE_WALKER),
  };
}

interface LineSlot {
  date: Date;
  day: DayKey;
  line: Line;
  /** Seeds the Lock Screen substitute when the line is too long for it. */
  lockKey: string;
}

/**
 * The line an entry shows. Boundaries and the day's first reminder: today's
 * global line. Mix reminders: the line that notification delivered. Prompt
 * reminders (their notification is a question, not a line): a short clean
 * line from the user's chapters. Never an explicit line.
 */
function lineFor(p: Planned | null, day: DayKey, seed: string, mixLock: Line[]): Line | null {
  if (p?.kind === 'mix' && p.lineNo != null) {
    const l = LINE_BY_NO[p.lineNo];
    if (l && isClean(l)) return l;
  }
  if (p?.kind === 'prompt') {
    const l = pickFor(mixLock, `${seed}:${p.id}`);
    if (l) return l;
  }
  return todayLine(LINES, SCHEDULE, day);
}

function lineSlots(input: WidgetInput, now: Date, mixLock: Line[]): LineSlot[] {
  const seed = input.schedule.seed;
  const slot = (date: Date, p: Planned | null, day: DayKey): LineSlot | null => {
    const line = lineFor(p, day, seed, mixLock);
    return line ? { date, day, line, lockKey: p && p.kind !== 'today' ? p.id : `day:${day}` } : null;
  };

  // Now: the line the latest reminder already delivered today, else today's line.
  const today = input.today;
  const delivered = composePlan(input.schedule, dayStart(today)).filter(
    p => p.kind !== 'night' && p.day === today && p.date.getTime() <= now.getTime(),
  );
  const current = slot(now, delivered.length ? delivered[delivered.length - 1] : null, today);

  // Ahead: each 4:00 AM boundary for 7 days, and each reminder before the last of them ends.
  const ahead = new Map<number, LineSlot>();
  const end = dayStart(addDays(today, DAYS_AHEAD + 1)).getTime();
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const s = slot(dayStart(day), null, day);
    if (s) ahead.set(s.date.getTime(), s);
  }
  for (const p of composePlan(input.schedule, now)) {
    if (p.kind === 'night' || p.date.getTime() >= end) continue;
    const s = slot(p.date, p, p.day);
    // A reminder at exactly 4:00 AM replaces the boundary entry: same moment, the notification's line.
    if (s) ahead.set(s.date.getTime(), s);
  }
  const later = [...ahead.values()].filter(s => s.date.getTime() > now.getTime()).sort((a, b) => a.date.getTime() - b.date.getTime());
  return (current ? [current, ...later] : later).slice(0, MAX_LINE_ENTRIES);
}

/** The same line if it fits the Lock Screen, else a stable short clean line (the user's chapters first). */
function lockLine(s: LineSlot, seed: string, mixLock: Line[]): Line {
  if (isLockEligible(s.line)) return s.line;
  return pickFor(mixLock.length ? mixLock : LOCK_POOL, `${seed}:lock:${s.lockKey}`) ?? s.line;
}

function lineProps(s: LineSlot, lock: Line, c: Colorway, art: Art): LineWidgetProps {
  return {
    text: typo(s.line.text),
    no: s.line.no,
    lockText: typo(lock.text),
    lockNo: lock.no,
    chapter: chapterLabel(s.line.chapter),
    catalogue: catalogueNo(s.line.no),
    date: widgetDate(s.day),
    wordmark: COPY.wordmark,
    ink: c.ink,
    secondary: c.secondary,
    bg: c.bg,
    plate: art.plate,
    walker: art.walker,
    walkerTemplate: art.walkerTemplate,
  };
}

function recordProps(input: WidgetInput, day: DayKey, art: Art): RecordWidgetProps {
  const count = dayCount(input.record);
  const c = input.colorway;
  return {
    count,
    label: COPY.record.label,
    unit: COPY.record.daysOnRecord(count),
    inline: `Day ${count}`,
    week: week(input.record, day).map(d => d.on),
    ink: c.ink,
    secondary: c.secondary,
    bg: c.bg,
    plate: art.plate,
    walkerTemplate: art.walkerTemplate,
    walkerInline: art.walkerInline,
  };
}

/**
 * Writes all three timelines. Called on every foreground, after settings
 * change and after the night check. Never throws.
 */
export function updateWidgets(input: WidgetInput) {
  const w = load();
  if (!w) return;
  const now = new Date();
  const c = input.colorway;
  const art = artFor(w.directory, c);

  try {
    const mix = new Set(input.mix);
    const mixLock = LOCK_POOL.filter(l => mix.has(l.chapter));
    const entries = lineSlots(input, now, mixLock).map(s => ({
      date: s.date,
      props: lineProps(s, lockLine(s, input.schedule.seed, mixLock), c, art),
    }));
    if (entries.length) w.line.updateTimeline(entries);
  } catch {
    // Widget extension not in this build, or nothing to show.
  }

  try {
    const entries = [{ date: now, props: recordProps(input, input.today, art) }];
    for (let i = 1; i <= DAYS_AHEAD; i++) {
      const day = addDays(input.today, i);
      entries.push({ date: dayStart(day), props: recordProps(input, day, art) });
    }
    w.record.updateTimeline(entries.filter((e, i) => i === 0 || e.date.getTime() > now.getTime()));
  } catch {
    // Widget extension not in this build.
  }

  try {
    const props: StandardWidgetProps = {
      rules: input.standard.filter(r => r.trim()).slice(0, 3).map(typo),
      empty: typo(COPY.standard.title),
      walkerTemplate: art.walkerTemplate,
    };
    w.standard.updateTimeline([{ date: now, props }]);
  } catch {
    // Widget extension not in this build.
  }
}
