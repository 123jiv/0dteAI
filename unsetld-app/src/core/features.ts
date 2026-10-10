// What's free and what UNSETLD+ adds, in one place. The core loop is always free: missions,
// proof, the streak, points and UNSETLD rewards never depend on a membership. Limits that
// differ (swaps, reminders) live in rules.json and core/reminders; this map says which side
// each feature is on, so moving one is a one-line change.
export type Edition = 'free' | 'plus';

export const FEATURES = {
  /** Three personalized missions a day. */
  dailyMissions: 'free',
  /** Photo, timer and before/after proof. */
  proof: 'free',
  streak: 'free',
  points: 'free',
  /** Point rewards and status at unsetld.com. Never paid-only. */
  rewards: 'free',
  /** Progress: streak, this week, areas, proof history, achievements. */
  progress: 'free',
  weeklyFocus: 'free',
  weeklyReview: 'free',
  /** One swap a day (rules.json rerolls.free). */
  swaps: 'free',
  /** Plans marked free in programs.json (7 Day Lock In, Get Organized). */
  basicPlans: 'free',
  widgets: 'free',
  /** More swaps a day (rules.json rerolls.full). */
  extraSwaps: 'plus',
  /** Every plan in programs.json. */
  allPlans: 'plus',
  /** All colorways. */
  colorways: 'plus',
  /** More reminders a day (core/reminders). */
  extraReminders: 'plus',
} as const satisfies Record<string, Edition>;

export type Feature = keyof typeof FEATURES;

/** Whether a feature is open: free features always, UNSETLD+ features with the membership. */
export function hasFeature(feature: Feature, plus: boolean): boolean {
  return FEATURES[feature] === 'free' || plus;
}
