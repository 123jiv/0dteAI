// The day's line goes with the day's task, so the two read together.
import { isClean, todayLine, TODAY_MAX_CHARS } from './feed';
import { dailyTask } from './points';
import { dayNumber, type DayKey } from './time';
import type { ChapterId, Line, Task } from './types';

export interface DayLineInput {
  lines: readonly Line[];
  schedule: Record<string, number>;
  tasks: readonly Task[];
  chapters: readonly ChapterId[];
  salt: string;
  day: DayKey;
}

/**
 * The line for a day: a day pinned in schedule.json wins; otherwise one of the
 * lines paired with that day's task (alternating by day when it has two);
 * otherwise the global rotation.
 */
export function lineOfDay(o: DayLineInput): Line | null {
  if (o.schedule[o.day]) return todayLine(o.lines, o.schedule, o.day);
  const task = dailyTask(o.tasks, o.chapters, o.salt, o.day);
  const paired = (task?.lines ?? [])
    .map(no => o.lines.find(l => l.no === no))
    .filter((l): l is Line => !!l && isClean(l) && !l.attribution && l.text.length <= TODAY_MAX_CHARS);
  if (paired.length) return paired[((dayNumber(o.day) % paired.length) + paired.length) % paired.length];
  return todayLine(o.lines, o.schedule, o.day);
}
