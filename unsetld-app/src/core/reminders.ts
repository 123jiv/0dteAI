// Reminder and night-check planning. Pure: the notification service turns
// these into scheduled local notifications, and the widget timeline uses the
// same plan so the lock screen shows the line the reminder just delivered.
import { hash32, mulberry32 } from './random';
import { addDays, atMinutes, dayNumber, minutesIntoDay, type DayKey } from './time';
import type { ReminderPrompt } from './types';

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_PENDING = 60;
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

/** The first reminder delivers today's line; the rest nudge the work that's still open. */
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
  night: { enabled: boolean; time: number };
  seed: string;
}

/** The day's last minute (3:59 AM), counted from 4:00 AM. */
const DAY_END = 24 * 60 - 1;

/**
 * The day's reminder times. The first is exact; the rest are evenly spaced
 * between First and Last inclusive with ±10 minutes of jitter. A reminder
 * within 30 minutes of the night check moves 45 minutes earlier. A Last at or
 * before First runs to the end of the day (3:59 AM). No two share a minute.
 */
export function dayReminderTimes(o: DayPlanOptions): ReminderTime[] {
  const count = Math.max(0, Math.floor(o.count));
  if (!count) return [];
  const start = minutesIntoDay(o.first);
  let end = minutesIntoDay(o.last);
  if (end <= start) end = DAY_END;
  const rand = mulberry32(hash32(`${o.seed}:rem:${o.day}`));
  const nightAt = minutesIntoDay(o.night.time);
  const later: number[] = [];
  for (let i = 1; i < count; i++) {
    let t = start + ((end - start) * i) / (count - 1);
    t = Math.round(Math.min(end, Math.max(start + 1, t + (rand() * 20 - 10))));
    if (o.night.enabled && Math.abs(t - nightAt) <= 30) t -= 45;
    later.push(t);
  }
  // After the first, in time order (a moved one keeps its own time), one a
  // minute, inside the window: a window too narrow for the count gets fewer.
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
  kind: ReminderKind | 'night';
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
  night: { enabled: boolean; time: number };
  /** Night check already answered for these days (skip their night notification). */
  answered: ReadonlySet<DayKey>;
  prompts: readonly ReminderPrompt[];
  seed: string;
}

/** How many days ahead fit under the pending limit: floor(60 / notifications a day). */
export function daysAhead(count: number, nightEnabled: boolean): number {
  const perDay = Math.max(1, count + (nightEnabled ? 1 : 0));
  return Math.max(1, Math.floor(MAX_PENDING / perDay));
}

export function planNotifications(o: PlanOptions): PlannedNotification[] {
  const days = daysAhead(o.count, o.night.enabled);
  const out: PlannedNotification[] = [];
  const bySlot: Record<Slot, ReminderPrompt[]> = { morning: [], midday: [], evening: [], night: [] };
  for (const p of o.prompts) bySlot[p.slot].push(p);
  const soon = o.now.getTime() + 60_000;
  for (let d = 0; d < days; d++) {
    const day = addDays(o.today, d);
    const times = dayReminderTimes({ day, count: o.count, first: o.first, last: o.last, night: o.night, seed: o.seed });
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
    if (o.night.enabled && !o.answered.has(day)) {
      const date = atMinutes(day, o.night.time);
      if (date.getTime() > soon) out.push({ id: `night-${day}`, date, day, kind: 'night', index: -1 });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_PENDING);
}
