// The weekly review: what the week added up to, where it went, and one area to lean on next.
import { completion } from './progress';
import { addDays, parseDay, type DayKey } from './time';
import type { DayPlan, Profile, RecordState, TrackId } from './types';

/** Monday of the week a day belongs to. */
export function weekStart(day: DayKey): DayKey {
  const dow = parseDay(day).getDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/**
 * Which week the review covers when the app opens on `today`: the current week
 * on Sunday, last week on Monday and Tuesday, none otherwise.
 */
export function reviewWeekFor(today: DayKey): DayKey | null {
  const dow = parseDay(today).getDay();
  if (dow === 0) return weekStart(today);
  if (dow === 1 || dow === 2) return weekStart(addDays(today, -7));
  return null;
}

export interface WeeklyReview {
  from: DayKey;
  to: DayKey;
  missions: number;
  planned: number;
  focusMinutes: number;
  points: number;
  perfectDays: number;
  activeDays: number;
  byTrack: Partial<Record<TrackId, number>>;
  /** The track with the most proven missions. */
  strongest: TrackId | null;
  /** A chosen track with no (or the fewest) missions, while another had some. */
  ignored: TrackId | null;
}

export function weeklyReview(r: RecordState, plans: Record<DayKey, DayPlan>, profile: Pick<Profile, 'tracks'>, from: DayKey): WeeklyReview {
  const to = addDays(from, 6);
  let missions = 0;
  let points = 0;
  let seconds = 0;
  let perfectDays = 0;
  let activeDays = 0;
  const byTrack: Partial<Record<TrackId, number>> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const done = Object.values(r.missions?.[d] ?? {}).filter(m => m.verification?.status === 'accepted');
    if (done.length) activeDays += 1;
    for (const m of done) {
      missions += 1;
      points += m.points;
      seconds += m.timerSeconds ?? 0;
      byTrack[m.track] = (byTrack[m.track] ?? 0) + 1;
    }
    const bonus = r.bonuses?.[d] ?? 0;
    if (bonus) {
      perfectDays += 1;
      points += bonus;
    }
  }
  const ranked = (Object.entries(byTrack) as [TrackId, number][]).sort((a, b) => b[1] - a[1]);
  const strongest = ranked[0]?.[0] ?? null;
  let ignored: TrackId | null = null;
  if (strongest) {
    const lowest = [...profile.tracks].filter(t => t !== strongest).sort((a, b) => (byTrack[a] ?? 0) - (byTrack[b] ?? 0))[0];
    if (lowest && (byTrack[lowest] ?? 0) < (byTrack[strongest] ?? 0)) ignored = lowest;
  }
  const c = completion(r, plans, from, to);
  return { from, to, missions, planned: c.planned, focusMinutes: Math.floor(seconds / 60), points, perfectDays, activeDays, byTrack, strongest, ignored };
}
