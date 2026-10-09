// Hooks for the mission screens: today's missions, the streak, points and rewards.
import { provenInPlan } from '../core/complete';
import { activeDays } from '../core/progress';
import { balance, effectiveTiers, nextReward } from '../core/rewards';
import { computeStreak, type StreakInfo } from '../core/streak';
import type { DayKey } from '../core/time';
import type { DayPlan, Mission, MissionDone, PlannedMission, RewardTier } from '../core/types';
import { MISSION_BY_ID, REWARD_TIERS, RULES } from '../content';
import { useApp } from './store';

export interface TodayMission {
  index: number;
  planned: PlannedMission;
  mission: Mission;
  done: MissionDone | null;
}

/** Today's plan with each mission and its proof (if proven). Missing missions (removed from the library) are skipped. */
export function missionsOf(plan: DayPlan | undefined, done: Record<string, MissionDone> | undefined): TodayMission[] {
  if (!plan) return [];
  return plan.missions
    .map((planned, index) => ({ index, planned, mission: MISSION_BY_ID[planned.missionId], done: done?.[planned.missionId] ?? null }))
    .filter((x): x is TodayMission => Boolean(x.mission));
}

export function useTodayMissions(day: DayKey): { plan: DayPlan | undefined; missions: TodayMission[]; proven: number } {
  const plan = useApp(s => s.plans[day]);
  const done = useApp(s => s.record.missions?.[day]);
  const record = useApp(s => s.record);
  return { plan, missions: missionsOf(plan, done), proven: provenInPlan(record, plan) };
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
