import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MilestoneKey } from '../core/progress';
import type { Letter, MilestoneId } from '../core/record';
import type { DayKey } from '../core/time';
import type { DocId } from '../content';

export type PaywallFrom = 'onboarding' | 'colorway' | 'settings' | 'reminders' | 'programs' | 'swaps';

/** The four tabs, always at the bottom: Today, Progress, Rewards, You. */
export type TabParams = {
  /** Today's missions and the active plan. */
  Today: { nonce?: number; sheet?: 'colorway' | 'focus' } | undefined;
  /** Streak, this week, your areas; links to proof history, achievements and stats. */
  Progress: undefined;
  /** Points, the next reward, status. */
  Rewards: undefined;
  /** Goals, profile, reminders, membership, settings. */
  You: undefined;
};

export type RootParams = {
  Name: undefined;
  /** 3.0 onboarding (and Settings → Your plan with edit). */
  Tracks: { edit?: boolean } | undefined;
  AboutYou: { edit?: boolean } | undefined;
  Pace: { edit?: boolean } | undefined;
  /** "What are you working toward?" (optional free text; onboarding, and You to edit). */
  Goal: { edit?: boolean } | undefined;
  /** The tabs. Reach one from a stack screen with navigate('Main', { screen: 'Rewards' }). */
  Main: NavigatorScreenParams<TabParams> | undefined;
  /** 3.0: a mission, with PROVE IT and its proof flow. */
  Mission: { missionId: string };
  WeeklyReview: { weekStart: DayKey };
  /** Plans (multi-day programs; core/programs). Opened from Today and You. */
  Plans: undefined;
  /** Progress › Proof history: the private record of every proof, by month. */
  ProofHistory: undefined;
  /** Progress › Achievements (milestones). */
  Achievements: undefined;
  /** Progress › Stats: the detailed numbers. */
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
  /** A progress milestone reached (first 10 missions, 7 days ...). */
  Moment: { key: MilestoneKey };
  Day: { edit?: boolean } | undefined;
  Widget: { guide?: boolean } | undefined;
  Paywall: { from: PaywallFrom } | undefined;
  Account: undefined;
  Doc: { id: DocId };
  /** The same page presented as a sheet (from the paywall, which is itself a modal). */
  DocSheet: { id: DocId };
  Milestone: { id: MilestoneId };
  Letter: { letter: Letter };
  DevTools: undefined;
};

export type RootProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;

/** A tab's props: its own route, and navigation that also reaches every stack screen. */
export type TabProps<K extends keyof TabParams> = CompositeScreenProps<BottomTabScreenProps<TabParams, K>, NativeStackScreenProps<RootParams>>;
