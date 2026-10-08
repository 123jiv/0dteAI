import type { DayKey } from '../core/time';
import type { ChapterId, Colorway, RecordState } from '../core/types';
import type { ScheduleInput } from './notifications';

/** Everything the widgets need; the app writes it on every foreground and after changes. */
export interface WidgetInput {
  today: DayKey;
  premium: boolean;
  /** Effective colorway: Black for free users. */
  colorway: Colorway;
  mix: ChapterId[];
  record: RecordState;
  /** The user's three rules. */
  standard: string[];
  /** Same plan the notifications use, so the widget shows the line the reminder delivered. */
  schedule: ScheduleInput;
}
