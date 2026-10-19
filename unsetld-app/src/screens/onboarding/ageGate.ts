// What the Age step's answer does to the store (launch pass P0-4). Kept apart from the screens
// so it can be tested. Only the bucket is kept; the birth year and month never reach the store.
import type { AgeBucket } from '../../core/age';
import { deleteLocalData, type DeleteResult } from '../../services/wipe';
import { useApp } from '../../state/store';

type AppState = ReturnType<typeof useApp.getState>;

/** 13 or over: the bucket goes on the profile and the gate is passed, for good on this install. */
export function passAgeGate(age: AgeBucket): void {
  const s = useApp.getState();
  s.setProfile({ age });
  s.updateSettings({ ageCheck: 'ok' });
}

/**
 * Under 13: everything UNSETLD keeps on this phone goes first (the Keychain record included),
 * then this install is blocked. Blocked even when the delete fails: the block screen tries the
 * delete again on the next launch while anything is left (`holdsData`).
 */
export async function blockUnder13(): Promise<DeleteResult | 'error'> {
  let result: DeleteResult | 'error';
  try {
    result = await deleteLocalData();
  } catch {
    result = 'error';
  }
  useApp.getState().updateSettings({ ageCheck: 'under13' });
  return result;
}

/**
 * Anything someone could have entered is still in the store: onboarding finished, a day or a
 * mission on the record (one restored from the Keychain too), a goal, a mission of their own.
 */
export function holdsData(s: Pick<AppState, 'settings' | 'record' | 'profile' | 'customMissions'>): boolean {
  return (
    s.settings.onboarded ||
    Object.keys(s.record.days ?? {}).length > 0 ||
    Object.keys(s.record.missions ?? {}).length > 0 ||
    Boolean(s.profile.goal) ||
    (s.customMissions ?? []).length > 0
  );
}
