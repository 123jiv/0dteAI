// What a proof added to its area's level (UX_REDESIGN 7: XP is mission points in that area,
// core/progress trackProgress). Read by the done stage, after the proof is on the record.
import { isProven, levelFor, trackProgress } from '../../core/progress';
import type { DayKey } from '../../core/time';
import type { RecordState, TrackId } from '../../core/types';

type Level = ReturnType<typeof levelFor>;

export interface AreaGain {
  /** The area the proof was credited to: the one it was planned for. */
  track: TrackId;
  /** XP the proof added (its points; the perfect-day bonus is no area's). */
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
