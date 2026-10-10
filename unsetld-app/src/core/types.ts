import type { DayKey } from './time';

/** 2.x chapters, kept so saved choices can be turned into tracks. */
export type ChapterId = 'discipline' | 'focus' | 'training' | 'money' | 'confidence' | 'vices' | 'stoic';

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

/**
 * An UNSETLD status tier, earned by active days (days with a proven mission). Defaults come
 * from content/milestones.json; unsetld.com's config `status` can replace them (core/rewards
 * parseStatus). Only the ids the app knows (MilestoneId) carry an action, a pause and a
 * letter; any other id is shown as a display-only tier.
 */
export interface StatusTier {
  id: string;
  /** Active days needed. */
  day: number;
  title: string;
  short: string;
  detail: string;
  /** false: not shown. */
  active: boolean;
  /** Pauses with early access (core/record). The app's own ids only. */
  pausable: boolean;
  /** The milestone page's button. The app's own ids only. */
  action?: string;
  /** The letter when it's reached. The app's own ids only. */
  letter?: Milestone['letter'];
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

/** A 2.x proof photo (kept in old records). */
export interface Proof {
  /** Local file (iOS) or stored image key (browser preview). Empty if the photo is gone (reinstall). */
  uri: string;
  /** Real time the photo was kept. */
  takenAt: number;
  /** The day's catalogue number, stamped on the photo. */
  lineNo: number | null;
}

/** A 2.x finished task (kept in old records; their points carried over as legacyPoints). */
export interface TaskDone {
  text: string;
  doneAt: number;
  /** null: marked done without a photo (no points). */
  proof: Proof | null;
}

/** A 2.x discount code traded for points. */
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

export interface RecordState {
  /** Active days. Since 3.0 a day goes on record when a mission is proven. */
  days: Record<DayKey, DayEntry>;
  /** 2.x night check answers (no longer asked). */
  nights: Record<DayKey, boolean>;
  /** Milestone letters already shown: '7', '90', '365', or 'comeback:YYYY-MM-DD'. */
  lettersShown: string[];
  patchClaimed: DayKey | null;
  /** 2.x finished tasks per day. */
  work: Record<DayKey, Record<string, TaskDone>>;
  /** Codes traded for points (2.x). */
  codes: CodeClaim[];
  /** 3.0: proven missions per day, by mission id. */
  missions: Record<DayKey, Record<string, MissionDone>>;
  /** 3.0: bonus points per day (perfect day). */
  bonuses: Record<DayKey, number>;
  /** 3.0: rewards taken. */
  redemptions: Redemption[];
  /** Points balance carried over from 2.x tasks and codes (set once, on migration). */
  legacyPoints: number;
}

// ── 3.0 Missions ────────────────────────────────────────────────────────────

/** What the user is trying to improve. One to four are chosen in onboarding. */
export type TrackId = 'discipline' | 'school' | 'fitness' | 'money' | 'career' | 'business' | 'skills' | 'projects' | 'organization';

export interface Track {
  id: TrackId;
  /** "DISCIPLINE" */
  name: string;
  /** Short name for rows and levels: "Discipline". */
  short: string;
  /** One line under the name in onboarding. */
  scope: string;
}

/**
 * How a mission is proven.
 * PHOTO: one photo of the thing or the result.  PHOTO_AFTER: same, kept for older records.
 * BEFORE_AFTER: a photo before, then one after.  TIMER_AND_PHOTO: the in-app timer runs out, then a photo.
 * TIMER: the in-app timer runs out; no photo.
 */
export type ProofType = 'PHOTO' | 'PHOTO_AFTER' | 'BEFORE_AFTER' | 'TIMER_AND_PHOTO' | 'TIMER';

/**
 * A mission's place in the day: one easy mission (15 minutes or less), the rest
 * focused ones. Earlier builds stored 'quick' | 'progress' | 'challenge' here.
 */
export type MissionSlot = 'easy' | 'main';

/** Skills a user can say they're learning; skill-specific missions need a match. */
export type SkillId = 'coding' | 'design' | 'video' | 'writing' | 'language' | 'music';

/**
 * What a mission needs from the user's life; a mission is only offered when they match.
 * 'highschool': in school and not in college (SAT/ACT, college applications).
 * 'building': not for someone who said they aren't building a business or project yet;
 * 'starting': not for someone who said they are (Write Down 10 Business Ideas).
 */
export type Requirement = 'school' | 'highschool' | 'work' | 'gym' | 'project' | 'building' | 'starting' | 'age16' | 'age18' | SkillId;

export interface Mission {
  /** Permanent id, "<track>-<slug>": "school-study-30". Completions and programs refer to it. */
  id: string;
  /** The goal area it counts toward (shown on the row, levels, swaps). */
  track: TrackId;
  /** Other goal areas it also serves ("Work on Your Portfolio" is career, also projects). */
  also?: TrackId[];
  /** Plain title that says what to do: "Study for 30 Minutes". */
  title: string;
  /** One sentence: exactly what to do. */
  short: string;
  /** What the proof shows: "Your notes or study setup, after the timer." */
  proof: string;
  proofType: ProofType;
  /** Points for a proven completion: 5 to 25, by how long it takes. */
  points: number;
  /** Realistic time it takes, in minutes. Fifteen or less is an easy mission. */
  minutes: number;
  /** TIMER and TIMER_AND_PHOTO: the focus timer length. */
  timerMinutes?: number;
  requires?: Requirement[];
  /** Days before it can be offered again after it was done. */
  cooldownDays: number;
  /** Can be done more than once (most can; "Write the First Draft of Your Resume" can't). */
  repeatable: boolean;
  /** A core habit that should come back often (study, train, build, plan tomorrow). */
  anchor?: boolean;
  /** Missions that overlap ("tomorrow-ready", "deep-work") share a group; a day never holds two from one group. */
  group?: string;
  /** How often the generator picks it, relative to 1. */
  weight?: number;
  /** Morning missions are left out of a plan made after noon. */
  when?: 'morning' | 'evening';
  /** Days of the week it can be planned (0 = Sunday), for missions tied to a school day. Any day when absent. */
  days?: number[];
  /**
   * Skills it suits ("Edit One Video": video). A soft hint, not a requirement: users who
   * named other skills see it less, users who named one of these see it more.
   */
  fits?: SkillId[];
  tags: string[];
  active: boolean;
}

/** Answers from onboarding. null = skipped. */
export interface Profile {
  tracks: TrackId[];
  /** In school or college. */
  school: boolean | null;
  /** Which, when in school: high school or college. Absent or null = not asked or skipped. */
  schoolLevel?: 'high' | 'college' | null;
  work: boolean | null;
  gym: boolean | null;
  /** Building a business or a project of their own. */
  project: boolean | null;
  /** Skills they're learning (optional). */
  skills: SkillId[];
  /** Age range: 13–15, 16–17, 18+. */
  age: 'u16' | '16to17' | '18plus' | null;
  /** The daily time the user realistically has: 15, 30, 45 or 60 (60+) minutes. */
  minutes: 15 | 30 | 45 | 60;
  intensity: 'easy' | 'lockin' | 'push';
  /** A track the 3.0 weekly review set to lean on. Retired: the weekly focus replaced it, and store v6 clears it. */
  priority: TrackId | null;
  /** "What are you working toward?" in their own words ("Launch my clothing brand"). Optional, at most 80 characters. */
  goal?: string | null;
  /** "What matters most this week?", for the week starting `week`. Absent or another week = not set. */
  focus?: WeeklyFocus | null;
  /** Next week's focus, picked in Sunday's review. It takes over on Monday (core/personalize focusFor); this week's stays until then. */
  nextFocus?: WeeklyFocus | null;
}

/** The weekly focus choices (core/personalize FOCUS_OPTIONS says what each one leans the plan toward). */
export type FocusId = 'school-catchup' | 'exam' | 'business' | 'gym' | 'project' | 'routine' | 'save' | 'skill' | 'other';

export interface WeeklyFocus {
  /** Monday of the week it's for. */
  week: DayKey;
  id: FocusId;
  /** 'other': what they typed (at most 60 characters). */
  text?: string;
}

/** One mission in today's plan. */
export interface PlannedMission {
  slot: MissionSlot;
  missionId: string;
  /**
   * The chosen area this mission is in the day for (a mission can serve several:
   * "Work on Your Portfolio" is Career, also Projects). The row shows it and a swap
   * stays in it. Absent on plans made by earlier builds.
   */
  area?: TrackId;
  /** Set when it came from a program. */
  programId?: string;
}

export interface DayPlan {
  day: DayKey;
  missions: PlannedMission[];
  /** Replacements used today. */
  rerolls: number;
  /** Missions swapped out today (never offered again today). */
  replaced: string[];
}

export interface ProofPhoto {
  /** Local file (iOS) or stored image key (browser preview). Empty once cleared by the retention policy. */
  uri: string;
  takenAt: number;
  kind: 'single' | 'before' | 'after';
  /** Fingerprint of the saved image, to stop the same photo counting twice. */
  hash: string;
}

export interface VerificationCheck {
  id: 'photos' | 'fresh' | 'order' | 'timer' | 'duplicate';
  ok: boolean;
  note: string;
}

/** What checked the proof. Only 'on-device' exists today; a vision verifier can be added (see services/verify). */
export interface Verification {
  status: 'accepted' | 'rejected';
  method: 'on-device' | 'vision';
  checks: VerificationCheck[];
  at: number;
}

export interface MissionDone {
  missionId: string;
  /** Older records hold 'quick' | 'progress' | 'challenge'. */
  slot: MissionSlot | string;
  track: TrackId;
  /** Points actually credited (0 if the proof was rejected). */
  points: number;
  doneAt: number;
  photos: ProofPhoto[];
  /** Seconds the focus timer ran, for TIMER and TIMER_AND_PHOTO. */
  timerSeconds?: number;
  verification: Verification;
  programId?: string;
}

export interface ProgramState {
  id: string;
  startedDay: DayKey;
  /** Days on which a mission from the program was proven, in order. */
  doneDays: DayKey[];
  finishedDay: DayKey | null;
}

export interface Program {
  id: string;
  title: string;
  short: string;
  /** Number of program days. */
  days: number;
  tracks: TrackId[];
  free: boolean;
  /** Missions for each program day (1-indexed by position), 1–2 ids per day. */
  plan: string[][];
}

export type RewardType = 'discount' | 'free-shipping' | 'early-access' | 'limited' | 'drop';

/** A reward tier. Defaults live in content/rewards.json; unsetld.com's config can replace them. */
export interface RewardTier {
  id: string;
  title: string;
  /** One line under the title. */
  detail: string;
  type: RewardType;
  points: number;
  /** Discount rewards only. */
  percent?: number;
  /** Cap in dollars for percentage discounts. */
  maxOff?: number;
  active: boolean;
  /** ISO dates; outside the window the reward shows as not available. */
  availableFrom?: string | null;
  availableUntil?: string | null;
  /** Days a minted code works. */
  codeValidDays: number;
  /** Units left, if limited. null = unlimited. The server enforces it. */
  inventory?: number | null;
  /** How many a user can take each collection. */
  perCollection: number;
  /** Smallest order in dollars the code works on; null or absent = any order. Shown on the reward, enforced by unsetld.com. */
  minimumPurchase?: number | null;
  /** Days after taking it before it can be taken again; null or absent = only perCollection limits it. */
  redemptionCooldownDays?: number | null;
  /** Can only ever be taken once per person. */
  oneTimeOnly?: boolean;
}

/** A reward the user took. */
export interface Redemption {
  rewardId: string;
  points: number;
  collection: string;
  day: DayKey;
  code: string;
  url: string;
  expires: DayKey;
}
