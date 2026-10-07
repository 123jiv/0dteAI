import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Progress } from '../core/types';

// Rank progress is mirrored into the iOS Keychain, which normally survives
// deleting the app. A reinstall restores it, and it also means reinstalling
// can't reset discount-code cooldowns.
const KEY = 'unsetld.rank.v1';
const supported = Platform.OS === 'ios';

let lastWritten = '';
let timer: ReturnType<typeof setTimeout> | null = null;

export function backupProgress(p: Progress) {
  if (!supported) return;
  const compact = JSON.stringify({ ...p, days: recentDays(p) });
  if (compact === lastWritten) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    lastWritten = compact;
    SecureStore.setItemAsync(KEY, compact).catch(() => {});
  }, 1500);
}

export async function readBackup(): Promise<Progress | null> {
  if (!supported) return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

export async function clearBackup() {
  if (!supported) return;
  lastWritten = '';
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}

function recentDays(p: Progress) {
  const keys = Object.keys(p.days).sort().slice(-45);
  return Object.fromEntries(keys.map(k => [k, p.days[k]]));
}
