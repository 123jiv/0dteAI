import { dayKey, type DayKey } from '../core/time';

// A single source of "now" so the dev tools can time-travel (test streaks,
// rank-ups and decay without waiting days). The offset is always 0 in
// production builds because the dev tools are hidden there.
let offsetDays = 0;

export function setDayOffset(days: number) {
  offsetDays = days;
}

export function getDayOffset() {
  return offsetDays;
}

export function now(): Date {
  return new Date(Date.now() + offsetDays * 86_400_000);
}

export function today(): DayKey {
  return dayKey(now());
}
