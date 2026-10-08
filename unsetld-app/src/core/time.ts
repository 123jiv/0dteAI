// Calendar helpers. A UNSETLD day runs from 4:00 AM to 3:59 AM local time, so
// a late night still counts as the day it started. Days are "YYYY-MM-DD".

export type DayKey = string;

/** Hour (local) at which a new day starts. */
export const DAY_START_HOUR = 4;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** The plain calendar date of `d` (midnight boundary). */
export function calendarKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The UNSETLD day `d` belongs to: before 4:00 AM it is still the previous day. */
export function dayKeyOf(d: Date): DayKey {
  if (d.getHours() >= DAY_START_HOUR) return calendarKey(d);
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12);
  return calendarKey(prev);
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = key.split('-').map(Number);
  return calendarKey(new Date(y, m - 1, d + n, 12));
}

/** Whole days from a to b (b - a). DST-safe because it counts via UTC dates. */
export function diffDays(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Days since a fixed epoch; used to index rotations deterministically. */
export function dayNumber(key: DayKey): number {
  return diffDays('2024-01-01', key);
}

/** The moment `key` starts: 4:00 AM local on that date. */
export function dayStart(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, DAY_START_HOUR, 0, 0, 0);
}

/** The next 4:00 AM after `from`. */
export function nextDayStart(from: Date): Date {
  return dayStart(addDays(dayKeyOf(from), 1));
}

/** A time of day on the day `key`, given minutes after midnight. Minutes before 4:00 fall on the next calendar date. */
export function atMinutes(key: DayKey, minutes: number): Date {
  const [y, m, d] = key.split('-').map(Number);
  const m24 = ((minutes % 1440) + 1440) % 1440;
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (m24 < DAY_START_HOUR * 60) date.setDate(date.getDate() + 1);
  date.setHours(Math.floor(m24 / 60), m24 % 60, 0, 0);
  return date;
}

/** Minutes since local midnight. */
export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Minutes since the day started (4:00 AM = 0), so 1:00 AM sorts after 11:00 PM. */
export function minutesIntoDay(minutes: number): number {
  return (((minutes - DAY_START_HOUR * 60) % 1440) + 1440) % 1440;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** '23 AUG' */
export function shortDate(key: DayKey): string {
  const d = parseDay(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** 'WED 7 OCT' */
export function widgetDate(key: DayKey): string {
  const d = parseDay(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '7:00 AM' */
export function formatTime(minutes: number): string {
  const m24 = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m24 / 60);
  const m = m24 % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
