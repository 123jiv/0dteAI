// Proving a mission: credit its points, put the day on record, and pay the perfect-day bonus
// when every mission in the day's plan is proven.
import { sizeOf } from './missions';
import { recordDay } from './record';
import type { DayKey } from './time';
import type { DayPlan, Mission, MissionDone, ProofPhoto, RecordState, Verification } from './types';
import RULES from '../content/rules.json';

export interface Completion {
  record: RecordState;
  /** Points the mission earned (0 if the proof was rejected). */
  points: number;
  /** Perfect-day bonus paid by this completion (0 if none). */
  bonus: number;
}

export function completeMission(
  r: RecordState,
  day: DayKey,
  plan: DayPlan | null,
  mission: Mission,
  photos: ProofPhoto[],
  verification: Verification,
  opts: { at: number; verifiedClock: boolean; timerSeconds?: number; programId?: string; perfectBonus?: number },
): Completion {
  const accepted = verification.status === 'accepted';
  const prev = r.missions?.[day]?.[mission.id];
  // A mission is proven once a day: a second proof changes nothing and earns nothing.
  if (prev?.verification?.status === 'accepted') return { record: r, points: 0, bonus: 0 };
  const points = accepted ? mission.points : 0;
  const planned = plan?.missions.find(p => p.missionId === mission.id);
  const done: MissionDone = {
    missionId: mission.id,
    slot: planned?.slot ?? sizeOf(mission),
    // The area the row showed: "Work on Your Portfolio" proven for Projects counts for Projects.
    track: planned?.area ?? mission.track,
    points,
    doneAt: opts.at,
    photos,
    timerSeconds: opts.timerSeconds,
    verification,
    programId: opts.programId,
  };
  let next: RecordState = { ...r, missions: { ...r.missions, [day]: { ...r.missions?.[day], [mission.id]: done } } };
  if (accepted) next = recordDay(next, day, opts.verifiedClock);

  let bonus = 0;
  if (accepted && plan && !next.bonuses?.[day]) {
    const proven = next.missions[day];
    const all = plan.missions.length > 0 && plan.missions.every(p => proven[p.missionId]?.verification?.status === 'accepted');
    if (all) {
      bonus = opts.perfectBonus ?? RULES.perfectDayBonus;
      next = { ...next, bonuses: { ...next.bonuses, [day]: bonus } };
    }
  }
  return { record: next, points, bonus };
}

/** Proven missions in a day's plan. */
export function provenInPlan(r: RecordState, plan: DayPlan | null | undefined): number {
  if (!plan) return 0;
  const byId = r.missions?.[plan.day] ?? {};
  return plan.missions.filter(p => byId[p.missionId]?.verification?.status === 'accepted').length;
}
