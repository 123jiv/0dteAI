// What a milestone's primary action does. Shared by the milestone page and
// the milestone letter.
import type { MilestoneId } from '../core/record';
import { claim, openStore, type Perk } from '../services/access';
import { useApp } from '../state/store';

export type ActionResult = 'done' | 'needs-account' | 'paused' | 'used' | 'network';

const PERK: Record<MilestoneId, Perk | null> = {
  'early-access': null,
  patch: 'patch',
  'piece-365': 'piece-365',
};

export async function runMilestoneAction(id: MilestoneId): Promise<ActionResult> {
  const st = useApp.getState();
  if (id === 'early-access') {
    st.updateSettings({ dropAlerts: true });
    return 'done';
  }
  if (!st.account.userId) return 'needs-account';
  const perk = PERK[id]!;
  const r = await claim(perk);
  if (!r.ok) return r.reason;
  if (perk === 'patch') useApp.getState().claimPatch();
  openStore(r.url);
  return 'done';
}
