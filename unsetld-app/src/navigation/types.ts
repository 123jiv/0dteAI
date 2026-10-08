import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Letter, MilestoneId } from '../core/record';
import type { ChapterId } from '../core/types';
import type { DocId } from '../content';

export type ReaderMode =
  | { kind: 'mix' }
  | { kind: 'chapter'; id: ChapterId }
  | { kind: 'saved'; no: number }
  | { kind: 'volume'; volume: number };

export type PaywallFrom = 'onboarding' | 'chapter' | 'colorway' | 'end' | 'yours' | 'settings' | 'reminders' | 'share';

export type RootParams = {
  Name: undefined;
  FirstLine: undefined;
  Standard: { edit?: boolean } | undefined;
  Chapters: undefined;
  Day: { edit?: boolean } | undefined;
  Widget: { guide?: boolean } | undefined;
  Paywall: { from: PaywallFrom } | undefined;
  Reader: { mode?: ReaderMode; startNo?: number; nonce?: number; sheet?: 'chapters' | 'colorway' } | undefined;
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
  DevTools: undefined;
};

export type RootProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;
