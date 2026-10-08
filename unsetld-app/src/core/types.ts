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

/** One day's proof: a photo of the work, taken in the app. The photo never leaves the phone. */
export interface Proof {
  /** Local file (iOS) or stored image key (browser preview). Empty if the photo is gone (reinstall). */
  uri: string;
  /** Which of the three rules it proves (0-2), if the user picked one. */
  rule: number | null;
  /** Real time the photo was kept. */
  takenAt: number;
  /** The day's catalogue number, stamped on the photo. */
  lineNo: number | null;
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
  /** Proof per day (at most one). */
  proofs: Record<DayKey, Proof>;
  /** Codes traded for points. */
  codes: CodeClaim[];
}
