// The 13+ age gate (launch pass P0-4). Pure: the Age screen asks, this decides. Only the bucket
// is kept (Profile.age, with Settings.ageCheck); the birth year and month are never saved.
import type { Profile } from './types';

/** The youngest age UNSETLD is for. */
export const MIN_AGE = 13;
/** How many years back the year wheel goes. */
export const YEARS_SHOWN = 100;

/** Profile.age: 13–15 ('u16'), 16–17, 18 and over. */
export type AgeBucket = NonNullable<Profile['age']>;

/** What the gate decided: old enough (with the bucket), or under 13. */
export type AgeResult = { kind: 'ok'; age: AgeBucket } | { kind: 'under13' };

/** A birth year's answer: decided, or the month is needed first (only on the one year the 13 line runs through). */
export type BirthAnswer = AgeResult | { kind: 'month' };

const bucket = (age: number): AgeBucket => (age >= 18 ? '18plus' : age >= 16 ? '16to17' : 'u16');

/** The wheel's years, newest first: this year back to YEARS_SHOWN years ago. Nothing is picked at first. */
export function birthYears(now: Date): number[] {
  const y = now.getFullYear();
  return Array.from({ length: YEARS_SHOWN + 1 }, (_, i) => y - i);
}

/** The one birth year where 13 falls either side of this year's birthday: only that year asks for the month. */
export function needsMonth(year: number, now: Date): boolean {
  return now.getFullYear() - year === MIN_AGE;
}

/**
 * Year first. The month (1–12) is asked only on the 13 line (`needsMonth`); in the birth month
 * itself the birthday counts as not reached yet. A year that straddles 16 or 18 gives the younger
 * bucket: the protective side, and all it changes is one weekly focus option.
 */
export function ageFromBirth(year: number, month: number | null, now: Date): BirthAnswer {
  const oldest = now.getFullYear() - year; // the age once this year's birthday has passed
  const m = now.getMonth() + 1;
  const valid = month != null && Number.isInteger(month) && month >= 1 && month <= 12;
  if (!Number.isInteger(year) || oldest < MIN_AGE) return { kind: 'under13' };
  if (oldest === MIN_AGE) {
    if (!valid) return { kind: 'month' };
    return m > month ? { kind: 'ok', age: 'u16' } : { kind: 'under13' };
  }
  const age = valid && m > month ? oldest : oldest - 1;
  return { kind: 'ok', age: bucket(Math.max(MIN_AGE, age)) };
}

/** The age gates Apple's Declared Age Range is asked with: the same lines as the buckets. */
export const AGE_GATES = { threshold1: 13, threshold2: 16, threshold3: 18 } as const;

/**
 * An age range from Apple (gates 13, 16, 18). Null when it can't decide, and the year question
 * asks instead: no lower bound, or one under 13 that doesn't say under 13.
 */
export function ageFromRange(lower: number | null | undefined, upper: number | null | undefined): AgeResult | null {
  if (upper != null && upper < MIN_AGE) return { kind: 'under13' };
  if (lower == null) return null;
  if (lower >= 18) return { kind: 'ok', age: '18plus' };
  if (lower >= 16) return { kind: 'ok', age: '16to17' };
  if (lower >= MIN_AGE) return { kind: 'ok', age: 'u16' };
  return null;
}

/** The parts of expo-age-range's answer the gate reads. */
export interface AppleAgeRange {
  lowerBound: number | null;
  upperBound: number | null;
  ageRangeDeclaration?: string | null;
}

/**
 * Apple's answer, or null. Before iOS 26 and on the web the module answers `lowerBound: 18`
 * with no declaration: a simulated adult, never a real answer. Only a range someone declared
 * (themselves, a guardian, or confirmed by Apple) counts.
 */
export function appleAnswer(res: AppleAgeRange | null | undefined): AgeResult | null {
  if (!res || !res.ageRangeDeclaration) return null;
  return ageFromRange(res.lowerBound, res.upperBound);
}

/** Apple's Declared Age Range exists from iOS 26 (Platform.Version is "26.2" on iOS); never on the web or Android. */
export function canAskApple(os: string, version: string | number | undefined): boolean {
  if (os !== 'ios') return false;
  const major = parseInt(String(version ?? ''), 10);
  return Number.isFinite(major) && major >= 26;
}

/** Settings.ageCheck. */
export type AgeCheck = 'ok' | 'under13' | null;

/** The screen the app opens on. */
export type StartRoute = 'AgeBlocked' | 'Name' | 'Age' | 'Main';

/**
 * Under 13 stays blocked on this install; someone new starts at the beginning (the Age step
 * follows Name); someone onboarded before the gate existed answers it once, then goes on to Today.
 */
export function startRoute(s: { onboarded: boolean; ageCheck: AgeCheck | undefined }): StartRoute {
  if (s.ageCheck === 'under13') return 'AgeBlocked';
  if (!s.onboarded) return 'Name';
  if (s.ageCheck !== 'ok') return 'Age';
  return 'Main';
}

/**
 * A widget tap, deep link or notification tap: dropped before onboarding and on a blocked
 * install, held while someone onboarded earlier answers the age gate, then followed.
 */
export function intentGate(s: { onboarded: boolean; ageCheck: AgeCheck | undefined }): 'drop' | 'wait' | 'go' {
  if (!s.onboarded || s.ageCheck === 'under13') return 'drop';
  return s.ageCheck === 'ok' ? 'go' : 'wait';
}
