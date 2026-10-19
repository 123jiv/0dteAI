import type { DayKey } from '../core/time';
import type { Colorway, DayPlan, Profile, RecordState } from '../core/types';

/** Everything the widgets need; the app writes it on every foreground and after changes. */
export interface WidgetInput {
  today: DayKey;
  premium: boolean;
  /** Effective colorway: Black for free users. */
  colorway: Colorway;
  /** Proven missions, points and active days. */
  record: RecordState;
  /** Day plans: today's, and any later day that already has one. */
  plans: Record<DayKey, DayPlan>;
  /** Missions a day (core/missions slotsFor: one to four), for days without a plan yet ("Two missions are waiting."). */
  perDay: number;
  /**
   * The user's goal and skills, so each mission is named as Today names it ("Work on Your
   * Clothing Brand for 30 Minutes", core/titles). Without it, the approved titles.
   */
  profile?: Pick<Profile, 'goal' | 'skills'>;
}
