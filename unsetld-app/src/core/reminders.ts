// Reminder planning. Pure: the notification service turns these into
// scheduled local notifications with each one's text (services/notifications).
import { hash32, mulberry32 } from './random';
import { addDays, atMinutes, dayNumber, minutesIntoDay, type DayKey } from './time';
import type { ReminderPrompt } from './types';

/**
 * The pending-notification budget. iOS keeps at most 64 pending local notifications per app, and
 * past that it drops some without a word (the latest ones, or the newest request). So the app
 * keeps 4 free, and holds a place for each kind that isn't a reminder: the focus timer's "done"
 * (one at a time), the trial reminder and the next two drop alerts. What's left is for reminders.
 */
export const IOS_PENDING_LIMIT = 64;
export const PENDING_HEADROOM = 4;
export const TIMER_SLOTS = 1;
export const TRIAL_SLOTS = 1;
/** Drop alerts scheduled at a time: the next two (a later one is added on a later foreground). */
export const DROP_ALERT_SLOTS = 2;
/** Every pending notification together: 64 − 4 = 60. */
export const PENDING_BUDGET = IOS_PENDING_LIMIT - PENDING_HEADROOM;
/** Mission reminders queued at most: 60 − 1 − 1 − 2 = 56. */
export const MAX_PENDING = PENDING_BUDGET - TIMER_SLOTS - TRIAL_SLOTS - DROP_ALERT_SLOTS;
export const REMINDER_COUNTS = [1, 3, 5, 10] as const;
export const FREE_MAX_REMINDERS = 3;
export const FULL_MAX_REMINDERS = 10;

export type Slot = ReminderPrompt['slot'];

/** morning 05–11, midday 11–15, evening 15–21, night 21–04 (04–05 counts as morning). */
export function slotOf(minutes: number): Slot {
  const h = Math.floor((((minutes % 1440) + 1440) % 1440) / 60);
  if (h >= 4 && h < 11) return 'morning';
  if (h >= 11 && h < 15) return 'midday';
  if (h >= 15 && h < 21) return 'evening';
  return 'night';
}

/** The first reminder names today's missions; the rest nudge the ones still open. */
export type ReminderKind = 'today' | 'task';

export interface ReminderTime {
  /** Minutes after midnight (may be past midnight for late windows, e.g. 1500 = 1:00 AM). */
  minutes: number;
  kind: ReminderKind;
}

export interface DayPlanOptions {
  day: DayKey;
  count: number;
  /** Minutes after midnight. */
  first: number;
  last: number;
  seed: string;
}

/** The day's last minute (3:59 AM), counted from 4:00 AM. */
const DAY_END = 24 * 60 - 1;

/**
 * The day's reminder times. The first is exact; the rest are evenly spaced
 * between First and Last inclusive with ±10 minutes of jitter. A Last at or
 * before First runs to the end of the day (3:59 AM). No two share a minute.
 */
export function dayReminderTimes(o: DayPlanOptions): ReminderTime[] {
  const count = Math.max(0, Math.floor(o.count));
  if (!count) return [];
  const start = minutesIntoDay(o.first);
  let end = minutesIntoDay(o.last);
  if (end <= start) end = DAY_END;
  const rand = mulberry32(hash32(`${o.seed}:rem:${o.day}`));
  const later: number[] = [];
  for (let i = 1; i < count; i++) {
    const t = start + ((end - start) * i) / (count - 1);
    later.push(Math.round(Math.min(end, Math.max(start + 1, t + (rand() * 20 - 10)))));
  }
  // After the first, in time order, one a minute, inside the window: a window
  // too narrow for the count gets fewer.
  const out: ReminderTime[] = [{ minutes: start + 4 * 60, kind: 'today' }];
  let prev = start;
  for (const x of later.sort((a, b) => a - b)) {
    const t = Math.max(x, prev + 1);
    if (t > end) break;
    prev = t;
    out.push({ minutes: t + 4 * 60, kind: 'task' });
  }
  return out;
}

