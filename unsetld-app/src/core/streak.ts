// The streak means "I showed up": one proven mission keeps it going.
// Off Days: one is earned every 7 active days (up to 2 banked) and covers a missed day on its own.
import { addDays, type DayKey } from './time';
import RULES from '../content/rules.json';

export interface StreakInfo {
  /** Days in a row, counting today only once something is proven today. */
  current: number;
  longest: number;
  /** Off Days banked right now. */
  offDays: number;
  /** Missed days an Off Day covered. */
  covered: DayKey[];
  activeToday: boolean;
  /** Days with at least one proven mission. */
  activeDays: number;
}

export function computeStreak(active: ReadonlySet<DayKey> | readonly DayKey[], today: DayKey, every = RULES.offDayEvery, max = RULES.offDayMax): StreakInfo {
  const set = active instanceof Set ? (active as ReadonlySet<DayKey>) : new Set(active as readonly DayKey[]);
  const days = [...set].filter(d => d <= today).sort();
  const empty: StreakInfo = { current: 0, longest: 0, offDays: 0, covered: [], activeToday: false, activeDays: 0 };
  if (!days.length) return empty;
  let current = 0;
  let longest = 0;
  let banked = 0;
  let count = 0;
  const covered: DayKey[] = [];
  const earn = () => {
    count += 1;
    if (count % every === 0) banked = Math.min(max, banked + 1);
  };
  // Every day from the first active one up to yesterday decides the streak; today can only add to it.
  for (let d = days[0]; d < today; d = addDays(d, 1)) {
    if (set.has(d)) {
      current += 1;
      earn();
    } else if (current > 0 && banked > 0) {
      banked -= 1;
      covered.push(d);
    } else {
      current = 0;
    }
    longest = Math.max(longest, current);
  }
  const activeToday = set.has(today);
  if (activeToday) {
    current += 1;
    earn();
    longest = Math.max(longest, current);
  }
  return { current, longest, offDays: banked, covered, activeToday, activeDays: count };
}
