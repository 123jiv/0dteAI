// Anonymous usage counts (launch pass P1-20; docs/METRICS.md): what may ever leave the phone, and
// how each record is built. Pure: no React, no native code, no network, no storage.
//
// Shipped dormant. services/metrics records nothing unless the user turned sharing on (nothing in
// this build does) and sends nothing unless unsetld.com's config says so.
//
// The allowlist is the whole contract: an event or a property that isn't in it is dropped by
// `sanitize`, and so is any value outside its spec. Values are fixed categories and small numbers
// only: never text the user wrote, never a photo or anything about one, never an About you answer
// or an age, never an ID for the person or the phone. A mission of the user's own is 'custom' (its
// id holds a timestamp and its title is their words).
import { isCustomId } from './custom';
import { isProven } from './progress';
import { addDays, diffDays, parseDay, type DayKey } from './time';
import type { DayPlan, FocusId, Mission, Profile, ProgramState, ProofType, RecordState, SwapReason, TrackId, VerificationCheck, WeeklyFocus } from './types';

export const AREAS = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'] as const satisfies readonly TrackId[];
export const PROOFS = ['PHOTO', 'PHOTO_AFTER', 'BEFORE_AFTER', 'TIMER_AND_PHOTO', 'TIMER'] as const satisfies readonly ProofType[];
export const REASONS = ['not-relevant', 'cant-today', 'too-easy', 'too-hard', 'already-did', 'another'] as const satisfies readonly SwapReason[];
export const FOCUS_IDS = ['school-catchup', 'exam', 'business', 'gym', 'project', 'apply', 'routine', 'organize', 'save', 'skill', 'other'] as const satisfies readonly FocusId[];
/** core/verify's check ids. */
export const CHECKS = ['photos', 'fresh', 'order', 'timer', 'duplicate'] as const;
/** Where the paywall was opened from (navigation PaywallFrom), 'other' when nothing said. */
export const PAYWALL_FROM = ['colorway', 'settings', 'reminders', 'programs', 'swaps', 'other'] as const;
export const MINUTES = ['15', '30', '45', '60'] as const;
export const STREAKS = ['1', '2-3', '4-6', '7-13', '14-29', '30+'] as const;
export const PARTS = ['morning', 'afternoon', 'evening', 'night'] as const;

type Spec =
  | { k: 'enum'; of: readonly string[] }
  | { k: 'enums'; of: readonly string[]; max: number }
  | { k: 'int'; min: number; max: number }
  | { k: 'bool' }
  | { k: 'id'; label: string; ok: (s: string) => boolean };

const one = (of: readonly string[]): Spec => ({ k: 'enum', of });
const int = (min: number, max: number): Spec => ({ k: 'int', min, max });
const bool: Spec = { k: 'bool' };

/** Mission ids: an approved one ('P1') or 'custom'. Never a custom id or a retired id. */
export type IdCheck = (id: string) => boolean;

/**
 * The allowlist. Mission and Plan ids are checked against the content (passed in, so this file
 * stays pure): an approved mission id or 'custom', a Plan id from content/programs.json.
 */
export function schema(isApprovedId: IdCheck, isPlanId: IdCheck) {
  const mission: Spec = { k: 'id', label: 'mission', ok: s => s === 'custom' || isApprovedId(s) };
  const plan: Spec = { k: 'id', label: 'plan', ok: isPlanId };
  const planOrNone: Spec = { k: 'id', label: 'plan or none', ok: s => s === 'none' || isPlanId(s) };
  const area = one(AREAS);
  const proof = one(PROOFS);
  const minutes = one(MINUTES);
  return {
    onboarding_started: {},
    onboarding_step: { step: one(['areas', 'pace']) },
    onboarding_completed: {
      areas: { k: 'enums', of: AREAS, max: 4 } as Spec,
      minutes,
      intensity: one(['easy', 'lockin', 'push']),
      goal: one(['none', 'matched', 'picked', 'unmatched']),
      returning: bool,
    },
    first_mission_started: { mission, area, proof },
    first_mission_proven: { mission, area, proof },
    mission_proven: {
      mission,
      area,
      proof,
      n_today: int(1, 9),
      planned: int(0, 9),
      first_today: bool,
      first_this_week: bool,
      streak: one(STREAKS),
      plan: planOrNone,
      swapped_in: bool,
      clock: bool,
      part: one(PARTS),
    },
    proof_rejected: { mission, proof, failed: { k: 'enums', of: CHECKS, max: CHECKS.length } as Spec },
    mission_swapped: { from: mission, to: mission, reason: one(REASONS), used: int(1, 9), max: int(1, 9) },
    perfect_day: { planned: int(1, 9), minutes },
    day_closed: { planned: int(0, 9), proven: int(0, 9), swaps: int(0, 9), planned_min: int(0, 240), minutes, plan: bool },
    plan_started: { plan, free: bool },
    plan_left: { plan, at_day: int(0, 14), why: one(['left', 'switched', 'unavailable']) },
    plan_completed: { plan, days_over: int(0, 30) },
    weekly_focus_set: { focus: one([...FOCUS_IDS, 'none', 'skip']), week: one(['this', 'next']) },
    paywall_viewed: { from: one(PAYWALL_FROM) },
    purchase_completed: { product: one(['annual', 'monthly', 'lifetime']), trial: bool, from: one(PAYWALL_FROM) },
  } satisfies Record<string, Record<string, Spec>>;
}

