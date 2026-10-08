import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { RecordState } from '../core/types';

// The record is mirrored into the iOS Keychain, which normally survives
// deleting the app, so a reinstall doesn't wipe the days on record.
const KEY = 'unsetld.record.v2';
const supported = Platform.OS === 'ios';

export interface Backup {
  installSalt: string;
  record: RecordState;
}

let lastWritten = '';
let timer: ReturnType<typeof setTimeout> | null = null;

export function backupRecord(b: Backup) {
  if (!supported) return;
  const json = JSON.stringify(b);
  if (json === lastWritten) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    lastWritten = json;
    SecureStore.setItemAsync(KEY, json).catch(() => {});
  }, 1500);
}

export async function readBackup(): Promise<Backup | null> {
  if (!supported) return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const b = raw ? (JSON.parse(raw) as Backup) : null;
    return b && b.record && typeof b.record.days === 'object' ? b : null;
  } catch {
    return null;
  }
}
