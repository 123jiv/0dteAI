// All editable content lives in JSON next to this file. Edit the JSON, not the code.
import type { Colorway, Mission, Program, ReminderPrompt, RewardTier, StatusTier, Track, TrackId } from '../core/types';
import colorwaysJson from './colorways.json';
import legacyMissionsJson from './legacy-missions.json';
import legalJson from './legal.json';
import milestonesJson from './milestones.json';
import missionsJson from './missions.json';
import programsJson from './programs.json';
import remindersJson from './reminders.json';
import rewardsJson from './rewards.json';
import rulesJson from './rules.json';
import tracksJson from './tracks.json';

export const COLORWAYS = colorwaysJson as Colorway[];
export const COLORWAY_BY_ID = Object.fromEntries(COLORWAYS.map(c => [c.id, c])) as Record<string, Colorway>;
/**
 * UNSETLD status tiers as the file holds them: a discount code at 7, 30, 90 and 365 active
 * days. services/access STATUS_DEFAULTS reads them (core/rewards statusFromMilestones);
 * unsetld.com's config `status` list can replace them.
 */
export const MILESTONES = milestonesJson as StatusTier[];
/** Reminder prompts for days without a plan yet. */
export const PROMPTS = remindersJson as ReminderPrompt[];

// Missions
export const TRACKS = tracksJson as Track[];
export const TRACK_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t])) as Record<TrackId, Track>;
/**
 * The approved mission library (3.3: the founder's 66, scripts/missions/library.py), active
 * missions only. The only missions the planner, swaps, recommendations and programs draw from.
 */
export const MISSIONS = (missionsJson as Mission[]).filter(m => m.active && m.source === 'UNSETLD');
/** The approved ids in the library's order (D1 … O9). The gaps are deliberate: ids are never renumbered. */
export const APPROVED_IDS: readonly string[] = MISSIONS.map(m => m.id);
const APPROVED = new Set(APPROVED_IDS);
/** An approved library mission (not a mission of the user's own, not a retired one). */
export function isApproved(id: string): boolean {
  return APPROVED.has(id);
}
/**
 * The approved missions and, once registered, the user's own (registerCustomMissions). Retired
 * ids aren't here: a saved plan, a running timer or a before photo holding one is unknown, so
 * the plan is made again and the timer or photo dropped. Past proofs read historyMission.
 */
// No prototype: an id like "constructor" (unsetld://mission/constructor) finds nothing.
export const MISSION_BY_ID: Record<string, Mission> = Object.assign(Object.create(null) as Record<string, Mission>, Object.fromEntries(MISSIONS.map(m => [m.id, m])));

/**
 * 3.2: missions of the user's own (core/custom), kept in the store, join this lookup so a plan,
 * a timer, a proof and the record find them like any other. They never join MISSIONS: the
 * planner doesn't draw from them. The store registers them as it loads and as each is made.
 * 3.3: each carries source USER_CREATED (one saved before 3.3 gets it here).
 */
export function registerCustomMissions(list: readonly Mission[] | null | undefined) {
  for (const m of list ?? []) {
    if (m && typeof m.id === 'string' && m.id.startsWith('custom-') && m.custom && !(m.id in MISSION_BY_ID && !MISSION_BY_ID[m.id].custom)) {
      MISSION_BY_ID[m.id] = m.source === 'USER_CREATED' ? m : { ...m, source: 'USER_CREATED' };
    }
  }
}

/**
 * Delete data on this phone: the user's own missions leave the lookup (registerCustomMissions only
 * ever adds), so none of them is found again before the app restarts.
 */
export function clearCustomMissions() {
  for (const id of Object.keys(MISSION_BY_ID)) if (MISSION_BY_ID[id]?.custom) delete MISSION_BY_ID[id];
}

/** What a past proof needs to show its mission: the title, the area, its minutes and how it was proven. */
export type HistoryMission = Pick<Mission, 'title' | 'track' | 'minutes' | 'proofType' | 'proof'>;
/** The 235 missions retired in 3.3, by id, as they were (Business already moved to Projects). */
const LEGACY = legacyMissionsJson as Record<string, HistoryMission>;

/**
 * DISPLAY ONLY: a mission as a past proof shows it, the approved or custom mission when the id
 * is one, else the retired mission it was (content/legacy-missions.json). For history views only
 * (proof titles and proof lines, a past day's open missions, time per area for old proofs).
 * It must never feed the planner, swaps, ensurePlan, programs, notifications or widgets: a
 * retired mission is never planned, swapped in or shown as something to do.
 */
export function historyMission(id: string): HistoryMission | undefined {
  if (Object.prototype.hasOwnProperty.call(MISSION_BY_ID, id)) return MISSION_BY_ID[id];
  return Object.prototype.hasOwnProperty.call(LEGACY, id) ? LEGACY[id] : undefined;
}
export const PROGRAMS = programsJson as Program[];
export const PROGRAM_BY_ID: Record<string, Program> = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));
/** Default reward tiers; unsetld.com's config can replace them (store.remote.rewards). */
export const REWARD_TIERS = rewardsJson as RewardTier[];
export const RULES = rulesJson;

export interface LegalSection {
  h: string;
  p?: string;
  list?: string[];
}
export interface LegalDoc {
  title: string;
  updated?: string;
  sections: LegalSection[];
}
export type DocId = 'record' | 'access' | 'terms' | 'privacy';
export const DOCS = legalJson as Record<DocId, LegalDoc>;