export interface PlannedNotification {
  id: string;
  date: Date;
  day: DayKey;
  kind: ReminderKind;
  /** Fallback text for a task reminder when there's no open work to name. */
  prompt?: string;
  /** Index into the day's reminders. */
  index: number;
}

export interface PlanOptions {
  now: Date;
  today: DayKey;
  count: number;
  first: number;
  last: number;
  prompts: readonly ReminderPrompt[];
  seed: string;
}

/** How many days ahead fit in the reminders' share of the budget: floor(56 / reminders a day). */
export function daysAhead(count: number): number {
  return Math.max(1, Math.floor(MAX_PENDING / Math.max(1, Math.floor(count))));
}

export function planNotifications(o: PlanOptions): PlannedNotification[] {
  const days = daysAhead(o.count);
  const out: PlannedNotification[] = [];
  const bySlot: Record<Slot, ReminderPrompt[]> = { morning: [], midday: [], evening: [], night: [] };
  for (const p of o.prompts) bySlot[p.slot].push(p);
  const soon = o.now.getTime() + 60_000;
  for (let d = 0; d < days; d++) {
    const day = addDays(o.today, d);
    const times = dayReminderTimes({ day, count: o.count, first: o.first, last: o.last, seed: o.seed });
    // Round-robin per slot, carried on from the day before, from a seeded offset
    // so installs don't all match. Each prompt depends only on the day and its
    // place in it, so rebuilding the plan mid-day never changes or repeats one.
    const perDay: Record<Slot, number> = { morning: 0, midday: 0, evening: 0, night: 0 };
    for (const t of times) if (t.kind === 'task') perDay[slotOf(t.minutes)]++;
    const ord: Record<Slot, number> = { morning: 0, midday: 0, evening: 0, night: 0 };
    times.forEach((t, index) => {
      let prompt: string | undefined;
      if (t.kind === 'task') {
        const slot = slotOf(t.minutes);
        const list = bySlot[slot].length ? bySlot[slot] : o.prompts;
        const at = hash32(`${o.seed}:${slot}`) + dayNumber(day) * perDay[slot] + ord[slot]++;
        if (list.length) prompt = list[((at % list.length) + list.length) % list.length].text;
      }
      const date = atMinutes(day, t.minutes);
      if (date.getTime() <= soon) return;
      out.push({ id: `rem-${day}-${index}`, date, day, kind: t.kind, prompt, index });
    });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_PENDING);
}

/**
 * The notification ids this app schedules: mission reminders (`rem-`), drop alerts (`drop-`), the
 * focus timer's (`timer-done`) and the trial reminder (`trial-end`). 3.2's fixed `trial-day2` isn't
 * one: syncTrialReminder cancels it by name, and the budget cancels it like any older build's id.
 */
const OWN_PREFIXES = ['rem-', 'drop-'];
const OWN_IDS = ['timer-done', 'trial-end'];

export function isOwnNotification(id: string): boolean {
  return OWN_IDS.includes(id) || OWN_PREFIXES.some(p => id.startsWith(p));
}

/** "rem-2026-10-07-2" → its day and place in the day, so the latest-firing sort last. */
function reminderOrder(id: string): string | null {
  const m = /^rem-(\d{4}-\d{2}-\d{2})-(\d+)$/.exec(id);
  return m ? `${m[1]}:${m[2].padStart(3, '0')}` : null;
}

/**
 * What to cancel so the pending list stays inside the budget: first anything that isn't one of
 * this app's ids (an earlier build's, like 2.x night checks), then the latest-firing mission
 * reminders until at most PENDING_BUDGET are left. The timer, the trial reminder and drop
 * alerts are never trimmed: the reminders' queue is rebuilt on every foreground anyway.
 */
export function overBudget(pending: readonly string[], budget = PENDING_BUDGET): string[] {
  const unknown = pending.filter(id => !isOwnNotification(id));
  const kept = pending.filter(id => isOwnNotification(id));
  const extra = kept.length - budget;
  if (extra <= 0) return unknown;
  const reminders = kept
    .map(id => ({ id, at: reminderOrder(id) }))
    .filter((r): r is { id: string; at: string } => r.at !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return [...unknown, ...reminders.slice(0, extra).map(r => r.id)];
}
