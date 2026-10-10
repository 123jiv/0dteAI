// Hooks for the mission screens: today's missions, the streak, points and rewards.
import { provenInPlan } from '../core/complete';
import { serves } from '../core/missions';
import { focusFor } from '../core/personalize';
import { activeDays } from '../core/progress';
import { weekStart } from '../core/review';
import { balance, effectiveTiers, nextReward } from '../core/rewards';
import { computeStreak, type StreakInfo } from '../core/streak';
import type { DayKey } from '../core/time';
import type { DayPlan, Mission, MissionDone, PlannedMission, RewardTier, TrackId, WeeklyFocus } from '../core/types';
import { MISSION_BY_ID, REWARD_TIERS, RULES } from '../content';
import { useApp } from './store';

export interface TodayMission {
  index: number;
  planned: PlannedMission;
  mission: Mission;
  /** The area it's in the day for (plannedArea): what its row and its swap say. */
  area: TrackId;
  done: MissionDone | null;
}

/**
 * The area a planned mission is in the day for: the one the plan recorded ("Work on Your
 * Portfolio" picked for Projects says Projects, not Career). Plans from earlier builds have
 * none: then the first of the user's areas it serves, else its own.
 */
export function plannedArea(planned: Pick<PlannedMission, 'area'> | undefined, mission: Pick<Mission, 'track' | 'also'>, tracks: readonly TrackId[]): TrackId {
  return planned?.area ?? tracks.find(t => serves(mission, t)) ?? mission.track;
}

/** Today's plan with each mission and its proof (if proven). Missing missions (removed from the library) are skipped. */
export function missionsOf(plan: DayPlan | undefined, done: Record<string, MissionDone> | undefined, tracks: readonly TrackId[] = []): TodayMission[] {
  if (!plan) return [];
  // The focused missions first (Study for 30 Minutes before Make Your Bed), then the plan's order.
  // `index` stays the mission's place in the plan, for swaps.
  const rows = plan.missions.flatMap((planned, index) => {
    const mission = MISSION_BY_ID[planned.missionId];
    return mission ? [{ index, planned, mission, area: plannedArea(planned, mission, tracks), done: done?.[planned.missionId] ?? null }] : [];
  });
  return rows.sort((a, b) => (a.planned.slot === 'easy' ? 1 : 0) - (b.planned.slot === 'easy' ? 1 : 0) || a.index - b.index);
}

export function useTodayMissions(day: DayKey): { plan: DayPlan | undefined; missions: TodayMission[]; proven: number } {
  const plan = useApp(s => s.plans[day]);
  const done = useApp(s => s.record.missions?.[day]);
  const record = useApp(s => s.record);
  const tracks = useApp(s => s.profile.tracks);
  return { plan, missions: missionsOf(plan, done, tracks), proven: provenInPlan(record, plan) };
}

export function useStreak(day: DayKey): StreakInfo {
  const record = useApp(s => s.record);
  return computeStreak(activeDays(record), day);
}

export function useBalance(): number {
  return balance(useApp(s => s.record));
}

/** Reward tiers in effect: unsetld.com's list when it sent one, else the defaults. */
export function useRewardTiers(): RewardTier[] {
  const remote = useApp(s => s.remote.rewards);
  return effectiveTiers(REWARD_TIERS, remote);
}

export function useNextReward(day: DayKey) {
  const record = useApp(s => s.record);
  const collection = useApp(s => s.remote.collection);
  return nextReward(record, useRewardTiers(), collection, day);
}

export function useRerollsLeft(day: DayKey): number {
  const premium = useApp(s => s.premium.active);
  const used = useApp(s => s.plans[day]?.rerolls ?? 0);
  return Math.max(0, (premium ? RULES.rerolls.full : RULES.rerolls.free) - used);
}

/**
 * This week's focus ("What matters most this week?"): the one set for the week `day` is in,
 * if any (set this week, or picked ahead in Sunday's review and kept aside until now), and
 * whether the user said "Not this week" to it. `week` is that Monday.
 */
export function useWeekFocus(day: DayKey): { week: DayKey; focus: WeeklyFocus | null; skipped: boolean } {
  const week = weekStart(day);
  const focus = useApp(s => s.profile.focus);
  const nextFocus = useApp(s => s.profile.nextFocus);
  const skipped = useApp(s => s.focusSkipped === week);
  return { week, focus: focusFor({ focus, nextFocus }, week), skipped };
}
