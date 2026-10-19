// Anonymous usage counts (launch pass P1-20; docs/METRICS.md), shipped dormant.
//
// `track` records nothing unless every one of these holds: an iPhone (never the browser preview),
// a release build (IS_PREVIEW off), no tester time travel, the user turned sharing on
// (settings.shareUsage === true: nothing in this build sets it) and unsetld.com hasn't switched
// it off (remote.metrics !== false). Records wait on the phone under their own key, never in the
// app's state or the Keychain backup, for up to 30 days, at most 500 of them.
//
// They are sent only while unsetld.com's config says `"metrics": true`: in batches of up to 100,
// with this module's own request: no session token, no Authorization header, no cookies
// (credentials 'omit'), never through services/access post() (whose 401 signs the phone out).
// Delete data on this phone removes the key (services/wipe).
import { Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { BATCH, dayClosed, enqueue, fresh, MAX_AGE_DAYS, ONCE, sanitize, schema, stamp, type EventName, type Input, type QueuedEvent } from '../core/metrics';
import { addDays, type DayKey } from '../core/time';
import type { DayPlan, Profile, RecordState } from '../core/types';
import { isApproved, MISSION_BY_ID, PROGRAM_BY_ID } from '../content';
import { appStorage } from '../state/storage';
import { getDayOffset, today } from './clock';

/** The key the records wait under (not the app's state, not the Keychain). */
export const METRICS_KEY = 'unsetld.metrics.v1';
/** Send once this many records wait... */
export const SEND_AT = 20;
/** ...or once the oldest has waited this long. */
export const SEND_AFTER_MS = 6 * 3600_000;
/** At most one try in this long, unless forced. */
export const RETRY_MS = 15 * 60_000;
const TIMEOUT_MS = 8000;

const SCHEMA = schema(isApproved, id => Object.prototype.hasOwnProperty.call(PROGRAM_BY_ID, id));

/** What the app's state says about sharing: the user's answer and unsetld.com's switch. */
export interface MetricsSwitches {
  shareUsage: boolean | null | undefined;
  metrics?: boolean | null;
}

/** What waits on the phone. Only ever written while recording is allowed. */
interface Saved {
  v: 1;
  /** The day setup finished, when sharing was on then; null when sharing started after setup. */
  installDay: DayKey | null;
  /** The once-only events already recorded (kept when sharing is turned off, so none counts twice). */
  once: EventName[];
  /**
   * day_closed covers days after this one: the day before the first record, and again after
   * sharing stops and starts ('' until the next record), so no day from while it was off is closed.
   */
  closed: DayKey | '';
  queue: QueuedEvent[];
  /** When the oldest record still waiting was made (ms; stays on the phone). */
  firstAt: number | null;
  /** A batch sent and not yet confirmed: retried with the same id. */
  pending: { id: string; events: QueuedEvent[] } | null;
}

let read: (() => MetricsSwitches) | null = null;

/** state/lifecycle connects the app's state (kept apart so the store and this module don't import each other). */
export function connectMetrics(fn: (() => MetricsSwitches) | null) {
  read = fn;
}

function switches(): MetricsSwitches | null {
  try {
    return read?.() ?? null;
  } catch {
    return null;
  }
}

/** Recording is allowed: iOS release build, real today, sharing on, not switched off. */
export function recording(): boolean {
  try {
    if (Platform.OS !== 'ios' || IS_PREVIEW || getDayOffset() !== 0) return false;
    const s = switches();
    return s?.shareUsage === true && s.metrics !== false;
  } catch {
    return false; // never in the way of what the app was doing
  }
}

/** Sending is allowed: recording is, and unsetld.com said yes. */
export function sending(): boolean {
  return recording() && switches()?.metrics === true;
}

// ── Storage, one job at a time ──────────────────────────────────────────────

let cache: Saved | null | undefined;
/** Bumped by a delete: a job that started before it never writes back. */
let generation = 0;
let chain: Promise<unknown> = Promise.resolve();

function run<T>(job: (gen: number) => Promise<T>): Promise<T | undefined> {
  const gen = generation;
  const next = chain.then(() => (gen === generation ? job(gen) : undefined)).catch(() => undefined);
  chain = next;
  return next;
}

/** Resolves once every job queued so far has run (tests, and a flush that should follow a record). */
export function metricsIdle(): Promise<void> {
  return chain.then(() => undefined);
}

function valid(x: unknown): x is Saved {
  const s = x as Saved | null;
  return !!s && s.v === 1 && Array.isArray(s.queue) && Array.isArray(s.once) && typeof s.closed === 'string';
}

async function load(): Promise<Saved | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await appStorage.getItem(METRICS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cache = valid(parsed) ? parsed : null;
  } catch {
    cache = null; // unreadable: start again
  }
  return cache;
}

async function save(s: Saved, gen: number): Promise<void> {
  if (gen !== generation) return;
  cache = s;
  await appStorage.setItem(METRICS_KEY, JSON.stringify(s));
}

function start(day: DayKey, first: EventName): Saved {
  return {
    v: 1,
    installDay: first.startsWith('onboarding_') ? day : null,
    once: [],
    closed: addDays(day, -1),
    queue: [],
    firstAt: null,
    pending: null,
  };
}

