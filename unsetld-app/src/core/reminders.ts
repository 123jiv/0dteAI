import { mulberry32, hash32 } from './random';
import { addDays, parseDay, type DayKey } from './time';

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_PENDING = 60;

export interface ReminderSlot {
  date: Date;
  day: DayKey;
  index: number;
}

export interface PlanOptions {
  now: Date;
  today: DayKey;
  perDay: number;
  startHour: number;
  endHour: number;
  seed: string;
  /** How many days ahead to plan; trimmed so the total stays under MAX_PENDING. */
  days?: number;
}

/**
 * Spreads `perDay` reminders across the user's window: the window is split
 * into equal segments and each reminder lands at a seeded random minute in its
 * segment, so they feel random but never bunch up.
 */
export function planReminders(o: PlanOptions): ReminderSlot[] {
  const perDay = Math.max(0, Math.floor(o.perDay));
  if (perDay === 0) return [];
  const start = Math.max(0, Math.min(23, o.startHour)) * 60;
  let end = Math.max(0, Math.min(24, o.endHour)) * 60;
  if (end <= start) end = Math.min(24 * 60, start + 60);
  const span = end - start;
  const maxDays = Math.max(1, Math.floor(MAX_PENDING / perDay));
  const days = Math.min(o.days ?? 7, maxDays);
  const seg = span / perDay;
  const out: ReminderSlot[] = [];
  for (let d = 0; d < days; d++) {
    const day = addDays(o.today, d);
    const rand = mulberry32(hash32(`${o.seed}:rem:${day}`));
    for (let i = 0; i < perDay; i++) {
      const minute = Math.floor(start + seg * i + rand() * Math.max(1, seg - 1));
      const date = parseDay(day);
      date.setHours(0, Math.min(minute, 24 * 60 - 1), 0, 0);
      if (date.getTime() > o.now.getTime() + 60_000) out.push({ date, day, index: i });
    }
  }
  return out.slice(0, MAX_PENDING);
}
