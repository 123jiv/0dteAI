// All editable content lives in JSON next to this file. Edit the JSON, not the code.
import type { Colorway, Milestone, Mission, Program, ReminderPrompt, RewardTier, Track, TrackId } from '../core/types';
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
/** Access milestones (Day 7, 90, 365). */
export const MILESTONES = milestonesJson as Milestone[];
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
