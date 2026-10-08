import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Letter, MilestoneId } from '../core/record';
import type { DocId } from '../content';

export type PaywallFrom = 'onboarding' | 'chapter' | 'colorway' | 'tasks' | 'yours' | 'settings' | 'reminders' | 'share';

export type RootParams = {
  Name: undefined;
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
