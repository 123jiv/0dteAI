import type { DayKey } from '../core/time';
import type { CustomLine, LaneId, Line, Tone } from '../core/types';
import type { ThemeDef } from '../content';

export interface WidgetSnapshotInput {
  lines: Line[];
  lanes: LaneId[];
  tone: Tone;
  lockScreenClean: boolean;
  custom: CustomLine[];
  salt: string;
  today: DayKey;
  streak: number;
  rankName: string;
  theme: ThemeDef;
}
