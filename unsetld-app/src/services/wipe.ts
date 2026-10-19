// Delete data on this phone (launch pass P0-5): everything UNSETLD keeps on this phone goes, the
// Keychain copy of the record included, so a reinstall starts fresh too. The membership stays
// with the Apple ID (read again from the store afterwards), and so does the trial reminder.
// Local only: no network call, so it works offline and signed out. You › YOUR DATA and the age
// gate (under 13) call it.
//
// The order matters. The backup writer is suspended first, so a write already waiting can't put
// the Keychain copy back. Deleting that copy is the only gate: if the Keychain can't be changed,
// nothing else is touched and the writer resumes. Then the store goes back to a new install's
// state (from then on nothing schedules reminders or writes widgets: no one is onboarded), and
// the rest is cleared behind it. Stopped partway (the app killed), startup finishes the job:
// before the store reset the old record loads and its backup is written again, so a retry
// works; after it, startup's clean-up cancels reminders, resets widgets and deletes the session.
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useApp } from '../state/store';
import { clearSession } from './account';
import { deleteBackup, resumeBackups, suspendBackups } from './backup';
import { clearMetrics } from './metrics';
import { clearPendingExceptTrial, NO_REMINDERS, reschedule, scheduleDropAlerts } from './notifications';
import { deleteAllPhotos } from './proof';
import { cancelTimerDone } from './timerNotify';
import { resetWidgets } from './widgets';

/** The first build's rank state in the Keychain. Nothing reads it; it only ever goes. */
const OLD_RANK_KEY = 'unsetld.rank.v1';

/** 'done' once everything is gone; 'failed' when the Keychain record couldn't be deleted (nothing else was touched). */
export type DeleteResult = 'done' | 'failed';

let running: Promise<DeleteResult> | null = null;
const afterDelete = new Set<() => void>();

/**
 * Work that runs once the data is gone. Startup (state/lifecycle) registers reading UNSETLD+ from
 * the store again, so the membership shows without a restore. Returns the way to unregister.
 */
export function afterLocalDelete(fn: () => void): () => void {
  afterDelete.add(fn);
  return () => {
    afterDelete.delete(fn);
  };
}

/** Deletes everything UNSETLD keeps on this phone. A second call while one runs gets the same result. */
export function deleteLocalData(): Promise<DeleteResult> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

const current = () => {
  const s = useApp.getState();
  return { installSalt: s.installSalt, record: s.record };
};

async function run(): Promise<DeleteResult> {
  // 1. No backup write goes out from here on; one already waiting is dropped.
  suspendBackups();

  // 2. The Keychain copy of the record: the only gate.
  if (!(await deleteBackup())) {
    resumeBackups(current());
    return 'failed';
  }
  try {
    await clearEverythingElse();
  } catch {
    // Something gave way before the store was reset: what's left is backed up again, so trying
    // again works (and startup finishes a reset that did happen).
    resumeBackups(current());
    return 'failed';
  }
  // 9. UNSETLD+ from the store again (no logOut: it would force a restore).
  for (const fn of afterDelete) {
    try {
      fn();
    } catch {
      // The data is gone either way.
    }
  }
  return 'done';
}

async function clearEverythingElse(): Promise<void> {
  // 3. The other Keychain items: the session token, older builds' Apple token and rank state.
  await Promise.all([clearSession().catch(() => {}), deleteOldRank()]);

  // 4. The store: a new install's state, saved (the server config kept, the membership inactive
  //    until the store says otherwise). The user's own missions leave the lookup.
  useApp.getState().resetLocalData();
  await clearMetrics(); // usage counts waiting to be sent, and their once-only flags (services/metrics)

  // 5. Notifications, each kind through its own queue (so a rebuild already running can't put
  //    any back), then anything else of this app's still pending, except the trial reminder;
  //    delivered ones are dismissed.
  await Promise.all([
    reschedule(NO_REMINDERS).catch(() => 0),
    scheduleDropAlerts({ drops: [], optedIn: false }).catch(() => {}),
    cancelTimerDone().catch(() => {}),
  ]);
  await clearPendingExceptTrial().catch(() => {});

  // 6. Files: the proof folder (orphans included), the camera's and the resize's caches, and the
  //    image views' caches.
  deleteAllPhotos();
  await clearImageViews();

  // 7. Widgets: the Black preview, and nothing left for the foreground listener to write back.
  await resetWidgets().catch(() => {});

  // 8. The writer runs again from the reset record, which is empty: it deletes, never writes.
  resumeBackups(current());
}

/** expo-image's disk and memory caches (proof photos viewed before they were kept in memory only). */
async function clearImageViews(): Promise<void> {
  try {
    await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
  } catch {
    // Nothing cached, or no cache here.
  }
}

async function deleteOldRank(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await SecureStore.deleteItemAsync(OLD_RANK_KEY).catch(() => {});
}
