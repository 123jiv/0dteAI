// All editable content lives in JSON next to this file. Edit the JSON, not the code.
import type { Colorway, Mission, Program, ReminderPrompt, RewardTier, StatusTier, Track, TrackId } from '../core/types';
import colorwaysJson from './colorways.json';
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
/** The mission library the planner draws from (active missions only). */
export const MISSIONS = (missionsJson as Mission[]).filter(m => m.active);
/**
 * Every mission ever in the library, retired ones too: a plan, a running timer or a proof
 * made before a mission was retired still finds it. Ids that were removed outright (the
 * 3.0 preview library) aren't here.
 */
export const MISSION_BY_ID: Record<string, Mission> = Object.fromEntries((missionsJson as Mission[]).map(m => [m.id, m]));

/**
 * 3.2: missions of the user's own (core/custom), kept in the store, join this lookup so a plan,
 * a timer, a proof and the record find them like any other. They never join MISSIONS: the
 * planner doesn't draw from them. The store registers them as it loads and as each is made.
 */
export function registerCustomMissions(list: readonly Mission[] | null | undefined) {
  for (const m of list ?? []) {
    if (m && typeof m.id === 'string' && m.id.startsWith('custom-') && m.custom && !(m.id in MISSION_BY_ID && !MISSION_BY_ID[m.id].custom)) MISSION_BY_ID[m.id] = m;
  }
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
