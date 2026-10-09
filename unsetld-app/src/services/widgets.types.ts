import type { DayKey } from '../core/time';
import type { Colorway, DayPlan, RecordState } from '../core/types';

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
  /** Missions a day, for days without a plan yet ("Three missions are waiting."). */
  perDay: number;
}