export type Schema = ReturnType<typeof schema>;
export type EventName = keyof Schema;
export type Value = string | number | boolean | string[];
export type Props = Record<string, Value>;
/** What a call site hands `track`: loose values (sanitize checks them), or null for "nothing to record". */
export type Input = Record<string, unknown> | null;

export const EVENT_NAMES = Object.keys(schema(() => true, () => true)) as EventName[];

/** One property as docs/METRICS.md states it: `type` is the exact text of the doc's Type column. */
export interface PropDoc {
  prop: string;
  type: string;
}

function typeText(t: Spec): string {
  switch (t.k) {
    case 'enum':
      return `one of ${t.of.join(', ')}`;
    case 'enums':
      return `list of up to ${t.max}: ${t.of.join(', ')}`;
    case 'int':
      return `whole number ${t.min}-${t.max}`;
    case 'bool':
      return 'true or false';
    case 'id':
      return t.label === 'mission' ? 'approved mission id, or custom' : t.label === 'plan' ? 'Plan id' : 'Plan id, or none';
  }
}

/** The allowlist as docs/METRICS.md lists it (a test keeps the two equal). */
export function describeSchema(): Record<EventName, PropDoc[]> {
  const s = schema(() => true, () => true) as Record<string, Record<string, Spec>>;
  return Object.fromEntries(Object.entries(s).map(([e, props]) => [e, Object.entries(props).map(([prop, t]) => ({ prop, type: typeText(t) }))])) as Record<EventName, PropDoc[]>;
}

/** Drops anything off the allowlist: an unknown event (null), an unknown property, a value outside its spec. */
export function sanitize(s: Schema, name: string, props: Record<string, unknown>): Props | null {
  const spec = (s as Record<string, Record<string, Spec>>)[name];
  if (!spec || !Object.prototype.hasOwnProperty.call(s, name)) return null;
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (!Object.prototype.hasOwnProperty.call(spec, k)) continue; // not on the list: never sent
    const t = spec[k];
    if (t.k === 'enum' && typeof v === 'string' && t.of.includes(v)) out[k] = v;
    else if (t.k === 'enum' && typeof v === 'number' && t.of.includes(String(v))) out[k] = String(v);
    else if (t.k === 'enums' && Array.isArray(v)) out[k] = [...new Set(v.filter((x): x is string => typeof x === 'string' && t.of.includes(x)))].sort().slice(0, t.max);
    else if (t.k === 'int' && typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(t.min, Math.min(t.max, Math.round(v)));
    else if (t.k === 'bool' && typeof v === 'boolean') out[k] = v;
    else if (t.k === 'id' && typeof v === 'string' && t.ok(v)) out[k] = v;
  }
  return out;
}

// ── The queue ────────────────────────────────────────────────────────────────

/** At most this many records wait on the phone (about 100 KB); past it the oldest repeatable ones go. */
export const MAX_QUEUE = 500;
/** A record not sent within this many days goes. */
export const MAX_AGE_DAYS = 30;
/** At most this many records per request. */
export const BATCH = 100;

/** Once-only events (the funnel's steps): one each per install, kept even when the queue is full. */
export const ONCE: ReadonlySet<EventName> = new Set<EventName>(['onboarding_started', 'onboarding_completed', 'first_mission_started', 'first_mission_proven']);

