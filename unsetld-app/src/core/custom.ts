// Missions of the user's own ("+ Create my own" when replacing a mission). They use the same
// proof types and the same on-device checks as every mission, and they can't be farmed:
//  - one only comes into a day by replacing a planned mission, so it uses one of the day's
//    swaps and the day never gets bigger;
//  - a day holds at most one of them;
//  - it earns a small fixed amount by proof type and timer length (CUSTOM_POINTS_MAX at most),
//    and never more than the planned mission it replaced was worth (PlannedMission.points);
//  - a timer has to run to the end, and photos go through the same fresh / duplicate checks.
// The generator never plans them (they aren't in the library it draws from).
import type { DayPlan, Mission, ProofType, TrackId } from './types';

export const CUSTOM_PREFIX = 'custom-';
export const CUSTOM_TITLE_MIN = 3;
export const CUSTOM_TITLE_MAX = 40;
/** The most a mission of the user's own earns. Library missions earn 5–25. */
export const CUSTOM_POINTS_MAX = 15;
/** A day's plan holds at most this many of them. */
export const CUSTOM_PER_DAY = 1;
/** Kept in the store; the oldest unused ones go past this. */
export const CUSTOM_KEEP = 20;

/** The proof types a mission of the user's own can use, in the order the form shows them. */
export const CUSTOM_PROOFS: readonly ProofType[] = ['PHOTO', 'TIMER', 'TIMER_AND_PHOTO', 'BEFORE_AFTER'];
/** Timer lengths, in minutes. */
export const CUSTOM_TIMER_MINUTES: readonly number[] = [15, 30, 45, 60];

export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);

/** Points by proof type: a photo 5, a before and after 10, a timer 10 (15 min) or 15 (30 min or more). */
export function customPoints(proofType: ProofType, timerMinutes?: number): number {
  let p: number;
  if (proofType === 'TIMER' || proofType === 'TIMER_AND_PHOTO') p = (timerMinutes ?? 0) >= 30 ? 15 : 10;
  else if (proofType === 'BEFORE_AFTER') p = 10;
  else p = 5;
  return Math.min(CUSTOM_POINTS_MAX, p);
}

/** The title as it will be kept: single spaces, trimmed. null when it's too short or too long. */
export function cleanTitle(title: string): string | null {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length < CUSTOM_TITLE_MIN || t.length > CUSTOM_TITLE_MAX) return null;
  return t;
}

export interface CustomInput {
  title: string;
  track: TrackId;
  proofType: ProofType;
  /** TIMER and TIMER_AND_PHOTO: one of CUSTOM_TIMER_MINUTES. */
  timerMinutes?: number;
}

/** What the proof shows, by type (the mission page's Proof card). */
const PROOF_TEXT: Record<string, string> = {
  PHOTO: 'A photo that shows it done.',
  BEFORE_AFTER: 'A photo before you start, and one when it’s done.',
  TIMER: 'The timer, run to the end.',
  TIMER_AND_PHOTO: 'The timer, then a photo of what you got done.',
};

/** A mission from the form, or null when the input isn't valid. `id` is made by the caller (custom-…). */
export function makeCustomMission(input: CustomInput, id: string): Mission | null {
  const title = cleanTitle(input.title);
  if (!title || !isCustomId(id) || !CUSTOM_PROOFS.includes(input.proofType)) return null;
  const timed = input.proofType === 'TIMER' || input.proofType === 'TIMER_AND_PHOTO';
  if (timed && !CUSTOM_TIMER_MINUTES.includes(input.timerMinutes ?? -1)) return null;
  const minutes = timed ? input.timerMinutes! : input.proofType === 'BEFORE_AFTER' ? 20 : 10;
  return {
    id,
    track: input.track,
    title,
    short: title.endsWith('.') ? title : `${title}.`,
    proof: PROOF_TEXT[input.proofType],
    proofType: input.proofType,
    points: customPoints(input.proofType, input.timerMinutes),
    minutes,
    ...(timed ? { timerMinutes: input.timerMinutes } : {}),
    cooldownDays: 0,
    repeatable: true,
    tags: ['custom'],
    active: true,
    custom: true,
  };
}

/** Missions of the user's own already in a day's plan. */
export function customsIn(plan: DayPlan | null | undefined): number {
  return (plan?.missions ?? []).filter(p => isCustomId(p.missionId)).length;
}
