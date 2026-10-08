// What a milestone's primary action does. Shared by the milestone page and
// the milestone letter.
import type { MilestoneId } from '../core/record';
import { claim, openStore, type Perk } from '../services/access';
import { notificationStatus, requestNotifications, type Drop } from '../services/notifications';
import { useApp } from '../state/store';

export type ActionResult = 'done' | 'needs-account' | 'paused' | 'used' | 'network' | 'notifications-off';

const PERK: Record<MilestoneId, Perk> = {
  'early-access': 'early-access',
  patch: 'patch',
  'piece-365': 'piece-365',
};

/**
 * The drop inside its early window (earlyAt to publicAt) at `t`, if any. Pass
 * real time, not the tester tools' clock: the storefront keeps real time.
 */
export function earlyDrop(drops: Drop[], t: number): Drop | null {
  return drops.find(d => Date.parse(d.earlyAt) <= t && t < Date.parse(d.publicAt)) ?? null;
}

/** The next time after `t` that a drop's early window opens or closes, if any. */
export function nextDropChange(drops: Drop[], t: number): number | null {
  const times = drops.flatMap(d => [Date.parse(d.earlyAt), Date.parse(d.publicAt)]).filter(x => x > t);
  return times.length ? Math.min(...times) : null;
}

/**
 * Claims the milestone and opens the store link in Safari: the patch, the 365
 * piece, or early access to the drop that's open early now.
 */
export async function runMilestoneAction(id: MilestoneId): Promise<ActionResult> {
  if (!useApp.getState().account.userId) return 'needs-account';
  const perk = PERK[id];
  const r = await claim(perk);
  if (!r.ok) {
    // Claimed before, maybe on another phone: show it as used here too.
    if (perk === 'patch' && r.reason === 'used') useApp.getState().claimPatch();
    return r.reason;
  }
  if (perk === 'patch') useApp.getState().claimPatch();
  openStore(r.url);
  return 'done';
}

/**
 * Turns drop alerts on, asking for notification permission first if iOS hasn't
 * asked yet. When notifications are off, alerts stay off.
 */
export async function enableDropAlerts(): Promise<'done' | 'notifications-off'> {
  let p = await notificationStatus().catch(() => 'undetermined' as const);
  if (p === 'undetermined') p = (await requestNotifications().catch(() => false)) ? 'granted' : 'denied';
  if (p === 'denied') return 'notifications-off';
  useApp.getState().updateSettings({ dropAlerts: true });
  return 'done';
}
