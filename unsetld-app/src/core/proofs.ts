// Proof photos: fingerprints (so one photo can't count twice) and the retention policy
// (photos are cleared after a while; the record of the mission stays).
import { hash32 } from './random';
import { addDays, type DayKey } from './time';
import type { MissionDone, RecordState, TaskDone } from './types';

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
  for (const byId of Object.values(r.missions ?? {})) for (const m of Object.values(byId ?? {})) for (const p of m?.photos ?? []) if (p.hash) out.add(p.hash);
  return out;
}

export interface StoredPhoto {
  day: DayKey;
  /** The mission it proves; for a 2.x photo, the task's key. */
  missionId: string;
  uri: string;
}

/** Every stored photo a record points to: proven missions' and 2.x tasks'. */
export function photoUris(r: RecordState): Set<string> {
  const out = new Set<string>();
  for (const byId of Object.values(r.missions ?? {})) for (const m of Object.values(byId ?? {})) for (const p of m?.photos ?? []) if (p.uri) out.add(p.uri);
  for (const byKey of Object.values(r.work ?? {})) for (const t of Object.values(byKey ?? {})) if (t?.proof?.uri) out.add(t.proof.uri);
  return out;
}

/**
 * Photos from days older than `days` days, each file once: proven missions', and 2.x tasks'
 * (record.work, where a day's tasks share one file). `days` 0 keeps everything.
 */
export function photosToClear(r: RecordState, days: number, today: DayKey): StoredPhoto[] {
  if (days <= 0) return [];
  const cutoff = addDays(today, -days);
  const out: StoredPhoto[] = [];
  const seen = new Set<string>();
  const add = (day: DayKey, missionId: string, uri: string | undefined) => {
    if (!uri || seen.has(uri)) return;
    seen.add(uri);
    out.push({ day, missionId, uri });
  };
  for (const [day, byId] of Object.entries(r.missions ?? {})) {
    if (day >= cutoff) continue;
    for (const m of Object.values(byId ?? {})) for (const p of m?.photos ?? []) add(day, m.missionId, p.uri);
  }
  for (const [day, byKey] of Object.entries(r.work ?? {})) {
    if (day >= cutoff) continue;
    for (const [key, t] of Object.entries(byKey ?? {})) add(day, key, t?.proof?.uri);
  }
  return out;
}

/**
 * The record with those photos' files forgotten (fingerprints kept, so they still can't be reused).
 * A 2.x task keeps its entry: its points are already in legacyPoints.
 */
export function clearPhotos(r: RecordState, cleared: readonly Pick<StoredPhoto, 'uri'>[]): RecordState {
  if (!cleared.length) return r;
  const gone = new Set(cleared.map(c => c.uri));
  const missions: RecordState['missions'] = {};
  for (const [day, byId] of Object.entries(r.missions ?? {})) {
    missions[day] = Object.fromEntries(
      Object.entries(byId ?? {}).map(([id, m]): [string, MissionDone] => [id, m ? { ...m, photos: (m.photos ?? []).map(p => (gone.has(p.uri) ? { ...p, uri: '' } : p)) } : m]),
    );
  }
  const work: RecordState['work'] = {};
  for (const [day, byKey] of Object.entries(r.work ?? {})) {
    work[day] = Object.fromEntries(
      Object.entries(byKey ?? {}).map(([key, t]): [string, TaskDone] => [key, t?.proof && gone.has(t.proof.uri) ? { ...t, proof: { ...t.proof, uri: '' } } : t]),
    );
  }
  return { ...r, missions, work };
}

/**
 * Browser preview, storage full: the stored photos to give up next, the oldest day's (by the
 * date in the name). Never today's or later, and never one in `keep` (a before photo waiting).
 */
export function oldestPhotos(uris: readonly string[], keep: ReadonlySet<string>, today: DayKey): string[] {
  const dayOf = (uri: string) => /(\d{4}-\d{2}-\d{2})/.exec(uri)?.[1] ?? null;
  const old = uris.filter(u => !keep.has(u) && (dayOf(u) ?? today) < today);
  if (!old.length) return [];
  const first = old.map(u => dayOf(u)!).sort()[0];
  return old.filter(u => dayOf(u) === first);
}
