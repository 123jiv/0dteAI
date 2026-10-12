// The swap sheet (placeholder until the swap group builds it): WHY ARE YOU SWAPPING?, then
// RECOMMENDED FOR YOU and + CREATE MY OWN. Contract used by Today and the mission page.
import type { DayKey } from '../../core/time';

export interface SwapTarget {
  /** The mission's place in the day's plan. */
  index: number;
  missionId: string;
  title: string;
  day: DayKey;
}

export function SwapSheet(props: {
  target: SwapTarget | null;
  onClose: () => void;
  /** After a swap: the new mission's id. */
  onSwapped: (id: string) => void;
  /** 4:00 AM passed while the sheet was open: the day it was for is over. */
  onDayOver?: () => void;
  /** "See UNSETLD+" from the limit dialog. */
  onPaywall: () => void;
}) {
  void props;
  return null;
}
