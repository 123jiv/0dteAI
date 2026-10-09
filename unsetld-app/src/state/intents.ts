// Where a widget tap, deep link or notification wants the app to go. The
// navigator takes the intent once it's ready (src/App.tsx).
import { create } from 'zustand';
import type { NotificationEvent } from '../services/notifications';

export type Intent = { kind: 'today' } | { kind: 'progress' } | { kind: 'mission'; missionId: string };

export const useIntent = create<{ intent: Intent | null; nonce: number; push: (i: Intent) => void; clear: () => void }>(set => ({
  intent: null,
  nonce: 0,
  push: i => set(s => ({ intent: i, nonce: s.nonce + 1 })),
  clear: () => set({ intent: null }),
}));

/**
 * unsetld://today, unsetld://record (and unsetld://progress) → Progress,
 * unsetld://mission/<id> → that mission (the Next mission widget). Links from
 * 2.x (unsetld://line/412, unsetld://night-check) open Home.
 */
export function parseUrl(url: string): Intent | null {
  const m = /^unsetld:\/\/+([^?#]*)/i.exec(url.trim());
  if (!m) return null;
  const parts = m[1].split('/').filter(Boolean);
  const head = (parts[0] ?? '').toLowerCase();
  if (head === 'record' || head === 'progress') return { kind: 'progress' };
  if (head === 'mission' && /^[a-z0-9-]+$/i.test(parts[1] ?? '')) return { kind: 'mission', missionId: parts[1] };
  if (head === '' || head === 'today' || head === 'line' || head === 'night-check') return { kind: 'today' };
  return null;
}

/** Notification taps: the focus timer's opens its mission, everything else opens Home. */
export function handleNotificationEvent(e: NotificationEvent) {
  useIntent.getState().push(e.kind === 'open-mission' ? { kind: 'mission', missionId: e.missionId } : { kind: 'today' });
}
