// The weekly review: what the week added up to, where it went, and (at the end of a week) the
// weekly focus for the next one.
import { meetsRequirements, serves } from './missions';
import { FOCUS_LEAN } from './personalize';
import { completion, TRACK_IDS } from './progress';
import { addDays, parseDay, type DayKey } from './time';
import type { DayPlan, FocusId, Mission, Profile, RecordState, TrackId } from './types';

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
  /** Proven missions by the area the day's plan put them in (the mission's own on older plans). */
  byTrack: Partial<Record<TrackId, number>>;
  /** The track with the most proven missions. */
  strongest: TrackId | null;
  /**
   * A chosen track with no proven mission this week, while another had some ("Didn't get to").
   * Only one that could get missions: never School for someone not in school.
   */
  ignored: TrackId | null;
}

/**
 * `areas`: the user's areas that can get missions with their answers (core/missions
 * usableAreas). Left out, every chosen area counts.
 */
export function weeklyReview(
  r: RecordState,
  plans: Record<DayKey, DayPlan>,
  profile: Pick<Profile, 'tracks'>,
  from: DayKey,
  areas?: readonly TrackId[],
): WeeklyReview {
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
      // The area the plan put it in ("Work on Your Portfolio" for Projects), else its own.
      const t = plans[d]?.missions?.find(p => p.missionId === m.missionId)?.area ?? m.track;
      byTrack[t] = (byTrack[t] ?? 0) + 1;
    }
    const bonus = r.bonuses?.[d] ?? 0;
    if (bonus) {
      perfectDays += 1;
      points += bonus;
    }
  }
  // An area the app no longer has (an old record's) can't be the strongest: nothing could show it.
  const ranked = (Object.entries(byTrack) as [TrackId, number][]).filter(([t]) => TRACK_IDS.includes(t)).sort((a, b) => b[1] - a[1]);
  const strongest = ranked[0]?.[0] ?? null;
  let ignored: TrackId | null = null;
  if (strongest) {
    // Only a track that got nothing, and could have: "Didn't get to" must be true and fair.
    const could = areas ? profile.tracks.filter(t => areas.includes(t)) : profile.tracks;
    ignored = could.find(t => t !== strongest && !byTrack[t]) ?? null;
  }
  const c = completion(r, plans, from, to);
  return { from, to, missions, planned: c.planned, focusMinutes: Math.floor(seconds / 60), points, perfectDays, activeDays, byTrack, strongest, ignored };
}

/**
 * The week the review's "Next week" choice sets the weekly focus for, or null when it doesn't
 * offer one. Only the review Today offers (reviewWeekFor) asks: on Sunday it sets next week; on
 * Monday and Tuesday, reviewing last week, it sets the week that has just started. A week read
 * early from Progress doesn't ask: setting next week mid-week would replace this week's focus
 * (the profile holds one).
 */
export function reviewFocusWeek(from: DayKey, today: DayKey): DayKey | null {
  return reviewWeekFor(today) === from ? addDays(from, 7) : null;
}

/**
 * The weekly focus options the review offers, from `order` (the screen's order): never
 * "Something else" (typing one is on the weekly focus page), and only those whose area
 * (personalize FOCUS_LEAN) can get missions with the user's answers, the way planAreas decides
 * it: a focus with nothing to plan would change nothing, so nothing about school for someone
 * not in school.
 */
export function focusChoices(order: readonly FocusId[], library: readonly Mission[], profile: Profile): FocusId[] {
  const plannable = (t: TrackId) => library.some(m => m.active && serves(m, t) && meetsRequirements(m.requires, profile));
  return order.filter(id => id !== 'other' && plannable(FOCUS_LEAN[id].area));
}
