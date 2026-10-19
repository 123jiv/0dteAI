import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { RecordState } from '../core/types';

// The record is mirrored into the iOS Keychain, which normally survives
// deleting the app, so a reinstall doesn't wipe the days on record.
//
// Writes wait 1.5 s for the record to settle, and none goes out before startup has read the
// Keychain copy (a reinstall's empty record would otherwise be written over the one it's about
// to restore): the gate opens once that read is over, even if it failed. Delete data on this
// phone suspends the writer before it deletes the item, so a write already waiting can't put it
// back. A record with nothing on it deletes the item instead of writing one.
const KEY = 'unsetld.record.v2';
const supported = Platform.OS === 'ios';
const DEBOUNCE_MS = 1500;

export interface Backup {
  installSalt: string;
  record: RecordState;
}

/** No days and no missions: nothing a reinstall would want back (the restore check's test). */
export function isEmptyRecord(r: Pick<RecordState, 'days' | 'missions'> | null | undefined): boolean {
  return !Object.keys(r?.days ?? {}).length && !Object.keys(r?.missions ?? {}).length;
}

/** What was last written (or deleted, as ''), so the same record isn't written again. */
let lastWritten: string | null = null;
/** The newest backup asked for, waiting for the debounce, the gate or a resume. */
let latest: { json: string; empty: boolean } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
/** Startup's Keychain read is over. */
let gateOpen = false;
/** That read failed (the Keychain couldn't be read): an empty record then never deletes what's there. */
let readFailed = false;
let suspended = false;

function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!gateOpen || suspended || !latest) return;
  timer = setTimeout(flush, DEBOUNCE_MS);
}

function flush() {
  timer = null;
  if (!gateOpen || suspended || !latest) return;
  const { json, empty } = latest;
  const key = empty ? '' : json;
  if (key === lastWritten) return;
  // An empty record after a failed read: what the Keychain holds is unknown, so it stays.
  if (empty && readFailed) return;
  lastWritten = key;
  if (empty) SecureStore.deleteItemAsync(KEY).catch(() => {});
  else SecureStore.setItemAsync(KEY, json).catch(() => {});
}

/** Mirrors the record into the Keychain, 1.5 s after it last changed (once the gate is open and while not suspended). */
export function backupRecord(b: Backup) {
  if (!supported) return;
  latest = { json: JSON.stringify(b), empty: isEmptyRecord(b.record) };
  schedule();
}

/** The Keychain copy, or null when there's none or it can't be read. */
export async function readBackup(): Promise<Backup | null> {
  if (!supported) return null;
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(KEY);
  } catch {
    readFailed = true;
    return null;
  }
  try {
    const b = raw ? (JSON.parse(raw) as Backup) : null;
    return b && b.record && typeof b.record.days === 'object' ? b : null;
  } catch {
    return null;
  }
}

/**
 * Startup: reads the Keychain copy when `read` (the record is empty: a reinstall) and hands it to
 * `restore`; then opens the gate, even if the read failed, and backs up `current()`, the record as
 * it stands now (restored or not).
 */
export async function openBackups(o: { read: boolean; restore: (b: Backup) => void; current: () => Backup }): Promise<void> {
  try {
    if (o.read) {
      const b = await readBackup();
      if (b) o.restore(b);
    }
  } catch {
    // Restoring failed: what's in the store stays as it is.
  } finally {
    gateOpen = true;
    if (supported) backupRecord(o.current());
  }
}

/** Delete data on this phone, first step: no write goes out (one waiting is dropped) until resumeBackups. */
export function suspendBackups() {
  suspended = true;
  if (timer) clearTimeout(timer);
  timer = null;
  latest = null;
  lastWritten = null;
}

/** The writer runs again, from `current` (the record after the reset: empty, so it deletes the item). */
export function resumeBackups(current?: Backup) {
  suspended = false;
  lastWritten = null;
  if (current) backupRecord(current);
  else schedule();
}

/** Deletes the Keychain copy. False when the Keychain couldn't be changed (it may still be there). */
export async function deleteBackup(): Promise<boolean> {
  if (!supported) return true;
  try {
    await SecureStore.deleteItemAsync(KEY);
    lastWritten = '';
    return true;
  } catch {
    return false;
  }
}