/** What every record carries besides its event, worked out on the phone. */
export interface Stamp {
  /** The UNSETLD day it happened (the 4:00 AM day). A date, never a time. */
  day: DayKey;
  /** Days since setup on this install (0 = that day), at most 400. null: sharing started after setup. */
  dn: number | null;
  /** Monday of the setup week, or 'pre' when sharing started after setup. */
  cohort: string;
}

export interface QueuedEvent extends Stamp {
  e: EventName;
  p: Props;
}

/** Records older than MAX_AGE_DAYS on `today` go. */
export function fresh(q: readonly QueuedEvent[], today: DayKey): QueuedEvent[] {
  return q.filter(x => diffDays(x.day, today) <= MAX_AGE_DAYS);
}

export function enqueue(q: readonly QueuedEvent[], ev: QueuedEvent, today: DayKey): QueuedEvent[] {
  const next = [...fresh(q, today), ev];
  if (next.length <= MAX_QUEUE) return next;
  // Over the cap: the oldest repeatable records go first; the funnel's steps stay.
  let extra = next.length - MAX_QUEUE;
  const kept = next.filter(x => {
    if (extra > 0 && !ONCE.has(x.e)) {
      extra--;
      return false;
    }
    return true;
  });
  return kept.slice(-MAX_QUEUE);
}

/** Monday of `day`'s week (weeks start on Monday, as the weekly focus and review do). */
export function mondayKey(day: DayKey): DayKey {
  return addDays(day, -((parseDay(day).getDay() + 6) % 7));
}

export function cohortOf(installDay: DayKey | null): string {
  return installDay ? mondayKey(installDay) : 'pre';
}

export function stamp(installDay: DayKey | null, day: DayKey): Stamp {
  return { day, dn: installDay ? Math.min(400, Math.max(0, diffDays(installDay, day))) : null, cohort: cohortOf(installDay) };
}

// ── Building records from app state (the call sites' one line each) ─────────

export function streakBucket(n: number): (typeof STREAKS)[number] {
  return n <= 1 ? '1' : n <= 3 ? '2-3' : n <= 6 ? '4-6' : n <= 13 ? '7-13' : n <= 29 ? '14-29' : '30+';
}

/** Part of the day from the local hour: 4-11 morning, 12-16 afternoon, 17-21 evening, else night. */
export function partOf(hour: number): (typeof PARTS)[number] {
  return hour >= 4 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night';
}

/** A mission as a record names it: its approved id, or 'custom' for one of the user's own. */
export function missionRef(id: string): string {
  return isCustomId(id) ? 'custom' : id;
}

/** Nothing proven on this record yet, ever (a restored record counts). */
export function nothingProven(r: RecordState): boolean {
  if (Object.keys(r.days ?? {}).length) return false;
  return !Object.values(r.missions ?? {}).some(day => Object.values(day ?? {}).some(isProven));
}

const provenOn = (r: RecordState, day: DayKey) => Object.values(r.missions?.[day] ?? {}).some(isProven);

type MissionLike = Pick<Mission, 'id' | 'track' | 'proofType'>;

export function missionFacts(m: MissionLike, area: TrackId | undefined): Input {
  return { mission: missionRef(m.id), area: area ?? m.track, proof: m.proofType };
}

/** first_mission_started: only while nothing was ever proven on this record; else null. */
export function firstStart(r: RecordState, m: MissionLike | undefined, area: TrackId | undefined): Input {
  return m && nothingProven(r) ? missionFacts(m, area) : null;
}

/** onboarding_completed. `reach`: the areas the goal's words reach (core/areaChoice goalReach). */
export function onboardingFacts(p: Pick<Profile, 'tracks' | 'minutes' | 'intensity' | 'goal' | 'goalArea'>, reach: readonly TrackId[], returning: boolean): Input {
  const goal = !p.goal ? 'none' : p.goalArea ? 'picked' : reach.length ? 'matched' : 'unmatched';
  // "How hard?" is only asked with an hour; below it the answer changes nothing, so it isn't sent.
  return { areas: [...p.tracks], minutes: p.minutes, ...(p.minutes === 60 ? { intensity: p.intensity } : {}), goal, returning };
}

