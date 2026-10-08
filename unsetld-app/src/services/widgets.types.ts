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
  /** Lines hidden with "Don't show this line again": never on a widget. */
  hidden: number[];
  /** Your lines (Full Edition only; empty otherwise). They take some of the prompt reminders' slots. */
  yourLines: string[];
  /** Same plan the notifications use, so the widget shows the line the reminder delivered. */
  schedule: ScheduleInput;
}
