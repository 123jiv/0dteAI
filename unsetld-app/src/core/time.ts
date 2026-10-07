// Calendar helpers. Everything works on local calendar days ("YYYY-MM-DD"),
// so a day rolls over at the user's local midnight.

export type DayKey = string;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function dayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole calendar days from a to b (b - a). DST-safe because it counts via UTC dates. */
export function diffDays(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function monthKey(key: DayKey): string {
  return key.slice(0, 7);
}

/** Monday of the week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  const d = parseDay(key);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(key, -dow);
}

export function isSunday(key: DayKey): boolean {
  return parseDay(key).getDay() === 0;
}

/** Days since a fixed epoch; used to index rotations deterministically. */
export function dayNumber(key: DayKey): number {
  return diffDays('2024-01-01', key);
}

export function nextMidnight(from: Date): Date {
  const d = new Date(from);
  d.setHours(24, 0, 0, 0);
  return d;
}

export function startOfDay(key: DayKey): Date {
  return parseDay(key);
}
