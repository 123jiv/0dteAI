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

export type MilestoneId = 'early-access' | 'member-price' | 'patch' | 'member-price-15' | 'piece-365';

export interface Milestone {
  id: MilestoneId;
  day: number;
  title: string;
  short: string;
  detail: string;
  action: string;
  pausable: boolean;
  percent?: number;
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

export interface RecordState {
  days: Record<DayKey, DayEntry>;
  /** Night check answers: true = Held, false = Not today. Never affects the record. */
  nights: Record<DayKey, boolean>;
  /** Milestone letters already shown: '7', '30', '90', '180', '365', or 'comeback:YYYY-MM-DD'. */
  lettersShown: string[];
  /** Member price used, per collection id. */
  memberPriceUsed: Record<string, DayKey>;
  patchClaimed: DayKey | null;
}
