// Where a widget tap, deep link or notification wants the app to go. The
// navigator takes the intent once it's ready.
import { create } from 'zustand';
import type { DayKey } from '../core/time';
import type { NotificationEvent } from '../services/notifications';
import { useApp } from './store';

export type Intent = { kind: 'line'; no: number } | { kind: 'night' } | { kind: 'today' } | { kind: 'record' };

export const useIntent = create<{ intent: Intent | null; nonce: number; push: (i: Intent) => void; clear: () => void }>(set => ({
  intent: null,
  nonce: 0,
  push: i => set(s => ({ intent: i, nonce: s.nonce + 1 })),
  clear: () => set({ intent: null }),
}));

/** unsetld://line/412, unsetld://today, unsetld://record, unsetld://night-check */
export function parseUrl(url: string): Intent | null {
  const m = /^unsetld:\/\/+([^?#]*)/i.exec(url.trim());
  if (!m) return null;
  const parts = m[1].split('/').filter(Boolean);
  if (parts[0] === 'line' && /^\d+$/.test(parts[1] ?? '')) return { kind: 'line', no: Number(parts[1]) };
  if (parts[0] === 'record') return { kind: 'record' };
  if (parts[0] === 'night-check') return { kind: 'night' };
  if (parts[0] === 'today' || parts.length === 0) return { kind: 'today' };
  return null;
}

const queued: { day: DayKey; held: boolean }[] = [];

function applyQueued() {
  while (queued.length) {
    const a = queued.shift()!;
    useApp.getState().answerNight(a.day, a.held);
  }
}

/** Night-check answers can arrive before the store has loaded (cold start from a notification action). */
export function handleNotificationEvent(e: NotificationEvent) {
  if (e.kind === 'night-answer') {
    queued.push({ day: e.day, held: e.held });
    if (useApp.getState().hydrated) applyQueued();
    else {
      // Wait for the store, however hydration ends (including the fallback to defaults).
      const unsub = useApp.subscribe(s => {
        if (!s.hydrated) return;
        unsub();
        applyQueued();
      });
    }
    return;
  }
  useIntent.getState().push(e.kind === 'open-line' ? { kind: 'line', no: e.no } : e.kind === 'open-night' ? { kind: 'night' } : { kind: 'today' });
}
