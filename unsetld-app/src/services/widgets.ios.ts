import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import * as Notifications from 'expo-notifications';
import { AppState, Dimensions, Image, PixelRatio, type NativeEventSubscription } from 'react-native';
import type { LineWidgetProps } from '../../widgets/UnsetldLine';
import type { RecordWidgetProps } from '../../widgets/UnsetldRecord';
import type { StandardWidgetProps } from '../../widgets/UnsetldStandard';
import { isClean, isLockEligible, pickFor } from '../core/feed';
import { dayCount, emptyRecord, week } from '../core/record';
import { MAX_PENDING } from '../core/reminders';
import { addDays, dayKeyOf, dayStart, widgetDate, type DayKey } from '../core/time';
import { lineOfDay } from '../core/today';
import { catalogueNo, typo } from '../core/typography';
import type { Colorway, Line } from '../core/types';
import { chapterLabel, COLORWAYS, LINE_BY_NO, LINES, SCHEDULE, TASKS } from '../content';
import { COPY } from '../content/copy';
import { getDayOffset } from './clock';
import { composePlan, type ScheduleInput } from './notifications';
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

function reload(widgets: { reload(): void }[]) {
  for (const widget of widgets) {
    try {
      widget.reload();
    } catch {
      // Widget extension not in this build.
    }
  }
}

// ---------------------------------------------------------------------------
// Images in the App Group folder: the walker PNGs (copied once per
// ASSET_VERSION) and the colorway plates (downscaled per family, on demand).

const ASSET_VERSION = '2';
const MARKER = 'unsetld-assets.txt';
const INLINE_WALKER = 'walker-inline.png';

const WALKERS: Record<string, number> = {
  'walker-bone.png': require('../../assets/brand/walker-bone.png'),
  'walker-ink.png': require('../../assets/brand/walker-ink.png'),
  'walker-template.png': require('../../assets/brand/walker-template.png'),
};

/** The 1024x1024 colorway plates, by colorway id. Too large for WidgetKit as they are. */
const PLATES: Record<string, number> = {
  black: require('../../assets/colorways/black-widget.jpg'),
  bone: require('../../assets/colorways/bone-widget.jpg'),
  'snow-wash': require('../../assets/colorways/snow-wash-widget.jpg'),
  'sun-fade': require('../../assets/colorways/sun-fade-widget.jpg'),
  concrete: require('../../assets/colorways/concrete-widget.jpg'),
  charcoal: require('../../assets/colorways/charcoal-widget.jpg'),
  plum: require('../../assets/colorways/plum-widget.jpg'),
  coffee: require('../../assets/colorways/coffee-widget.jpg'),
  olive: require('../../assets/colorways/olive-widget.jpg'),
  midnight: require('../../assets/colorways/midnight-widget.jpg'),
};

/**
 * walker-template.png downsampled to 7x15 px. The inline Lock Screen family
 * draws an image at its own size and ignores frames, and the widget's Image
 * loads files at scale 1, so the inline walker needs a file that is already
 * 7x15 points.
 */
const INLINE_WALKER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAcAAAAPCAYAAAAoAdW+AAAA50lEQVR42kXQsUqWcRiG8d/7+hVCVFDkZFBDR1BbtIljWwU1GNjuGXgKjnYUtUWh0GgQbhJEgwVutWQFDcLV0D+64Z6ee7ieS6WaRl9UH6pL1TT7n3AR13EezZiwhHP4gg18w2IehzM8wCZuYsbZVMF9bGEZP/AKL6fqKt6N9UPs4iOOFng01ldwiBPcwrV5kK3geMDtYRXbqqXqebU/fr5XnVbL/wS8rY6r29X76kl1YcYz3MXXIeMO1vFrqg7wE6cD7gSXcWPG4wH1Zsh4jQP8Vj3tb1YG0Eb1qTJjDTv4jsVQ+BmLP7t/iKKVmj8rAAAAAElFTkSuQmCC';

const fileUri = (path: string) => (/^[a-z]+:/i.test(path) ? path : `file://${path}`);

