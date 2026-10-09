import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { AppState, Dimensions, Image, PixelRatio, type NativeEventSubscription } from 'react-native';
import type { LineWidgetProps } from '../../widgets/UnsetldLine';
import type { RecordWidgetProps } from '../../widgets/UnsetldRecord';
import type { StandardWidgetProps } from '../../widgets/UnsetldStandard';
import { emptyRecord } from '../core/record';
import { activeDays } from '../core/progress';
import { balance } from '../core/rewards';
import { computeStreak } from '../core/streak';
import { addDays, dayKeyOf, dayStart, widgetDate, type DayKey } from '../core/time';
import { typo } from '../core/typography';
import type { Colorway, Mission } from '../core/types';
import { COLORWAYS, MISSION_BY_ID, TRACK_BY_ID } from '../content';
import { HOME } from '../content/copy/home';
import { PLATFORM } from '../content/copy/platform';
import { getDayOffset } from './clock';
import type { WidgetInput } from './widgets.types';

const W = PLATFORM.widgets;

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
  // 2.x kept when the reminder settings last changed, to know which line each
  // reminder had delivered. Widgets no longer follow the reminders.
  try {
    const old = new File(Paths.document, 'widget-schedule.json');
    if (old.exists) old.delete();
  } catch {
    // Harmless if it stays.
  }
  await writePreviews(w).catch(() => {});
}

// ---------------------------------------------------------------------------
// Timelines

/** Days of 4:00 AM boundaries written ahead, so a closed app still turns the day over on the widgets. */
const DAYS_AHEAD = 7;
/** Days in the Streak widget's barcode. */
const BARCODE_DAYS = 28;
/** Inks of the light colorways (Bone, Snow Wash, Concrete): they take the ink walker. */
const LIGHT_INKS = ['#11100F', '#0E0D0C'];

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
  input: WidgetInput;
  art: Art;
  active: Set<DayKey>;
  points: number;
}

interface DayMissions {
  /** null: the day has no plan yet. */
  missions: { mission: Mission; proven: boolean }[] | null;
}

/** A day's planned missions in plan order, each with whether it's proven. */
function dayMissions(c: Ctx, day: DayKey): DayMissions {
  const plan = c.input.plans[day];
  if (!plan || !plan.missions.length) return { missions: null };
  const done = c.input.record.missions?.[day] ?? {};
  const missions = plan.missions
    .map(p => MISSION_BY_ID[p.missionId])
    .filter((m): m is Mission => Boolean(m))
    .map(mission => ({ mission, proven: done[mission.id]?.verification?.status === 'accepted' }));
  return { missions: missions.length ? missions : null };
}

/** "School · 30 min · +15": the line under a mission's title, as Home shows it. */
function missionMeta(m: Pick<Mission, 'track' | 'minutes' | 'points'>): string {
  return HOME.meta(TRACK_BY_ID[m.track]?.short ?? '', m.minutes, m.points, null);
}

/** Next mission: the first one in the day's plan that isn't proven yet, its title and "School · 30 min · +15". */
function lineProps(c: Ctx, day: DayKey): LineWidgetProps {
  const cw = c.input.colorway;
  const base = {
    date: widgetDate(day),
    wordmark: PLATFORM.wordmark,
    ink: cw.ink,
    secondary: cw.secondary,
    bg: cw.bg,
    plateSmall: c.art.plates.small,
    plateMedium: c.art.plates.medium,
    plateLarge: c.art.plates.large,
    walker: c.art.walker,
    walkerTemplate: c.art.walkerTemplate,
  };
  const { missions } = dayMissions(c, day);
  if (!missions) return { ...base, label: W.today, title: W.waiting(c.input.perDay), meta: '', progress: '', missionId: '' };
  const proven = missions.filter(m => m.proven).length;
  const progress = W.count(proven, missions.length);
  const next = missions.find(m => !m.proven);
  if (!next) return { ...base, label: W.today, title: W.perfect, meta: W.proven(missions.length), progress, missionId: '' };
  const m = next.mission;
  return {
    ...base,
    label: W.next,
    title: typo(m.title),
    meta: missionMeta(m),
    progress,
    missionId: m.id,
  };
}

/** The barcode string for the Streak widget (see RecordWidgetProps.bars). */
function barsFor(active: ReadonlySet<DayKey>, covered: readonly DayKey[], day: DayKey): string {
  const first = [...active].filter(d => d <= day).sort()[0] ?? day;
  const off = new Set(covered);
  let out = '';
  for (let i = BARCODE_DAYS - 1; i >= 0; i--) {
    const d = addDays(day, -i);
    if (d === day) out += active.has(d) ? 't' : 'p';
    else if (d < first) out += ' ';
    else out += active.has(d) ? 'o' : off.has(d) ? 'c' : '-';
  }
  return out;
}

