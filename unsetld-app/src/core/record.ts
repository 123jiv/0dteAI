// The record: which days the user showed up, and the status letters already shown.
// Pure functions over RecordState so they can be tested without React.
import { addDays, diffDays, type DayKey } from './time';
import type { RecordState } from './types';

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

/** "Day N": the number of days on record. */
export function dayCount(r: RecordState): number {
  return Object.keys(r.days).length;
}

/**
 * A status letter: the tier reached at `day` active days (core/rewards pendingStatusLetter).
 * `key` is what goes into lettersShown once it's seen: 'status:<day>' (letterKey).
 */
export type Letter = { kind: 'status'; day: number; key: string };

/**
 * The lettersShown key for the status letter at `day` active days. New in 3.2: the earlier
 * early-access letters used '7', '90', '365', so someone who saw one of those still hears
 * about a status code once.
 */
export function letterKey(day: number): string {
  return `status:${day}`;
}

/**
 * Marks a letter shown, and every lower tier's letter with it (`tiers`: the status tiers in
 * effect), so reaching 30 days after the 7-day letter was never shown doesn't then show it.
 */
export function markLetterShown(r: RecordState, letter: Letter, tiers: readonly { day: number }[] = []): RecordState {
  const keys = new Set(Array.isArray(r.lettersShown) ? r.lettersShown : []);
  keys.add(letter.key);
  for (const t of tiers) if (t.day < letter.day) keys.add(letterKey(t.day));
  return { ...r, lettersShown: [...keys] };
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
