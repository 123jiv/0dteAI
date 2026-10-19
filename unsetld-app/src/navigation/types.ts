import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MilestoneKey } from '../core/progress';
import type { Letter } from '../core/record';
import type { DayKey } from '../core/time';
import type { DocId } from '../content';

export type PaywallFrom = 'colorway' | 'settings' | 'reminders' | 'programs' | 'swaps';

/** The four tabs, always at the bottom: Today, Record, Rewards, You. */
export type TabParams = {
  /** Today's missions and the active plan. */
  Today: { nonce?: number; sheet?: 'colorway' | 'focus' } | undefined;
  /** The record: the month's days proven, your areas, recent proof; links to proof history, stats and achievements. */
  Record: undefined;
  /** Points, the next reward, status. */
  Rewards: undefined;
  /** Goals, profile, reminders, membership, settings. */
  You: undefined;
};

export type RootParams = {
  Name: undefined;
  /** The 13+ age gate: after Name, and once for someone onboarded before it existed. */
  Age: undefined;
  /** Under 13: where this install stays. */
  AgeBlocked: undefined;
  /** Onboarding step 1 (Areas), and You › Areas with edit. */
  Tracks: { edit?: boolean } | undefined;
  /** You › What you're learning (the skills; only with Skills, Projects or Career). Not part of onboarding. */
  AboutYou: { edit?: boolean } | undefined;
  /** Onboarding step 2 (Time), and You › Time and intensity with edit. */
  Pace: { edit?: boolean } | undefined;
  /** "What are you working toward?" (optional free text): onboarding's last step, and You to edit. */
  Goal: { edit?: boolean } | undefined;
  /** The tabs. Reach one from a stack screen with navigate('Main', { screen: 'Rewards' }). */
  Main: NavigatorScreenParams<TabParams> | undefined;
  /** 3.0: a mission, with PROVE IT and its proof flow. `start`: START on Today: a timer mission starts its timer straight away. */
  Mission: { missionId: string; start?: boolean };
  WeeklyReview: { weekStart: DayKey };
  /** Plans (multi-day programs; core/programs). Opened from Today and You. */
  Plans: undefined;
  /** Record › Proof history: the private record of every proof, by date, mission or area. */
  ProofHistory: undefined;
  /** Record › a day: each mission proven that day, its points, the bonus and the total. */
  RecordDay: { day: DayKey };
  /** Record › Achievements (milestones). */
  Achievements: undefined;
  /** Record › Stats: the detailed numbers. */
  Stats: undefined;
  /** Rewards › All rewards. */
  AllRewards: undefined;
  /** Rewards › Reward history (your codes). */
  RewardHistory: undefined;
  /** Rewards › How points work. */
  HowPoints: undefined;
  /** Rewards › UNSETLD status (consistency rewards by active days). */
  Status: undefined;
  /** The optional share card (Story size). Nothing leaves the phone unless the user shares it. */
  Share: undefined;
  /** "What matters most this week?" */
  WeeklyFocus: undefined;
  /** A progress milestone reached (first 10 missions, 7 days ...). `revisit`: opened again from Achievements. */
  Moment: { key: MilestoneKey; revisit?: boolean };
  /** You › Reminders. Onboarding no longer asks: Today offers them after the first proof. */
  Day: { edit?: boolean } | undefined;
  Widget: { guide?: boolean } | undefined;
  Paywall: { from: PaywallFrom } | undefined;
  Account: undefined;
  Doc: { id: DocId };
  /** The same page presented as a sheet (from the paywall, which is itself a modal). */
  DocSheet: { id: DocId };
  /** A status tier's page, by its id ('status-7' …, or one from the status config). */
  Milestone: { id: string };
  Letter: { letter: Letter };
  DevTools: undefined;
};

export type RootProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;

/** A tab's props: its own route, and navigation that also reaches every stack screen. */
export type TabProps<K extends keyof TabParams> = CompositeScreenProps<BottomTabScreenProps<TabParams, K>, NativeStackScreenProps<RootParams>>;
