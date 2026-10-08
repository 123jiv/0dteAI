// Today's work, proof and points. Each task proven with a photo earns points
// (up to a few a day); points trade for a discount code at unsetld.com, one
// code each collection.
import { seededShuffle } from './random';
import { addDays, dayNumber, type DayKey } from './time';
import type { ChapterId, CodeClaim, PointsConfig, Proof, RecordState, Task, TaskDone, WorkItem } from './types';

/**
 * The daily task: a fixed per-install order of the library (in the user's
 * chapters), walked a day at a time, so no task repeats until all have run.
 */
export function dailyTask(tasks: readonly Task[], chapters: readonly ChapterId[], salt: string, day: DayKey): Task | null {
  const mix = new Set(chapters);
  const pool = tasks.filter(t => mix.has(t.chapter)).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return null;
  const perm = seededShuffle(pool, `${salt}:tasks:${[...mix].sort().join(',')}`);
  return perm[((dayNumber(day) % perm.length) + perm.length) % perm.length];
}

/** A day's work: the three rules, the daily task, then your own tasks. */
export function dayWork(rules: readonly string[], daily: Task | null, own: readonly { id: string; text: string }[]): WorkItem[] {
  const items: WorkItem[] = rules
    .filter(r => r.trim())
    .slice(0, 3)
    .map((text, i) => ({ key: `r${i}`, text, source: 'rule', chapter: null }));
  if (daily) items.push({ key: 'd', text: daily.text, source: 'daily', chapter: daily.chapter, proof: daily.proof, why: daily.why, how: daily.how });
  for (const o of own) items.push({ key: `o:${o.id}`, text: o.text, source: 'own', chapter: null });
  return items;
}

export function doneOn(r: RecordState, day: DayKey): Record<string, TaskDone> {
  return r.work[day] ?? {};
}

/** Marks a task done (with a photo, or without). Replacing a photo keeps the original time. */
export function completeTask(r: RecordState, day: DayKey, item: WorkItem, proof: Proof | null, at: number): RecordState {
  const prev = r.work[day]?.[item.key];
  const done: TaskDone = { text: prev?.text ?? item.text, doneAt: prev?.doneAt ?? at, proof };
  return { ...r, work: { ...r.work, [day]: { ...r.work[day], [item.key]: done } } };
}

export function uncompleteTask(r: RecordState, day: DayKey, key: string): RecordState {
  const dayDone = { ...r.work[day] };
  delete dayDone[key];
  return { ...r, work: { ...r.work, [day]: dayDone } };
}

export function provenOn(r: RecordState, day: DayKey): number {
  return Object.values(doneOn(r, day)).filter(d => d.proof).length;
}

/** Points a day earned: proven tasks up to the daily cap. */
export function dayPoints(r: RecordState, cfg: PointsConfig, day: DayKey): number {
  return Math.min(cfg.maxPerDay, provenOn(r, day)) * cfg.perProof;
}

export function pointsEarned(r: RecordState, cfg: PointsConfig): number {
  return Object.keys(r.work).reduce((sum, d) => sum + dayPoints(r, cfg, d), 0);
}

export function pointsSpent(r: RecordState): number {
  return r.codes.reduce((sum, c) => sum + c.points, 0);
}

export function pointsBalance(r: RecordState, cfg: PointsConfig): number {
  return Math.max(0, pointsEarned(r, cfg) - pointsSpent(r));
}

export function codeForCollection(r: RecordState, collection: string): CodeClaim | null {
  return r.codes.find(c => c.collection === collection) ?? null;
}

export type TierStatus = { kind: 'ready' } | { kind: 'short'; need: number } | { kind: 'used' };

/** A tier is used once any code was taken this collection (one code each collection). */
export function tierStatus(r: RecordState, cfg: PointsConfig, tier: PointsConfig['tiers'][number], collection: string): TierStatus {
  if (codeForCollection(r, collection)) return { kind: 'used' };
  const balance = pointsBalance(r, cfg);
  return balance >= tier.points ? { kind: 'ready' } : { kind: 'short', need: tier.points - balance };
}

/** The best tier the user can take right now, if any. */
export function readyTier(r: RecordState, cfg: PointsConfig, collection: string): PointsConfig['tiers'][number] | null {
  const ready = cfg.tiers.filter(t => tierStatus(r, cfg, t, collection).kind === 'ready');
  return ready.length ? ready[ready.length - 1] : null;
}

/** Records a code the server minted; spends the tier's points. */
export function claimCode(
  r: RecordState,
  cfg: PointsConfig,
  tier: PointsConfig['tiers'][number],
  collection: string,
  day: DayKey,
  minted: { code: string; url: string },
): RecordState {
  if (tierStatus(r, cfg, tier, collection).kind !== 'ready') return r;
  const claim: CodeClaim = {
    day,
    collection,
    points: tier.points,
    percent: tier.percent,
    code: minted.code,
    url: minted.url,
    expires: addDays(day, cfg.codeValidDays),
  };
  return { ...r, codes: [...r.codes, claim] };
}

export interface ProofItem {
  day: DayKey;
  key: string;
  text: string;
  proof: Proof;
}

/** Every proof photo, newest first. */
export function allProofs(r: RecordState): ProofItem[] {
  const out: ProofItem[] = [];
  for (const day of Object.keys(r.work).sort().reverse()) {
    const done = r.work[day];
    const items = Object.entries(done)
      .filter(([, d]) => d.proof)
      .sort((a, b) => b[1].proof!.takenAt - a[1].proof!.takenAt);
    for (const [key, d] of items) out.push({ day, key, text: d.text, proof: d.proof! });
  }
  return out;
}

/** Days with at least one proof, newest first. */
/** Proven tasks per day, capped at the daily limit, oldest first. This is what the server counts. */
export function provenCounts(r: RecordState, cfg: PointsConfig): { day: DayKey; count: number }[] {
  return Object.keys(r.work)
    .sort()
    .map(day => ({ day, count: Math.min(cfg.maxPerDay, provenOn(r, day)) }))
    .filter(d => d.count > 0);
}
