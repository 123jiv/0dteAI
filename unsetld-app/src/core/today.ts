// The day's line goes with the day's task, so the two read together.
import { isClean, todayLine, TODAY_MAX_CHARS } from './feed';
import { dailyTaskFor } from './points';
import { dayNumber, type DayKey } from './time';
import type { ChapterId, Line, Task } from './types';

export interface DayLineInput {
  lines: readonly Line[];
  schedule: Record<string, number>;
  tasks: readonly Task[];
  chapters: readonly ChapterId[];
  salt: string;
  day: DayKey;
  /** Text of the daily task already done today, so the line stays with it. */
  doneDaily?: string;
}

/**
 * The line for a day: a day pinned in schedule.json wins; otherwise one of the
 * lines paired with that day's task (alternating by day when it has two);
 * otherwise the global rotation.
 */
export function lineOfDay(o: DayLineInput): Line | null {
  if (o.schedule[o.day]) return todayLine(o.lines, o.schedule, o.day);
  const task = dailyTaskFor(o.tasks, o.chapters, o.salt, o.day, o.doneDaily);
  const paired = (task?.lines ?? [])
    .map(no => o.lines.find(l => l.no === no))
    .filter((l): l is Line => !!l && isClean(l) && !l.attribution && l.text.length <= TODAY_MAX_CHARS);
  if (paired.length) {
    // A task comes round once every n days (n = tasks in the mix); alternate its lines by round, not by day parity,
    // or an even n would show the same one every time.
    const mix = new Set(o.chapters);
    const n = Math.max(1, o.tasks.filter(t => mix.has(t.chapter)).length);
    const round = Math.floor(dayNumber(o.day) / n);
    return paired[((round % paired.length) + paired.length) % paired.length];
  }
  return todayLine(o.lines, o.schedule, o.day);
}