/** What one accepted proof says, for store completeMission. */
export interface ProofFacts {
  /** The record before and after this proof. */
  before: RecordState;
  after: RecordState;
  day: DayKey;
  plan: DayPlan | null;
  mission: MissionLike;
  /** The streak after this proof. */
  streak: number;
  /** The proof's time was checked against the server's clock. */
  clock: boolean;
  /** The local hour now. */
  hour: number;
  minutes: Profile['minutes'];
  /** The Plan this proof finished, if it finished one. */
  finished: (Pick<ProgramState, 'id' | 'startedDay'> & { days: number; finishedDay: DayKey }) | null;
}

/** The records one accepted proof makes: the first proof ever, the proof, a perfect day, a Plan finished. */
export function provenEvents(f: ProofFacts): [EventName, Input][] {
  const planned = f.plan?.missions ?? [];
  const slot = planned.find(p => p.missionId === f.mission.id);
  const base = missionFacts(f.mission, slot?.area);
  const allProven = (r: RecordState) => planned.length > 0 && planned.every(p => isProven(r.missions?.[f.day]?.[p.missionId]));
  const nToday = planned.length ? planned.filter(p => isProven(f.after.missions?.[f.day]?.[p.missionId])).length : Object.values(f.after.missions?.[f.day] ?? {}).filter(isProven).length;
  let week = false;
  for (let d = mondayKey(f.day); d <= f.day; d = addDays(d, 1)) week ||= provenOn(f.before, d);
  const out: [EventName, Input][] = [];
  if (nothingProven(f.before)) out.push(['first_mission_proven', base]);
  out.push([
    'mission_proven',
    {
      ...base,
      n_today: nToday,
      planned: planned.length || nToday,
      first_today: !provenOn(f.before, f.day),
      first_this_week: !week,
      streak: streakBucket(f.streak),
      plan: slot?.programId ?? 'none',
      swapped_in: Boolean(f.plan?.swaps?.some(s => s.to === f.mission.id)),
      clock: f.clock,
      part: partOf(f.hour),
    },
  ]);
  if (allProven(f.after) && !allProven(f.before)) out.push(['perfect_day', { planned: planned.length, minutes: f.minutes }]);
  if (f.finished) out.push(['plan_completed', { plan: f.finished.id, days_over: diffDays(f.finished.startedDay, f.finished.finishedDay) + 1 - f.finished.days }]);
  return out;
}

export function swapFacts(from: string, to: string, reason: SwapReason, used: number, max: number): Input {
  return { from: missionRef(from), to: missionRef(to), reason, used, max };
}

export function rejectFacts(m: MissionLike, checks: readonly Pick<VerificationCheck, 'id' | 'ok'>[]): Input {
  return { mission: missionRef(m.id), proof: m.proofType, failed: checks.filter(c => !c.ok).map(c => c.id) };
}

/**
 * plan_left: a Plan stopped before its end: `why` the user's (left, or switched to another), or
 * 'unavailable' for a Plan the library no longer has. Clearing a finished one isn't leaving (null).
 */
export function planLeft(p: ProgramState | null, known: IdCheck, why: 'left' | 'switched'): Input {
  if (!p || p.finishedDay) return null;
  return { plan: p.id, at_day: Array.isArray(p.doneDays) ? p.doneDays.length : 0, why: known(p.id) ? why : 'unavailable' };
}

/** weekly_focus_set: the choice only; for 'other', never what was typed (or the area it led to). */
export function focusFacts(focus: Pick<WeeklyFocus, 'id'> | null | 'skip', next: boolean): Input {
  return { focus: focus === 'skip' ? 'skip' : (focus?.id ?? 'none'), week: next ? 'next' : 'this' };
}

/** day_closed: how a planned day ended, sent the first time the app runs on a later day. */
export function dayClosed(plan: DayPlan, r: RecordState, minutes: Profile['minutes'], minutesOf: (id: string) => number | undefined): Input {
  const total = plan.missions.reduce((t, p) => t + (minutesOf(p.missionId) ?? 0), 0);
  return {
    planned: plan.missions.length,
    proven: plan.missions.filter(p => isProven(r.missions?.[plan.day]?.[p.missionId])).length,
    swaps: plan.rerolls,
    // Rounded to 5: enough to check the time promise (the bands in core/missions DAY_SHAPE).
    planned_min: Math.round(total / 5) * 5,
    minutes,
    plan: plan.missions.some(p => p.programId),
  };
}

/** unsetld.com's switch (config.json `metrics`): only a literal true turns sending on. */
export function parseMetricsSwitch(v: unknown): boolean {
  return v === true;
}