async function copyAsset(source: number, dest: File): Promise<void> {
  const uri = Image.resolveAssetSource(source)?.uri;
  if (!uri) throw new Error('unresolved asset');
  // Dev builds serve assets from Metro; release builds have them in the app bundle.
  if (/^https?:/i.test(uri)) await File.downloadFileAsync(uri, dest, { idempotent: true });
  else await new File(uri).copy(dest, { overwrite: true });
}

type PlateFamily = 'small' | 'medium' | 'large';
const PLATE_FAMILIES: PlateFamily[] = ['small', 'medium', 'large'];
type Plates = Record<PlateFamily, string>;
const NO_PLATES: Plates = { small: '', medium: '', large: '' };

/**
 * Home Screen widget sizes in points ([small side, medium w x h, large w x h])
 * by screen width, from Apple's widget size table. Each row takes the
 * smallest phone of its width group, so a plate is never sized for a widget
 * larger than the real one.
 */
const WIDGET_POINTS: { minWidth: number; small: number; medium: [number, number]; large: [number, number] }[] = [
  { minWidth: 428, small: 170, medium: [364, 170], large: [364, 382] },
  { minWidth: 390, small: 158, medium: [338, 158], large: [338, 354] },
  { minWidth: 375, small: 148, medium: [321, 148], large: [321, 324] },
  { minWidth: 0, small: 141, medium: [292, 141], large: [292, 311] },
];
/**
 * WidgetKit refuses to archive an image whose pixel area is over a limit tied
 * to the widget's size ('Widget archival failed due to image being too
 * large'), and the widget then draws blank. Plates are square (the widget
 * fills and crops them), so each family gets its own plate whose area is at
 * most this share of that widget's pixel area, and never over MAX_PLATE_SIDE².
 */
const PLATE_AREA_SHARE = 0.6;
const MAX_PLATE_SIDE = 768;

function plateSides(): Record<PlateFamily, number> {
  const { width, height } = Dimensions.get('screen');
  const pts = WIDGET_POINTS.find(r => Math.min(width, height) >= r.minWidth) ?? WIDGET_POINTS[WIDGET_POINTS.length - 1];
  const scale = PixelRatio.get();
  const side = (w: number, h: number) =>
    Math.max(64, Math.min(MAX_PLATE_SIDE, Math.floor(Math.sqrt(PLATE_AREA_SHARE * w * h) * scale)));
  return { small: side(pts.small, pts.small), medium: side(...pts.medium), large: side(...pts.large) };
}

const plateName = (id: string, family: PlateFamily, side: number) => `plate-${id}-${family}-${side}.jpg`;

function platePaths(directory: string | null, c: Colorway): Plates {
  if (!directory || PLATES[c.id] == null) return NO_PLATES;
  const sides = plateSides();
  const out = { ...NO_PLATES };
  for (const f of PLATE_FAMILIES) out[f] = `${directory}${plateName(c.id, f, sides[f])}`;
  return out;
}

/** Decodes the plate at `side` px square (ImageIO thumbnailing), encodes it to a file and copies that into `dest`. */
async function downscale(source: number, side: number, dest: File): Promise<void> {
  const ref = await ExpoImage.loadAsync(source, { maxWidth: side, maxHeight: side });
  try {
    const key = `unsetld-widget:${dest.name}`;
    await ExpoImage.writeToCacheAsync(ref, key);
    const path = await ExpoImage.getCachePathAsync(key);
    if (!path) throw new Error('plate not cached');
    await new File(fileUri(path)).copy(dest, { overwrite: true });
  } finally {
    ref.release();
  }
}

const plateJobs = new Map<string, Promise<void>>();

/**
 * Makes the colorway's three plates if they aren't in the App Group folder
 * yet, then redraws. Timelines already point at these paths; until the files
 * exist the widgets draw the colorway colour.
 */