function add(s: Saved, name: EventName, input: Input, day: DayKey, now: DayKey): Saved {
  if (!input) return s;
  if (ONCE.has(name) && s.once.includes(name)) return s;
  const p = sanitize(SCHEMA, name, input);
  if (!p) return s;
  return {
    ...s,
    queue: enqueue(s.queue, { e: name, p, ...stamp(s.installDay, day) }, now),
    once: ONCE.has(name) ? [...s.once, name] : s.once,
    firstAt: s.queue.length ? (s.firstAt ?? Date.now()) : Date.now(),
  };
}

// ── Recording ───────────────────────────────────────────────────────────────

/**
 * Records one event, if recording is allowed. `props` are checked against the allowlist
 * (core/metrics): anything else is dropped. null records nothing.
 */
export function track(name: EventName, props: Input = {}): void {
  trackEach([[name, props]]);
}

/** Records several events in order (store completeMission: a proof, a perfect day, a Plan finished). */
export function trackEach(events: readonly (readonly [EventName, Input])[]): void {
  const first = events.find(([, p]) => p);
  if (!first || !recording()) return;
  let day: DayKey;
  try {
    day = today();
  } catch {
    return;
  }
  void run(async gen => {
    let s = (await load()) ?? start(day, first[0]);
    if (!s.closed) s = { ...s, closed: addDays(day, -1) };
    for (const [name, props] of events) s = add(s, name, props, day, day);
    await save(s, gen);
  });
}

/**
 * day_closed for each planned day since the last one closed, up to yesterday (at most 30 days
 * back): state/lifecycle calls it whenever it makes sure of today's plan. Nothing before the
 * first record: those days were never shared.
 */
export function closeDays(plans: Readonly<Record<DayKey, DayPlan>>, record: RecordState, minutes: Profile['minutes']): void {
  if (!recording()) return;
  const day = today();
  void run(async gen => {
    let s = await load();
    if (!s?.closed || s.closed >= addDays(day, -1)) return;
    const from = [addDays(s.closed, 1), addDays(day, -MAX_AGE_DAYS)].sort()[1];
    for (let d = from; d < day; d = addDays(d, 1)) {
      const plan = plans[d];
      if (plan?.missions?.length) s = add(s, 'day_closed', dayClosed(plan, record, minutes, id => MISSION_BY_ID[id]?.minutes), d, day);
    }
    await save({ ...s, closed: addDays(day, -1) }, gen);
  });
}

// ── Sending ─────────────────────────────────────────────────────────────────

let lastTry = 0;
let flushing = false;

function batchId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  // A batch id only lets the server drop a retried batch; it names nothing else.
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')).join('');
}

/** 'drop' when the server took the batch or refused it for good; 'keep' to retry it. */
async function send(batch: { id: string; events: QueuedEvent[] }): Promise<'drop' | 'keep'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AppConfig.apiBase}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ s: 1, app: AppConfig.version, batch: batch.id, events: batch.events }),
      signal: controller.signal,
    });
    return res.ok || res.status === 400 || res.status === 413 || res.status === 422 ? 'drop' : 'keep';
  } catch {
    return 'keep';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends the next batch, if sending is allowed and it's due: SEND_AT records waiting, or the oldest
 * SEND_AFTER_MS old, or `force`; never twice in RETRY_MS. A batch that failed goes again, same id.
 */
export async function flushMetrics(opts: { force?: boolean } = {}): Promise<void> {
  if (flushing || !sending() || Date.now() - lastTry < RETRY_MS) return;
  flushing = true;
  try {
    await flushOnce(Boolean(opts.force));
  } finally {
    flushing = false;
  }
}

async function flushOnce(force: boolean): Promise<void> {
  const day = today();
  const batch = await run(async gen => {
    const s = await load();
    if (!s) return null;
    let pending = s.pending ? { ...s.pending, events: fresh(s.pending.events, day) } : null;
    let rest = fresh(s.queue, day);
    if (!pending?.events.length) {
      pending = null;
      const due = force || rest.length >= SEND_AT || (s.firstAt !== null && Date.now() - s.firstAt >= SEND_AFTER_MS);
      if (!rest.length || !due) return null;
      pending = { id: batchId(), events: rest.slice(0, BATCH) };
      rest = rest.slice(BATCH);
    }
    await save({ ...s, pending, queue: rest, firstAt: rest.length ? (s.firstAt ?? Date.now()) : null }, gen);
    return gen === generation ? pending : null;
  });
  if (!batch) return;
  lastTry = Date.now();
  const outcome = await send(batch);
  await run(async gen => {
    const s = await load();
    if (outcome === 'drop' && s?.pending?.id === batch.id) await save({ ...s, pending: null }, gen);
  });
}

/**
 * Sharing turned off, or unsetld.com switched it off: every record not sent yet goes. What's
 * left is the once-only flags and the setup day, so nothing counts twice if it's turned on again;
 * day_closed starts again from the next record, so no day from while it was off is sent.
 */
export function stopMetrics(): Promise<void> {
  return run(async gen => {
    const s = await load();
    if (s && (s.queue.length || s.pending || s.closed)) await save({ ...s, queue: [], pending: null, firstAt: null, closed: '' }, gen);
  }).then(() => undefined);
}

/**
 * Delete data on this phone (services/wipe): the key goes whole. A job already queued never
 * writes again; one already writing finishes first, so the delete comes last.
 */
export function clearMetrics(): Promise<void> {
  generation++;
  const done = chain.then(async () => {
    cache = null;
    await appStorage.removeItem(METRICS_KEY);
  });
  chain = done.catch(() => undefined);
  return chain.then(() => undefined);
}
