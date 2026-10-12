// What a proof did, read by the done stage once the proof is on the record: what it added to
// its area's level (UX_REDESIGN 7: an area's progress is the mission points proven in it,
// core/progress trackProgress), and the week the record moment draws.
import { indexRecord, levelOf, weekMarks, type DayLevel, type DayMark } from '../../core/history';
import { isProven, levelFor, trackProgress } from '../../core/progress';
import { weekStart } from '../../core/review';
import type { DayKey } from '../../core/time';
import type { DayPlan, RecordState, TrackId } from '../../core/types';

type Level = ReturnType<typeof levelFor>;

export interface AreaGain {
  /** The area the proof was credited to: the one it was planned for. */
  track: TrackId;
  /** What the proof added to the area (its points; the perfect-day bonus is no area's). */
  points: number;
  before: Level;
  after: Level;
  /** The proof took the area to a new level. */
  up: boolean;
}

/** The proof of `missionId` on `day` and its area's level before and after it; null if it isn't proven. */
export function areaGain(record: RecordState, day: DayKey, missionId: string): AreaGain | null {
  const done = record.missions?.[day]?.[missionId];
  if (!isProven(done)) return null;
  const area = trackProgress(record)[done.track];
  // An area the app no longer has adds to no level.
  if (!area) return null;
  const points = typeof done.points === 'number' && Number.isFinite(done.points) ? Math.max(0, done.points) : 0;
  const before = levelFor(Math.max(0, area.xp - points));
  const after = levelFor(area.xp);
  return { track: done.track, points, before, after, up: after.level > before.level };
}

export interface WeekDay {
  mark: DayMark;
  /** Before the first day on record: nothing to have missed yet (drawn fainter). */
  before: boolean;
}

/** The week `day` is in, Monday first, as the record has it now (the done stage's row of dots). */
export function doneWeek(record: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, day: DayKey): WeekDay[] {
  const ix = indexRecord(record, day);
  const first = [...ix.active, ...ix.legacy].sort()[0] ?? day;
  return weekMarks(record, plans, weekStart(day), ix).map(mark => ({ mark, before: mark.day < first && !mark.legacy }));
}

/**
 * Today's dot as it was before the proof just made: one mission fewer, and never perfect (a
 * perfect day's bonus comes with its last proof). `provenToday` stands in if today isn't in `week`.
 */
export function levelBefore(week: readonly WeekDay[], provenToday: number): DayLevel {
  const today = week.find(d => d.mark.when === 'today');
  return levelOf(Math.max(0, (today?.mark.proven ?? provenToday) - 1), false);
}
