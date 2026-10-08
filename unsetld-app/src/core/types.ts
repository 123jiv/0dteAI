import type { DayKey } from './time';

export type ChapterId = 'discipline' | 'focus' | 'training' | 'money' | 'confidence' | 'vices' | 'stoic';

export interface Chapter {
  id: ChapterId;
  no: number;
  name: string;
  scope: string;
  free: boolean;
}

export interface Attribution {
  author: string;
  source: string;
  translator: string;
}

export interface Line {
  /** Permanent catalogue number, shown as "No. 0412". */
  no: number;
  chapter: ChapterId;
  text: string;
  explicit: boolean;
  volume: number;
  attribution?: Attribution;
  /** Attributed quotes only: checked against the source text. Unverified quotes never ship. */
  verified?: boolean;
}

/** A line the user wrote (Full Edition). Numbered from 9001 so it never collides with the library. */
export interface YourLine {
  id: string;
  text: string;
  createdAt: number;
}

export interface Colorway {
  id: string;
  name: string;
  free: boolean;
  bg: string;
  bgEnd?: string;
  ink: string;
  secondary: string;
  rule: string;
  statusBar: 'light' | 'dark';
  kind: 'solid' | 'plate' | 'gradient';
  previewLine: string;
}

export type MilestoneId = 'early-access' | 'patch' | 'piece-365';

export interface Milestone {
  id: MilestoneId;
  day: number;
  title: string;
  short: string;
  detail: string;
  action: string;
  pausable: boolean;
  letter: { sub: string; body: string; primary: string; secondary: string };
}

export interface ReminderPrompt {
  slot: 'morning' | 'midday' | 'evening' | 'night';
  text: string;
}

/** One day on record. Its presence in Record.days is what "on record" means. */
export interface DayEntry {
  /** The phone's clock matched unsetld.com when the day was recorded. */
  verified: boolean;
}

/** A daily task from the UNSETLD library. */
export interface Task {
  id: string;
  chapter: ChapterId;
  text: string;
  /** What the photo shows, e.g. "The page you finished on." */
  proof: string;
  when: 'morning' | 'day' | 'evening' | 'any';
  /** Why it matters, in a sentence or two. */
  why: string;
  /** How to start, right now. */
  how: string;
  /** Lines from the same chapter that go with this task; the day's line comes from these. */
  lines: number[];
}

/** One item of a day's work. Keys: 'r0'-'r2' (the rules), 'd' (the daily task), 'o:<id>' (your own). */
export interface WorkItem {
  key: string;
  text: string;
  source: 'rule' | 'daily' | 'own';
  chapter: ChapterId | null;
  /** Daily task only: what to photograph, why it matters, how to start. */
  proof?: string;
  why?: string;
  how?: string;
}

/** A proof photo, taken in the app. The photo never leaves the phone. */
export interface Proof {
  /** Local file (iOS) or stored image key (browser preview). Empty if the photo is gone (reinstall). */
  uri: string;
  /** Real time the photo was kept. */
  takenAt: number;
  /** The day's catalogue number, stamped on the photo. */
  lineNo: number | null;
}

/** A finished task. Its text is kept so later edits to the standard don't rewrite the past. */
export interface TaskDone {
  text: string;
  doneAt: number;
  /** null: marked done without a photo (no points). */
  proof: Proof | null;
}

/** A discount code traded for points. */
export interface CodeClaim {
  day: DayKey;
  collection: string;
  points: number;
  percent: number;
  code: string;
  url: string;
  /** Last day it works. */
  expires: DayKey;
}

export interface PointsConfig {
  perProof: number;
  /** Proven tasks that earn points in one day. */
  maxPerDay: number;
  tiers: { points: number; percent: number }[];
  maxOff: number;
  codeValidDays: number;
}

export interface RecordState {
  days: Record<DayKey, DayEntry>;
  /** Night check answers: true = Held, false = Not today. Never affects the record. */
  nights: Record<DayKey, boolean>;
  /** Milestone letters already shown: '7', '90', '365', or 'comeback:YYYY-MM-DD'. */
  lettersShown: string[];
  patchClaimed: DayKey | null;
  /** Finished tasks per day, by work-item key. */
  work: Record<DayKey, Record<string, TaskDone>>;
  /** Codes traded for points. */
  codes: CodeClaim[];
}
