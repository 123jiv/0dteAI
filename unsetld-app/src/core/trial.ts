// The free trial, as the store sells it. Its length comes from the product's introductory offer
// (App Store Connect), never from a number in the app; once bought, its end date comes from the
// entitlement (services/purchases EntitlementInfo.trialEnds). Pure: no store, no clock.

export type TrialUnit = 'day' | 'week' | 'month' | 'year';

export interface Trial {
  unit: TrialUnit;
  count: number;
}

/** A product's introductory offer, as StoreKit reports it through RevenueCat (PurchasesIntroPrice). */
export interface IntroOffer {
  price: number;
  periodUnit: string;
  periodNumberOfUnits: number;
  cycles: number;
}

const UNITS: Record<string, TrialUnit> = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

/** The free trial a product's intro offer gives: only an offer that costs nothing is a trial. */
export function trialOf(intro: IntroOffer | null | undefined): Trial | null {
  if (!intro || intro.price !== 0) return null;
  const unit = UNITS[String(intro.periodUnit).toUpperCase()];
  const units = Number(intro.periodNumberOfUnits);
  if (!unit || !Number.isFinite(units) || units <= 0) return null;
  const cycles = Number.isFinite(intro.cycles) && intro.cycles > 0 ? intro.cycles : 1;
  return { unit, count: Math.round(units * cycles) };
}

/** "3 days", "1 week", "1 month". */
export function trialLabel(t: Trial): string {
  return `${t.count} ${t.unit}${t.count === 1 ? '' : 's'}`;
}

/**
 * When a trial started at `start` ends, in calendar time (a week is 7 days, a month the same date
 * next month). A date the target month doesn't have ends on its last day, as the App Store does:
 * a month from 31 Jan ends 28 Feb (29 in a leap year), never 3 Mar; a year from 29 Feb, 28 Feb.
 * Only an estimate for the paywall: after a purchase the store's own expiration date is the
 * source of truth.
 */
export function trialEnd(start: Date, t: Trial): Date {
  const d = new Date(start.getTime());
  if (t.unit === 'day') d.setDate(d.getDate() + t.count);
  else if (t.unit === 'week') d.setDate(d.getDate() + 7 * t.count);
  else addMonths(d, t.unit === 'month' ? t.count : 12 * t.count);
  return d;
}

/** Moves `d` on by whole months, keeping its time of day; the 31st becomes the month's last day when it has fewer. */
function addMonths(d: Date, months: number): void {
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
}

const HOUR = 3_600_000;

/**
 * When the "trial ends tomorrow" reminder fires: 24 hours before the end. null when that is less
 * than an hour away (a trial restored on its last day), so it never fires late or at once.
 */
export function reminderAt(end: Date, now: Date): Date | null {
  if (Number.isNaN(end.getTime())) return null;
  const at = new Date(end.getTime() - 24 * HOUR);
  return at.getTime() >= now.getTime() + HOUR ? at : null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "22 OCT": a date on the paywall's timeline. */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}`;
}

/** "22 October": the same date, as VoiceOver reads it. */
export function longDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "22 Oct": a date in the membership row, this year. */
export function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "22 Oct 2026". */
export function dayMonthYear(d: Date): string {
  return `${dayMonth(d)} ${d.getFullYear()}`;
}

/** The paywall's trial timeline: today, the reminder (when one will come), the first charge. */
export interface TrialTimeline {
  start: Date;
  /** null: no reminder will come (notifications are off, or the trial is under 25 hours). */
  remind: Date | null;
  end: Date;
}

/** The timeline for a trial started now; `remind` is null unless a reminder can actually arrive. */
export function trialTimeline(t: Trial, now: Date, canRemind: boolean): TrialTimeline {
  const end = trialEnd(now, t);
  return { start: now, remind: canRemind ? reminderAt(end, now) : null, end };
}
