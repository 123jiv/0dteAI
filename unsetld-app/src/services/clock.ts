import { dayKeyOf, type DayKey } from '../core/time';

// A single source of "now" so the tester tools can time-travel (see Day 7,
// Day 30, a 14-day pause) without waiting. The offset is always 0 in
// production builds because the tester tools are hidden there.
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

/** Today's UNSETLD day (4:00 AM boundary). */
export function today(): DayKey {
  return dayKeyOf(now());
}
