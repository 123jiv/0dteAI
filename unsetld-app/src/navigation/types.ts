import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MilestoneKey } from '../core/progress';
import type { Letter, MilestoneId } from '../core/record';
import type { DayKey } from '../core/time';
import type { DocId } from '../content';

export type PaywallFrom = 'onboarding' | 'chapter' | 'colorway' | 'tasks' | 'yours' | 'settings' | 'reminders' | 'share' | 'programs' | 'swaps';

export type RootParams = {
  Name: undefined;
  /** 3.0 onboarding (and Settings → Your plan with edit). */
  Tracks: { edit?: boolean } | undefined;
  AboutYou: { edit?: boolean } | undefined;
  Pace: { edit?: boolean } | undefined;
  /** 3.0: a mission, with PROVE IT and its proof flow. */
  Mission: { missionId: string };
  Progress: undefined;
  WeeklyReview: { weekStart: DayKey };
  Rewards: undefined;
  Programs: undefined;
  /** A progress milestone reached (first 10 missions, 7 days ...). */
  Moment: { key: MilestoneKey };
  FirstLine: undefined;
  Standard: { edit?: boolean } | undefined;
  Chapters: undefined;
  Day: { edit?: boolean } | undefined;
  Widget: { guide?: boolean } | undefined;
  Paywall: { from: PaywallFrom } | undefined;
  Today: { nonce?: number; sheet?: 'chapters' | 'colorway'; night?: boolean } | undefined;
  Record: undefined;
  Settings: undefined;
  Saved: undefined;
  YourLines: undefined;
  Account: undefined;
  Doc: { id: DocId };
  /** The same page presented as a sheet (from the paywall, which is itself a modal). */
  DocSheet: { id: DocId };
  Milestone: { id: MilestoneId };
  Letter: { letter: Letter };
  Task: { key: string };
  ProofGallery: undefined;
  DevTools: undefined;
};

export type RootProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;
