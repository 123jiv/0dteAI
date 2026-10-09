// Proof photos: fingerprints (so one photo can't count twice) and the retention policy
// (photos are cleared after a while; the record of the mission stays).
import { hash32 } from './random';
import { addDays, type DayKey } from './time';
import type { MissionDone, RecordState } from './types';

/** A 64-bit-ish fingerprint of an image's bytes (base64 or data URL). Same bytes, same value. */
export function fingerprint(data: string): string {
  const body = data.replace(/^data:[^,]*,/, '');
  const a = hash32(body);
  const b = hash32(`${body.length}:${body.slice(-4096)}`);
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

/** Fingerprints of every photo already used. */
export function usedHashes(r: RecordState): Set<string> {
  const out = new Set<string>();
  for (const byId of Object.values(r.missions ?? {})) for (const m of Object.values(byId)) for (const p of m.photos) if (p.hash) out.add(p.hash);
  return out;
}

export interface StoredPhoto {
  day: DayKey;
  missionId: string;
  uri: string;
}

/** Photos from missions older than `days` days. `days` 0 keeps everything. */
export function photosToClear(r: RecordState, days: number, today: DayKey): StoredPhoto[] {
  if (days <= 0) return [];
  const cutoff = addDays(today, -days);
  const out: StoredPhoto[] = [];
  for (const [day, byId] of Object.entries(r.missions ?? {})) {
    if (day >= cutoff) continue;
    for (const m of Object.values(byId)) for (const p of m.photos) if (p.uri) out.push({ day, missionId: m.missionId, uri: p.uri });
  }
  return out;
}

/** The record with those photos' files forgotten (fingerprints kept, so they still can't be reused). */
export function clearPhotos(r: RecordState, cleared: readonly StoredPhoto[]): RecordState {
  if (!cleared.length) return r;
  const gone = new Set(cleared.map(c => c.uri));
  const missions: RecordState['missions'] = {};
  for (const [day, byId] of Object.entries(r.missions)) {
    missions[day] = Object.fromEntries(
      Object.entries(byId).map(([id, m]): [string, MissionDone] => [id, { ...m, photos: m.photos.map(p => (gone.has(p.uri) ? { ...p, uri: '' } : p)) }]),
    );
  }
  return { ...r, missions };
}