function ensurePlates(w: Loaded, c: Colorway) {
  const source = PLATES[c.id];
  const directory = w.directory;
  if (!directory || source == null) return;
  const sides = plateSides();
  const key = `${c.id}:${sides.small}:${sides.medium}:${sides.large}`;
  if (plateJobs.has(key)) return;
  const job = (async () => {
    const dir = new Directory(directory);
    let made = false;
    for (const f of PLATE_FAMILIES) {
      const dest = new File(dir, plateName(c.id, f, sides[f]));
      if (dest.exists) continue;
      await downscale(source, sides[f], dest);
      made = true;
    }
    if (made) reload([w.line, w.record]);
  })();
  plateJobs.set(key, job);
  // Try again on the next write.
  job.catch(() => plateJobs.delete(key));
}

/**
 * Copies the walker PNGs into the App Group folder so the widgets can draw
 * them, and removes the full-size plates earlier versions copied there. Skips
 * work when this version is already there. Before the first timeline is
 * written (onboarding), writes a Black preview so the widget gallery shows
 * real content. Never throws: without the images, widgets draw without them.
 */
export async function prepareWidgetAssets(): Promise<void> {
  const w = load();
  if (!w) return;
  try {
    if (w.directory) {
      const dir = new Directory(w.directory);
      const marker = new File(dir, MARKER);
      const names = [...Object.keys(WALKERS), INLINE_WALKER];
      const current = marker.exists && marker.textSync() === ASSET_VERSION && names.every(n => new File(dir, n).exists);
      if (!current) {
        let ok = true;
        for (const [name, source] of Object.entries(WALKERS)) {
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
        // Version 1 copied the 1024 px plates as-is; WidgetKit can't archive them.
        for (const id of Object.keys(PLATES)) {
          try {
            const old = new File(dir, `${id}-widget.jpg`);
            if (old.exists) old.delete();
          } catch {
            // Leave it; nothing points at it any more.
          }
        }
        if (ok) marker.write(ASSET_VERSION);
        // Entries written before the copy already point at these paths; redraw them.
        reload([w.line, w.record, w.standard]);
      }
    }
  } catch {
    // No App Group container or file access: widgets draw without images.
  }
  await writePreviews(w).catch(() => {});
}

// ---------------------------------------------------------------------------
// Timelines

/** Days of 4:00 AM boundaries written ahead. */
const DAYS_AHEAD = 7;
/** Line timeline cap: now, every boundary and every reminder the notifications can hold, so nothing is ever cut. */
const MAX_LINE_ENTRIES = 1 + DAYS_AHEAD + MAX_PENDING;
/** Inks of the light colorways (Bone, Snow Wash, Concrete): they take the ink walker. */
const LIGHT_INKS = ['#11100F', '#0E0D0C'];
/**
 * reschedule() runs about a second after updateWidgets and only schedules
 * reminders more than a minute ahead, so a reminder this close after the
 * settings took effect may never have been scheduled.
 */
const SCHEDULE_MARGIN_MS = 2 * 60_000;

const byNo = (a: Line, b: Line) => a.no - b.no;
/** Clean, unattributed, 60 characters or fewer: the Lock Screen pool. */
const LOCK_POOL = LINES.filter(isLockEligible).sort(byNo);

type Planned = ReturnType<typeof composePlan>[number];

type Input = WidgetInput;

/** One clock for everything: the app's clock (with the testers' day offset) for what to show, real time for when. */
interface Clock {
  now: Date;
  today: DayKey;
  /** App clock minus real time; 0 in production. */
  offsetMs: number;
}

function readClock(): Clock {
  const offsetMs = getDayOffset() * 86_400_000;
  const now = new Date(Date.now() + offsetMs);
  return { now, today: dayKeyOf(now), offsetMs };
}

interface Delivery {
  /** Notifications are allowed, so reschedule() schedules the plan's reminders. */
  granted: boolean;
  /** Real time since which the current reminder settings (and permission) have been in effect. */
  since: number;
  /** Reminders still in Notification Center. */
  presented: ReadonlySet<string>;
}

const NO_DELIVERY: Delivery = { granted: false, since: Infinity, presented: new Set() };

const SCHEDULE_FILE = 'widget-schedule.json';

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return String(new Date().getTimezoneOffset());
  }
}

