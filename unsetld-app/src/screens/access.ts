// The status tiers in effect, the days Access counts, the status letter and drop alerts.
// Shared by Rewards, Status, the milestone page, the letter and You.
import { activeDays } from '../core/progress';
import type { Letter } from '../core/record';
import { effectiveStatus, pendingStatusLetter, statusDays } from '../core/rewards';
import type { DayKey } from '../core/time';
import type { DayEntry, RecordState, StatusTier } from '../core/types';
import { STATUS_DEFAULTS } from '../services/access';
import { notificationStatus, requestNotifications } from '../services/notifications';
import { useApp } from '../state/store';

/**
 * The record as Access sees it: its days are the active days (a mission
 * proven). Days already on record from 2.x stay counted, so nothing earned
 * before 3.0 is taken away; since 3.0 a day only goes on record with a proven
 * mission, so every new day is an active day. The core/rewards status
 * functions count these days themselves (statusDays), so they take either
 * record.
 */
export function accessRecord(r: RecordState): RecordState {
  const active = activeDays(r);
  if (![...active].some(d => !r.days[d])) return r;
  const days: Record<string, DayEntry> = { ...r.days };
  for (const d of active) days[d] ??= { verified: false };
  return { ...r, days };
}

/** Days that count toward UNSETLD status (active days; the tiers' days come from the status config). */
export function accessDays(r: RecordState): number {
  return statusDays(r);
}

/**
 * The status tiers in effect: unsetld.com's `status` list when it sent one, else
 * content/milestones.json; switched-on ones only, by day.
 */
export function statusTiers(remote: readonly StatusTier[] | null | undefined): StatusTier[] {
  return effectiveStatus(STATUS_DEFAULTS, remote);
}

export function useStatusTiers(): StatusTier[] {
  return statusTiers(useApp(s => s.remote.status));
}

/** A status tier by id, in effect or else built in (an old link to one the config switched off still opens). */
export function findStatus(tiers: readonly StatusTier[], id: string): StatusTier | null {
  return tiers.find(t => t.id === id) ?? STATUS_DEFAULTS.find(t => t.id === id) ?? null;
}

/** The status letter to show on Home, if any (core/rewards pendingStatusLetter, at the tiers in effect). */
export function accessLetter(r: RecordState, today: DayKey, tiers: readonly StatusTier[] = statusTiers(useApp.getState().remote.status)): Letter | null {
  return pendingStatusLetter(r, today, tiers);
}

/** What turning drop alerts on came to. */
export type ActionResult = 'done' | 'notifications-off';

/**
 * Turns drop alerts on (a heads-up 24 hours before each drop), asking for
 * notification permission first if iOS hasn't asked yet. When notifications are
 * off, alerts stay off.
 */
export async function enableDropAlerts(): Promise<ActionResult> {
  let p = await notificationStatus().catch(() => 'undetermined' as const);
  if (p === 'undetermined') p = (await requestNotifications().catch(() => false)) ? 'granted' : 'denied';
  if (p === 'denied') return 'notifications-off';
  useApp.getState().updateSettings({ dropAlerts: true });
  return 'done';
}
