// The record: which days the user showed up, and what that opens.
// Pure functions over RecordState so they can be tested without React.
import { addDays, diffDays, type DayKey } from './time';
import type { Milestone, MilestoneId, RecordState } from './types';

/** Days with nothing on record before access pauses. */
export const PAUSE_AFTER_MISSED = 14;
/** Days on record needed after a pause to open access again. */
export const REOPEN_AFTER = 7;
/** Road milestones, in order. */
export const ROAD = [7, 90, 365] as const;
/** Milestones that pause (early access). Matches `pausable` in milestones.json. */
export const PAUSABLE_DAYS: readonly number[] = [7];

export function emptyRecord(): RecordState {
  return { days: {}, nights: {}, lettersShown: [], patchClaimed: null, work: {}, codes: [], missions: {}, bonuses: {}, redemptions: [], legacyPoints: 0 };
}

export function sortedDays(r: RecordState): DayKey[] {
  return Object.keys(r.days).sort();
}

export function isOnRecord(r: RecordState, day: DayKey): boolean {
  return Boolean(r.days[day]);
}

/** Puts `day` on record. Only today can be recorded: no backfilling. */
export function recordDay(r: RecordState, day: DayKey, verified: boolean): RecordState {
  if (r.days[day]) {
    // Upgrade an unverified day once the clock checks out; never downgrade.
    if (verified && !r.days[day].verified) return { ...r, days: { ...r.days, [day]: { verified: true } } };
    return r;
  }
  const days = sortedDays(r);
  // Clock went backwards past the latest recorded day: don't record an earlier day.
  if (days.length && day < days[days.length - 1]) return r;
  return { ...r, days: { ...r.days, [day]: { verified } } };
}

export function answerNight(r: RecordState, day: DayKey, held: boolean): RecordState {
  return { ...r, nights: { ...r.nights, [day]: held } };
}

/** "Day N": the number of days on record. */
export function dayCount(r: RecordState): number {
  return Object.keys(r.days).length;
}

export interface Stats {
  /** Days on record. */
  total: number;
  /** Consecutive days on record ending today (0 if today isn't on record yet and yesterday wasn't either). */
  run: number;
  longest: number;
  /** Nights answered Held, among days on record. */
  held: number;
}

export function stats(r: RecordState, today: DayKey): Stats {
  const days = sortedDays(r);
  let longest = 0;
  let cur = 0;
  let prev: DayKey | null = null;
  for (const d of days) {
    cur = prev && diffDays(prev, d) === 1 ? cur + 1 : 1;
    longest = Math.max(longest, cur);
    prev = d;
  }
  // Current run: count back from today (or yesterday, if today isn't on record yet).
  let run = 0;
  let cursor = r.days[today] ? today : addDays(today, -1);
  while (r.days[cursor]) {
    run++;
    cursor = addDays(cursor, -1);
  }
  const held = days.filter(d => r.nights[d] === true).length;
  return { total: days.length, run, longest, held };
}

export interface AccessState {
  paused: boolean;
  /** Days on record since the pause began (counts toward REOPEN_AFTER). */
  reopenProgress: number;
  /** The most recent day access reopened after a pause. */
  lastComeback: DayKey | null;
}

/**
 * Walks the record: a gap of PAUSE_AFTER_MISSED or more missed days pauses
 * access; REOPEN_AFTER more days on record reopens it. The count never drops.
 * Nothing pauses before early access has opened, since nothing is open yet.
 */
export function accessState(r: RecordState, today: DayKey): AccessState {
  const days = sortedDays(r);
  const opensAt = Math.min(...PAUSABLE_DAYS);
  let paused = false;
  let progress = 0;
  let lastComeback: DayKey | null = null;
  let prev: DayKey | null = null;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    // `i` days were on record when this gap began.
    if (prev && i >= opensAt && diffDays(prev, d) - 1 >= PAUSE_AFTER_MISSED) {
      paused = true;
      progress = 0;
    }
    if (paused) {
      progress++;
      if (progress >= REOPEN_AFTER) {
        paused = false;
        progress = 0;
        lastComeback = d;
      }
    }
    prev = d;
  }
  if (prev && days.length >= opensAt && prev < today && diffDays(prev, today) - 1 >= PAUSE_AFTER_MISSED) {
    paused = true;
    progress = 0;
  }
  return { paused, reopenProgress: paused ? progress : 0, lastComeback };
}

