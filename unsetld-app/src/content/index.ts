// All editable content lives in JSON next to this file. Edit the JSON, not the code.
import type { Chapter, ChapterId, Colorway, Line, Milestone, PointsConfig, ReminderPrompt, Task } from '../core/types';
import { isShippable, todayCandidates } from '../core/feed';
import chaptersJson from './chapters.json';
import colorwaysJson from './colorways.json';
import legalJson from './legal.json';
import linesJson from './lines.json';
import milestonesJson from './milestones.json';
import pointsJson from './points.json';
import remindersJson from './reminders.json';
import scheduleJson from './schedule.json';
import standardJson from './standard.json';
import tasksJson from './tasks.json';

export const CHAPTERS = chaptersJson as Chapter[];
export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c])) as Record<ChapterId, Chapter>;

/** Every line that can ship: unverified attributed quotes are left out entirely. */
export const LINES = (linesJson as Line[]).filter(isShippable);
export const LINE_BY_NO: Record<number, Line> = Object.fromEntries(LINES.map(l => [l.no, l]));
export const VOLUME = Math.max(1, ...LINES.map(l => l.volume));

/** The line O2 shows on first launch (Discipline, the free chapter). */
export const ONBOARDING_LINE_NO = 6;
export const ONBOARDING_LINE: Line | undefined = LINE_BY_NO[ONBOARDING_LINE_NO] ?? todayCandidates(LINES.filter(l => l.chapter === 'discipline'))[0];

export const COLORWAYS = colorwaysJson as Colorway[];
export const COLORWAY_BY_ID = Object.fromEntries(COLORWAYS.map(c => [c.id, c])) as Record<string, Colorway>;
export const MILESTONES = milestonesJson as Milestone[];
export const PROMPTS = remindersJson as ReminderPrompt[];
export const POINTS = pointsJson as PointsConfig;
export const SCHEDULE = scheduleJson as Record<string, number>;
export const STANDARD_RULES = standardJson as string[];
export const TASKS = tasksJson as Task[];

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

export function chapterLabel(id: ChapterId | 'yours'): string {
  return id === 'yours' ? 'YOUR LINE' : CHAPTER_BY_ID[id]?.name.toUpperCase() ?? '';
}

export function linesIn(chapter: ChapterId): number {
  return LINES.filter(l => l.chapter === chapter).length;
}
