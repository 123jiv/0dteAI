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

/** The file name of a stored proof URI ("…/proof/2026-10-09-D1-after.jpg"), or null if it isn't one in a proof folder. */
export function proofFileName(uri: string): string | null {
  const m = /\/proof\/([A-Za-z0-9_-]+\.[A-Za-z0-9]+)$/.exec(uri);
  return m ? m[1] : null;
}

/** A file in the proof folder: its name, and when it was last written (ms; null when unknown). */
export interface ProofFile {
  name: string;
  modified: number | null;
}

/** A photo just taken but not sent yet (the Mission screen's) isn't on the record: files this new stay. */
export const ORPHAN_GRACE_MS = 10 * 60_000;

export interface OrphanInput {
  files: readonly ProofFile[];
  /** The record: proven missions' photos and 2.x tasks'. */
  record: RecordState;
  /** Tester time travel: the real record kept aside, whose photos come back with it. */
  snapshot?: RecordState | null;
  /** A before photo waiting for its after. */
  waiting?: string | null;
  now: number;
  /** The state came from defaults because storage couldn't be read: nothing is known, so nothing goes. */
  readFailed?: boolean;
  grace?: number;
}

/**
 * The proof-folder files nothing points to, deleted at startup: not the record's, the tester
 * snapshot's or the waiting before photo's (matched by file name: the app's container path
 * changes after updates and restores), and older than the grace period. None at all when the
 * record is empty or the state couldn't be read: then what the files belong to isn't known.
 */
export function orphans(i: OrphanInput): string[] {
  const r = i.record;
  const empty = !Object.keys(r.days ?? {}).length && !Object.keys(r.missions ?? {}).length && !Object.keys(r.work ?? {}).length;
  if (i.readFailed || empty) return [];
  const keep = new Set<string>();
  const refs = [...photoUris(r), ...(i.snapshot ? photoUris(i.snapshot) : []), ...(i.waiting ? [i.waiting] : [])];
  for (const uri of refs) {
    const name = proofFileName(uri);
    if (name) keep.add(name);
  }
  const grace = i.grace ?? ORPHAN_GRACE_MS;
  return i.files.filter(f => !keep.has(f.name) && f.modified !== null && i.now - f.modified >= grace).map(f => f.name);
}