export type MilestoneStatus =
  | { kind: 'open' }
  | { kind: 'used' }
  | { kind: 'paused' }
  | { kind: 'locked'; daysLeft: number };

/** Early access pauses; the patch is used once claimed; the 365 piece stays open. */
export function milestoneStatus(r: RecordState, m: Milestone, today: DayKey): MilestoneStatus {
  const n = dayCount(r);
  if (n < m.day) return { kind: 'locked', daysLeft: m.day - n };
  if (m.pausable && accessState(r, today).paused) return { kind: 'paused' };
  if (m.id === 'patch' && r.patchClaimed) return { kind: 'used' };
  return { kind: 'open' };
}

export type Letter = { kind: 'milestone'; day: number; key: string } | { kind: 'comeback'; day: DayKey; key: string };

/** The letter to show on this open, if any. Milestones first; one at a time. */
export function pendingLetter(r: RecordState, today: DayKey): Letter | null {
  const n = dayCount(r);
  const a = accessState(r, today);
  // Only the highest reached, unseen milestone: someone restoring a long record gets one letter, not five.
  const reached = ROAD.filter(d => n >= d);
  const top = reached[reached.length - 1];
  // A paused perk's letter waits for access to reopen, so it never says "open" next to PAUSED.
  const held = a.paused && top !== undefined && PAUSABLE_DAYS.includes(top);
  if (top && !held && !r.lettersShown.includes(String(top))) return { kind: 'milestone', day: top, key: String(top) };
  // Pending until shown, not just on the day access reopened; never while paused again.
  if (a.lastComeback && !a.paused) {
    const key = `comeback:${a.lastComeback}`;
    if (!r.lettersShown.includes(key)) return { kind: 'comeback', day: a.lastComeback, key };
  }
  return null;
}

/**
 * Marks a letter shown, and every lower milestone with it. A pausable
 * milestone's letter also covers the latest comeback: it already says access is open.
 */
export function markLetterShown(r: RecordState, letter: Letter): RecordState {
  const keys = new Set(r.lettersShown);
  keys.add(letter.key);
  if (letter.kind === 'milestone') {
    for (const d of ROAD) if (d <= letter.day) keys.add(String(d));
    const days = sortedDays(r);
    const back = days.length ? accessState(r, days[days.length - 1]).lastComeback : null;
    if (back && PAUSABLE_DAYS.includes(letter.day)) keys.add(`comeback:${back}`);
  }
  return { ...r, lettersShown: [...keys] };
}

export function claimPatch(r: RecordState, day: DayKey): RecordState {
  return r.patchClaimed ? r : { ...r, patchClaimed: day };
}

export interface BarcodeBar {
  day: DayKey;
  kind: 'on' | 'missed' | 'today';
}

/** The most recent days for the barcode, oldest first, ending today. */
export function barcode(r: RecordState, today: DayKey, max = 120): BarcodeBar[] {
  const days = sortedDays(r);
  const first = days.length ? (days[0] < today ? days[0] : today) : today;
  const span = Math.min(diffDays(first, today) + 1, max);
  const out: BarcodeBar[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ day: d, kind: d === today ? 'today' : r.days[d] ? 'on' : 'missed' });
  }
  return out;
}

/** Barcode bar geometry for a given width. */
export function barcodeGeometry(count: number, width: number) {
  const pitch = Math.min(8, width / Math.max(1, count));
  return { pitch, bar: pitch >= 4 ? 2 : 1 };
}

/** The last 7 days for the week squares, today rightmost. */
export function week(r: RecordState, today: DayKey): { day: DayKey; on: boolean; today: boolean }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { day: d, on: Boolean(r.days[d]), today: d === today };
  });
}

/** Walker position along the road, 0..1. Piecewise-linear over 0, 7, 90, 365. */
export function roadPosition(n: number): number {
  const stops = [0, ...ROAD];
  if (n <= 0) return 0;
  if (n >= 365) return 1;
  for (let i = 1; i < stops.length; i++) {
    if (n <= stops[i]) {
      const t = (n - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return (i - 1 + t) / (stops.length - 1);
    }
  }
  return 1;
}

export type { MilestoneId };
