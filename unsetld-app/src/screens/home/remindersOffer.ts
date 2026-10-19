// When Today offers reminders (launch pass P1-3). Kept apart from the card so it can be tested.
import type { DayKey } from '../../core/time';

/** Reading.remindersOffer: not offered yet, the day it was first shown, or answered. */
export type RemindersOffer = DayKey | 'done' | null;

/** Notification permission as services/notifications reports it; null while it's still being read. */
export type OfferPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported' | null;

/**
 * Once, on the first day something is proven: reminders are off, notifications aren't turned off
 * for the app (Settings would be the only way, and the card can't open it for them), and the
 * offer is new or was first shown today (it stays through that day, and goes at 4:00 AM). Never
 * while the weekly focus question has the same place on Today.
 */
export function shouldOfferReminders(i: {
  provenToday: boolean;
  remindersOn: boolean;
  permission: OfferPermission;
  offer: RemindersOffer | undefined;
  day: DayKey;
  focusAsked: boolean;
}): boolean {
  if (i.focusAsked || !i.provenToday || i.remindersOn) return false;
  if (i.permission === null || i.permission === 'denied') return false;
  return i.offer == null || i.offer === i.day;
}

/**
 * What to save as the offer, if anything: the day, the first time the card shows (so it goes at
 * 4:00 AM); 'done' when the first day with a proof finds reminders already on (turned on in You),
 * so turning them off later doesn't bring the question back.
 */
export function nextOffer(i: Parameters<typeof shouldOfferReminders>[0]): RemindersOffer | undefined {
  if (i.offer != null) return undefined;
  if (i.provenToday && i.remindersOn) return 'done';
  return shouldOfferReminders(i) ? i.day : undefined;
}
