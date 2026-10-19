// What the swap sheet works out before it changes anything: what a mission of the user's own
// would earn in the spot, whether the day has room for one, which of their own to offer again,
// and the form's starting values. Pure: the store does the swap (replaceMission) and keeps the
// rules (core/custom); this only says the same thing ahead of time.
import {
  cleanTitle,
  CUSTOM_PER_DAY,
  CUSTOM_PROOFS,
  CUSTOM_TIMER_MINUTES,
  customPoints,
  customsIn,
  isCustomId,
  type CustomInput,
} from '../../core/custom';
import { usableText } from '../../core/safety';
import type { DayPlan, Mission, ProofType, TrackId } from '../../core/types';
import { MISSION_BY_ID } from '../../content';

/** The form for a mission of the user's own, as typed. */
export interface OwnDraft {
  title: string;
  track: TrackId | null;
  proofType: ProofType;
  /** Used when the proof is timed (TIMER, TIMER_AND_PHOTO); kept when it isn't. */
  minutes: number;
}

export const isTimed = (type: ProofType) => type === 'TIMER' || type === 'TIMER_AND_PHOTO';

/**
 * What the planned mission at `index` is worth: its own cap when it has one (one of the user's
 * own), else the mission's points. null when the mission isn't known: nothing to cap by.
 * The same number replaceMission caps by.
 */
export function slotWorth(plan: DayPlan | null | undefined, index: number): number | null {
  const p = plan?.missions[index];
  if (!p) return null;
  if (typeof p.points === 'number') return p.points;
  return MISSION_BY_ID[p.missionId]?.points ?? null;
}

/** What a mission of the user's own earns in that spot: its points, never more than the spot is worth. */
export function ownEarns(proofType: ProofType, minutes: number, worth: number | null): number {
  const p = customPoints(proofType, isTimed(proofType) ? minutes : undefined);
  return worth === null ? p : Math.min(p, worth);
}

/** True when the day can take a mission of the user's own in place of the one at `index`. */
export function canAddOwn(plan: DayPlan | null | undefined, index: number): boolean {
  const old = plan?.missions[index];
  if (!plan || !old) return false;
  return customsIn(plan) - (isCustomId(old.missionId) ? 1 : 0) < CUSTOM_PER_DAY;
}

/**
 * Missions of the user's own to use again, newest first (the store keeps them newest last):
 * not one already in the day or swapped out of it today, in one of the user's areas, and not
 * one kept from before the text check that it would now refuse (core/safety).
 */
export function recentOwn(list: readonly Mission[], plan: DayPlan | null | undefined, tracks: readonly TrackId[], count = 3): Mission[] {
  const inDay = new Set([...(plan?.missions ?? []).map(p => p.missionId), ...(plan?.replaced ?? [])]);
  const out: Mission[] = [];
  for (let i = list.length - 1; i >= 0 && out.length < count; i--) {
    const m = list[i];
    if (!m || inDay.has(m.id) || !tracks.includes(m.track) || !CUSTOM_PROOFS.includes(m.proofType) || !usableText(m.title, 'mission')) continue;
    if (out.some(o => o.title.toLowerCase() === m.title.toLowerCase())) continue;
    out.push(m);
  }
  return out;
}

/** The nearest timer length the form offers. */
function nearestLength(minutes: number | undefined): number {
  if (!minutes) return 30;
  return CUSTOM_TIMER_MINUTES.reduce((best, n) => (Math.abs(n - minutes) < Math.abs(best - minutes) ? n : best), CUSTOM_TIMER_MINUTES[0]);
}

/**
 * The form as it opens: no title, the spot's area (when it's one of the user's), and the proof
 * and timer length of the mission it replaces, so what it earns starts out comparable.
 */
export function startDraft(plan: DayPlan | null | undefined, index: number, tracks: readonly TrackId[]): OwnDraft {
  const p = plan?.missions[index];
  const old = p ? MISSION_BY_ID[p.missionId] : undefined;
  const area = p?.area ?? old?.track;
  const track = area && tracks.includes(area) ? area : (tracks[0] ?? null);
  const type: ProofType = old?.proofType === 'PHOTO_AFTER' ? 'PHOTO' : (old?.proofType ?? 'PHOTO');
  return {
    title: '',
    track,
    proofType: CUSTOM_PROOFS.includes(type) ? type : 'PHOTO',
    minutes: nearestLength(old?.timerMinutes ?? (old && isTimed(old.proofType) ? old.minutes : undefined)),
  };
}

/** The form filled from one of the user's own from before. */
export function draftFrom(m: Mission, current: OwnDraft): OwnDraft {
  return { title: m.title, track: m.track, proofType: m.proofType, minutes: m.timerMinutes ?? current.minutes };
}

/**
 * What createCustomMission takes, or null while the form isn't complete (a title of 3 to 40
 * letters that the text check lets through, an area). Null disables "Add to today".
 */
export function draftInput(d: OwnDraft | null | undefined): CustomInput | null {
  if (!d?.track) return null;
  const title = cleanTitle(d.title);
  if (!title || !usableText(title, 'mission') || !CUSTOM_PROOFS.includes(d.proofType)) return null;
  const timed = isTimed(d.proofType);
  if (timed && !CUSTOM_TIMER_MINUTES.includes(d.minutes)) return null;
  return { title, track: d.track, proofType: d.proofType, ...(timed ? { timerMinutes: d.minutes } : {}) };
}

/** True when the form says exactly what `m` is: using it again makes nothing new. */
export function sameAs(m: Mission, input: CustomInput | null): boolean {
  if (!input) return false;
  return (
    m.title.toLowerCase() === input.title.toLowerCase() &&
    m.track === input.track &&
    m.proofType === input.proofType &&
    (!isTimed(input.proofType) || m.timerMinutes === input.timerMinutes)
  );
}

/**
 * The mission of the user's own that goes in the spot: one of `recent` when the form says
 * exactly what it is (nothing new is kept), else a new one from `create` (the store's
 * createCustomMission). null when the form isn't complete or the store won't make it.
 */
export function ownToAdd(recent: readonly Mission[], input: CustomInput | null, create: (input: CustomInput) => Mission | null): Mission | null {
  if (!input) return null;
  return recent.find(m => sameAs(m, input)) ?? create(input);
}