/**
 * When the reminder settings that decide which reminders exist and when
 * (count, first, last, night check, permission, time zone) last changed.
 * Persisted, so a cold start keeps it.
 */
function settingsSince(s: ScheduleInput, granted: boolean, realNow: number): number {
  const key = JSON.stringify([s.remindersOn, s.count, s.first, s.last, s.night.on, s.night.time, s.seed, granted, timeZone()]);
  let file: File | null = null;
  try {
    file = new File(Paths.document, SCHEDULE_FILE);
    if (file.exists) {
      const saved = JSON.parse(file.textSync()) as { key?: string; since?: number };
      if (saved.key === key && typeof saved.since === 'number' && saved.since <= realNow) return saved.since;
    }
  } catch {
    // Unreadable: start over.
  }
  try {
    file?.write(JSON.stringify({ key, since: realNow }));
  } catch {
    // Without the file, every write counts as a fresh start: today's line until the next reminder.
  }
  return realNow;
}

async function deliveryState(s: ScheduleInput): Promise<Delivery> {
  const [perm, presented] = await Promise.all([
    Notifications.getPermissionsAsync(),
    Notifications.getPresentedNotificationsAsync().catch(() => [] as Notifications.Notification[]),
  ]);
  return {
    granted: perm.granted,
    since: settingsSince(s, perm.granted, Date.now()),
    presented: new Set(presented.map(n => n.request.identifier).filter(id => id.startsWith('rem-'))),
  };
}

interface Art {
  plates: Plates;
  walker: string;
  walkerTemplate: string;
  walkerInline: string;
}

function artFor(directory: string | null, c: Colorway): Art {
  const at = (name: string) => (directory ? `${directory}${name}` : '');
  return {
    plates: platePaths(directory, c),
    walker: at(LIGHT_INKS.includes(c.ink.toUpperCase()) ? 'walker-ink.png' : 'walker-bone.png'),
    walkerTemplate: at('walker-template.png'),
    walkerInline: at(INLINE_WALKER),
  };
}

interface Ctx {
  input: Input;
  clock: Clock;
  delivery: Delivery;
  art: Art;
  hidden: ReadonlySet<number>;
  /** Stand-ins: short clean lines from the user's chapters (else any chapter), none hidden. */
  pool: Line[];
}

function context(input: Input, clock: Clock, delivery: Delivery, art: Art): Ctx {
  const hidden = new Set(input.hidden);
  const mix = new Set(input.mix);
  const open = LOCK_POOL.filter(l => !hidden.has(l.no));
  const mine = open.filter(l => mix.has(l.chapter));
  return { input, clock, delivery, art, hidden, pool: mine.length ? mine : open };
}

interface LineSlot {
  /** App-clock time of the entry. */
  date: Date;
  day: DayKey;
  line: Line;
  /** One of the user's own lines (no catalogue number). */
  yours?: boolean;
  /** Seeds the Lock Screen substitute when the line is too long for it. */
  lockKey: string;
}

/**
 * The line an entry shows. Boundaries and the day's first reminder: today's
 * global line. Task reminders: the line that notification delivered (a line
 * about the open task), or a short clean line from the user's chapters. Your
 * lines (Full Edition) take every other task reminder's slot. Never an
 * explicit or hidden line: a hidden one is swapped for a stand-in.
 */
function lineFor(c: Ctx, p: Planned | null, day: DayKey): Line | null {
  const seed = c.input.schedule.seed;
  if (p?.kind === 'task' && c.input.yourLines.length && p.index % 2 === 1) {
    const text = pickFor(c.input.yourLines, `${seed}:yours:${p.id}`);
    if (text) return { no: 0, chapter: 'discipline', text, explicit: false, volume: 1 };
  }
  const ok = (l: Line | null | undefined): l is Line => Boolean(l && isClean(l) && !c.hidden.has(l.no));
  if (p?.kind === 'task' && p.lineNo != null) {
    const l = LINE_BY_NO[p.lineNo];
    if (ok(l)) return l;
  }
  if (p && p.kind !== 'today') {
    const l = pickFor(c.pool, `${seed}:${p.id}`);
    if (l) return l;
  }
  const t = lineOfDay({ lines: LINES, schedule: SCHEDULE, tasks: TASKS, chapters: c.input.mix, salt: seed, day });
  if (ok(t)) return t;
  return pickFor(c.pool, `${seed}:today:${day}`) ?? t;
}