/** Streak: as it stands at `day` (a later day counts only what's proven by now). */
function recordProps(c: Ctx, day: DayKey): RecordWidgetProps {
  const s = computeStreak(c.active, day);
  const cw = c.input.colorway;
  return {
    count: s.current,
    label: W.streak,
    unit: W.streakUnit(s.current),
    points: W.points(c.points),
    inline: W.inline(s.current),
    week: Array.from({ length: 7 }, (_, i) => c.active.has(addDays(day, i - 6))),
    bars: barsFor(c.active, s.covered, day),
    ink: cw.ink,
    secondary: cw.secondary,
    bg: cw.bg,
    plate: c.art.plates.small,
    walkerTemplate: c.art.walkerTemplate,
    walkerInline: c.art.walkerInline,
  };
}

/** Today: the day's mission titles with a square each, at most three (open ones first when there are four). */
function standardProps(c: Ctx, day: DayKey): StandardWidgetProps {
  const { missions } = dayMissions(c, day);
  const empty = typo(W.waiting(c.input.perDay));
  if (!missions) return { label: W.today, count: '', titles: [], done: [], empty, walkerTemplate: c.art.walkerTemplate };
  const shown = missions.length > 3 ? [...missions.filter(m => !m.proven), ...missions.filter(m => m.proven)].slice(0, 3) : missions;
  const order = [...shown].sort((a, b) => missions.indexOf(a) - missions.indexOf(b));
  return {
    label: W.today,
    count: W.count(missions.filter(m => m.proven).length, missions.length),
    titles: order.map(m => typo(m.mission.title)),
    done: order.map(m => m.proven),
    empty,
    walkerTemplate: c.art.walkerTemplate,
  };
}

type Which = { line: boolean; record: boolean; standard: boolean };
const ALL: Which = { line: true, record: true, standard: true };

/** Each timeline: now, then every 4:00 AM boundary for a week, when a new day with nothing proven yet begins. */
function writeTimelines(w: Loaded, c: Ctx, clock: Clock, which: Which = ALL) {
  const real = (d: Date) => new Date(d.getTime() - clock.offsetMs);
  const moments: { date: Date; day: DayKey }[] = [{ date: clock.now, day: clock.today }];
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const day = addDays(clock.today, i);
    const start = dayStart(day);
    if (start.getTime() > clock.now.getTime()) moments.push({ date: start, day });
  }
  const write = <P,>(widget: { updateTimeline(entries: { date: Date; props: P }[]): void }, props: (day: DayKey) => P) => {
    try {
      widget.updateTimeline(moments.map(m => ({ date: real(m.date), props: props(m.day) })));
    } catch {
      // Widget extension not in this build.
    }
  };
  if (which.line) write(w.line, day => lineProps(c, day));
  if (which.record) write(w.record, day => recordProps(c, day));
  if (which.standard) write(w.standard, day => standardProps(c, day));
}

function context(input: WidgetInput, art: Art): Ctx {
  return { input, art, active: activeDays(input.record), points: balance(input.record) };
}

let latest: WidgetInput | null = null;
let foreground: NativeEventSubscription | null = null;

/**
 * Writes all three timelines: on every foreground (it re-runs itself with the
 * latest input), and after plans, proof or the colorway change. Never throws.
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
  ensurePlates(w, input.colorway);
  try {
    writeTimelines(w, context(input, artFor(w.directory, input.colorway)), readClock(), ALL);
  } catch {
    // Nothing to show; the widgets keep their last timeline.
  }
}

/**
 * Before onboarding finishes nothing calls updateWidgets, and a widget with no
 * timeline renders empty in the gallery. Fill any empty timeline with a Black
 * preview: missions waiting, no streak yet.
 */
async function writePreviews(w: Loaded) {
  if (latest) return;
  const empty = await Promise.all(
    [w.line, w.record, w.standard].map(x => x.getTimeline().then(t => t.length === 0, () => false)),
  );
  if (latest || !empty.some(Boolean)) return;
  const clock = readClock();
  const colorway = COLORWAYS[0];
  const input: WidgetInput = { today: clock.today, premium: false, colorway, record: emptyRecord(), plans: {}, perDay: 3 };
  ensurePlates(w, colorway);
  writeTimelines(w, context(input, artFor(w.directory, colorway)), clock, {
    line: empty[0],
    record: empty[1],
    standard: empty[2],
  });
}

