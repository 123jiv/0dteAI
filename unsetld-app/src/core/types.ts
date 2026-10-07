import type { DayKey } from './time';

export type LaneId =
  | 'show-up'
  | 'bag-talk'
  | 'gym-rat'
  | 'lock-in'
  | 'back-yourself'
  | 'cut-it-off'
  | 'stoic';

export type Tone = 'clean' | 'unfiltered';

export interface Line {
  id: string;
  lane: LaneId | 'custom';
  text: string;
  tone: Tone;
  status?: 'draft' | 'approved';
  /** Stoic quotes only. */
  author?: string;
  translator?: string;
  ref?: string;
}

export interface CustomLine {
  id: string;
  text: string;
  createdAt: number;
}

export interface DayRecord {
  line?: boolean;
  nonNegotiable?: string;
  mission?: string;
  xp: number;
  /** Day was credited while the clock could not be checked against the server. */
  unverified?: boolean;
}

export interface CodeClaim {
  day: DayKey;
  code: string;
  percent: number;
  rank: number;
}

export interface Progress {
  installSalt: string;
  lastOpenDay: DayKey | null;
  streak: number;
  bestStreak: number;
  shieldsMonth: string | null;
  shieldsUsed: number;
  /** Bookkeeping for the gap since lastOpenDay, so reconciling is idempotent. */
  gap: { covered: number; decayDays: number; broken: boolean } | null;
  lifetimeXP: number;
  rankXP: number;
  highestRank: number;
  /** Rank the user has already seen a celebration for. */
  seenRank: number;
  lastRankDrop: DayKey | null;
  days: Record<DayKey, DayRecord>;
  milestonesPaid: Record<string, DayKey>;
  fullWeeksPaid: DayKey[];
  customLineWeek: DayKey | null;
  comeback: { remaining: number; startedOn: DayKey } | null;
  lastComebackStart: DayKey | null;
  claims: CodeClaim[];
}

export interface RankDef {
  id: string;
  name: string;
  xp: number;
  approx: string;
  perks: string[];
  discountPercent: number;
  cooldownDays: number;
  /** Discount tier needs server-verified Rank Sync (v2). */
  needsRankSync: boolean;
}

export interface RankConfig {
  ranks: RankDef[];
  xp: {
    line: number;
    nonNegotiable: number;
    mission: number;
    fullWeek: number;
    customLine: number;
    milestones: Record<string, number>;
  };
  shieldsPerMonth: number;
  graceDays: number;
  decayPerDay: number;
  rankDropFloorDays: number;
  comebackCooldownDays: number;
  claims: {
    minStreak: number;
    maxPerYear: number;
    maxDollarsPerOrder: number;
    minOrder: number;
    expiresDays: number;
  };
}