function lineSlots(c: Ctx): LineSlot[] {
  const { input, delivery } = c;
  const { now, today, offsetMs } = c.clock;
  const slot = (date: Date, p: Planned | null, day: DayKey): LineSlot | null => {
    const line = lineFor(c, p, day);
    return line ? { date, day, line, yours: line.no === 0, lockKey: p && p.kind !== 'today' ? p.id : `day:${day}` } : null;
  };

  // Now: the line the latest reminder delivered today, else today's line. A
  // reminder counts as delivered only if it is still in Notification Center,
  // or it came due after the current settings were scheduled (permission
  // granted). Reminders planned for earlier today, before the settings took
  // effect, never went out.
  const deliveredToday = composePlan(input.schedule, dayStart(today)).filter(p => {
    if (p.kind === 'night' || p.day !== today || p.date.getTime() > now.getTime()) return false;
    if (delivery.presented.has(p.id)) return true;
    return delivery.granted && p.date.getTime() - offsetMs > delivery.since + SCHEDULE_MARGIN_MS;
  });
  const current = slot(now, deliveredToday.length ? deliveredToday[deliveredToday.length - 1] : null, today);

  // Ahead: each 4:00 AM boundary for 7 days, and each reminder that will be
  // scheduled (permission granted) before the last of them ends.
  const ahead = new Map<number, LineSlot>();
  const end = dayStart(addDays(today, DAYS_AHEAD + 1)).getTime();
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const s = slot(dayStart(day), null, day);
    if (s) ahead.set(s.date.getTime(), s);
  }
  if (delivery.granted) {
    for (const p of composePlan(input.schedule, now)) {
      if (p.kind === 'night' || p.date.getTime() >= end) continue;
      const s = slot(p.date, p, p.day);
      // A reminder at exactly 4:00 AM replaces the boundary entry: same moment, the notification's line.
      if (s) ahead.set(s.date.getTime(), s);
    }
  }
  const later = [...ahead.values()]
    .filter(s => s.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return (current ? [current, ...later] : later).slice(0, MAX_LINE_ENTRIES);
}

/** The same line if it fits the Lock Screen, else a stable short clean line (the user's chapters first). */
function lockLine(c: Ctx, s: LineSlot): Line {
  if (s.yours ? s.line.text.length <= 60 : isLockEligible(s.line)) return s.line;
  return pickFor(c.pool, `${c.input.schedule.seed}:lock:${s.lockKey}`) ?? s.line;
}

function lineProps(c: Ctx, s: LineSlot): LineWidgetProps {
  const lock = lockLine(c, s);
  const cw = c.input.colorway;
  return {
    text: typo(s.line.text),
    no: s.line.no,
    lockText: typo(lock.text),
    lockNo: lock.no,
    chapter: chapterLabel(s.yours ? 'yours' : s.line.chapter),
    catalogue: s.yours ? '' : catalogueNo(s.line.no),
    date: widgetDate(s.day),
    wordmark: COPY.wordmark,
    ink: cw.ink,
    secondary: cw.secondary,
    bg: cw.bg,
    plateSmall: c.art.plates.small,
    plateMedium: c.art.plates.medium,
    plateLarge: c.art.plates.large,
    walker: c.art.walker,
    walkerTemplate: c.art.walkerTemplate,
  };
}

