// The full-screen moments Today opens after a proof: a Plan finished, or a progress milestone
// reached. One a day at most, and none of them twice. Pure, so the choice can be tested without
// React: Today (screens/home) asks dueMoment, marks what it covers, then opens the Moment page.
import { planMomentKey } from './programs';
import { finishedPlans, milestones, type MilestoneKey } from './progress';
import { addDays, type DayKey } from './time';
import type { RecordState } from './types';

/**
 * Milestones the Done stage already celebrates ("Streak started.", PERFECT DAY): marked shown
 * without a full-screen moment of their own. They stay on Achievements.
 */
export const DONE_SAYS: readonly MilestoneKey[] = ['first-mission', 'perfect-day'];

/** What the Moment page shows: a Plan finished on `day`, or a milestone. */
export type Moment = { kind: 'plan'; id: string; day: DayKey } | { kind: 'milestone'; key: MilestoneKey };

export interface DueMoment {
  /** The moment to open; null when nothing needs one (what's covered is only marked). */
  moment: Moment | null;
  /** The `momentsShown` keys to mark as it opens (or straight away when `moment` is null). */
  covers: string[];
}

/**
 * The `momentsShown` key that says a full-screen moment (or a status letter) was shown on `day`:
 * the rest of that day gets no other, so a milestone or a letter due then waits for the next day.
 */
export function momentDayKey(day: DayKey): string {
  return `day:${day}`;
}

/** A full-screen moment (or a status letter) was already shown on `day`. */
export function momentShownOn(shown: readonly string[], day: DayKey): boolean {
  return shown.includes(momentDayKey(day));
}

/**
 * The moment to show on `day`, or null when there's nothing to show or mark.
 *
 * - A Plan finished today or yesterday whose moment hasn't shown comes first. It stands in for
 *   every milestone not shown yet ("First plan", a 7-day streak, a perfect day reached with it):
 *   one screen for the finish. A finish older than yesterday (an update, a restore) never shows.
 * - Otherwise the newest milestone not shown yet, standing in for the older unseen ones (a
 *   restored record gets one moment, not five). Ones the Done stage said are marked without one.
 * - Once the day's moment has shown, the next one waits for the next day; what Done said is
 *   still marked.
 *
 * `hasPlan`: whether a Plan id is still in the app (a moment needs its title); one that isn't
 * shows no Plan moment, and its "First plan" shows as a milestone instead.
 */
export function dueMoment(record: RecordState, day: DayKey, shown: readonly string[], hasPlan: (id: string) => boolean = () => true): DueMoment | null {
  const unseen = milestones(record, day)
    .map((m, i) => ({ key: m.key, reached: m.reached, i }))
    .filter((m): m is { key: MilestoneKey; reached: DayKey; i: number } => m.reached !== null && !shown.includes(m.key));
  if (momentShownOn(shown, day)) {
    const said = unseen.filter(m => DONE_SAYS.includes(m.key)).map(m => m.key);
    return said.length ? { moment: null, covers: said } : null;
  }

  const yesterday = addDays(day, -1);
  const finishes = finishedPlans(record).filter(
    f => (f.finished === day || f.finished === yesterday) && hasPlan(f.id) && !shown.includes(planMomentKey(f.id, f.finished)),
  );
  const plan = finishes[finishes.length - 1];
  if (plan) {
    return {
      moment: { kind: 'plan', id: plan.id, day: plan.finished },
      covers: [...finishes.map(f => planMomentKey(f.id, f.finished)), ...unseen.map(m => m.key), momentDayKey(day)],
    };
  }

  if (!unseen.length) return null;
  const opens = unseen.filter(m => !DONE_SAYS.includes(m.key));
  const newest = [...opens].sort((a, b) => (a.reached === b.reached ? a.i - b.i : a.reached < b.reached ? -1 : 1))[opens.length - 1];
  if (!newest) return { moment: null, covers: unseen.map(m => m.key) };
  return { moment: { kind: 'milestone', key: newest.key }, covers: [...unseen.map(m => m.key), momentDayKey(day)] };
}