function recordProps(c: Ctx, day: DayKey): RecordWidgetProps {
  const count = dayCount(c.input.record);
  const cw = c.input.colorway;
  return {
    count,
    label: COPY.record.label,
    unit: COPY.record.daysOnRecord(count),
    inline: `Day ${count}`,
    week: week(c.input.record, day).map(d => d.on),
    ink: cw.ink,
    secondary: cw.secondary,
    bg: cw.bg,
    plate: c.art.plates.small,
    walkerTemplate: c.art.walkerTemplate,
    walkerInline: c.art.walkerInline,
  };
}

type Which = { line: boolean; record: boolean; standard: boolean };
const ALL: Which = { line: true, record: true, standard: true };

function writeTimelines(w: Loaded, c: Ctx, which: Which = ALL) {
  const real = (d: Date) => new Date(d.getTime() - c.clock.offsetMs);
  const { now, today } = c.clock;

  if (which.line) {
    try {
      const entries = lineSlots(c).map(s => ({ date: real(s.date), props: lineProps(c, s) }));
      if (entries.length) w.line.updateTimeline(entries);
    } catch {
      // Widget extension not in this build, or nothing to show.
    }
  }

  if (which.record) {
    try {
      const entries = [{ date: real(now), props: recordProps(c, today) }];
      for (let i = 1; i <= DAYS_AHEAD; i++) {
        const day = addDays(today, i);
        const start = dayStart(day);
        if (start.getTime() > now.getTime()) entries.push({ date: real(start), props: recordProps(c, day) });
      }
      w.record.updateTimeline(entries);
    } catch {
      // Widget extension not in this build.
    }
  }

  if (which.standard) {
    try {
      const props: StandardWidgetProps = {
        rules: c.input.standard.filter(r => r.trim()).slice(0, 3).map(typo),
        empty: typo(COPY.standard.title),
        walkerTemplate: c.art.walkerTemplate,
      };
      w.standard.updateTimeline([{ date: real(now), props }]);
    } catch {
      // Widget extension not in this build.
    }
  }
}

let generation = 0;
let latest: WidgetInput | null = null;
let foreground: NativeEventSubscription | null = null;

/**
 * Writes all three timelines: on every foreground (it re-runs itself with the
 * latest input), after settings change and after the night check. Never throws.
 */
export function updateWidgets(input: WidgetInput): void {
  const w = load();
  if (!w) return;
  latest = input;
  if (!foreground) {
    foreground = AppState.addEventListener('change', state => {
      if (state === 'active' && latest) updateWidgets(latest);
    });
  }
  const run = ++generation;
  ensurePlates(w, input.colorway);
  deliveryState(input.schedule)
    .catch(() => NO_DELIVERY)
    .then(delivery => {
      // A newer call has the newer input.
      if (run !== generation) return;
      const clock = readClock();
      writeTimelines(w, context(input, clock, delivery, artFor(w.directory, input.colorway)), ALL);
    })
    .catch(() => {});
}

/**
 * Before onboarding finishes nothing calls updateWidgets, and a widget with no
 * timeline renders empty in the gallery. Fill any empty timeline with a Black
 * preview: today's line, no reminders, an empty record, no rules.
 */
async function writePreviews(w: Loaded) {
  if (latest) return;
  const empty = await Promise.all(
    [w.line, w.record, w.standard].map(x => x.getTimeline().then(t => t.length === 0, () => false)),
  );
  if (latest || !empty.some(Boolean)) return;
  const clock = readClock();
  const colorway = COLORWAYS[0];
  const input: Input = {
    today: clock.today,
    premium: false,
    colorway,
    mix: [],
    record: emptyRecord(),
    standard: [],
    hidden: [],
    yourLines: [],
    schedule: {
      remindersOn: false,
      count: 0,
      first: 0,
      last: 0,
      night: { on: false, time: 0 },
      answered: new Set(),
      mix: [],
      hidden: [],
      work: [],
      seed: '',
    },
  };
  ensurePlates(w, colorway);
  writeTimelines(w, context(input, clock, NO_DELIVERY, artFor(w.directory, colorway)), {
    line: empty[0],
    record: empty[1],
    standard: empty[2],
  });
}
