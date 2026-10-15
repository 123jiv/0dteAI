// A proof as the record shows it, whichever page shows it (Recent proof, Proof history, a day's
// page), and Proof history's ways of organising them: by month, by mission, by area.
import type { DayProof } from '../../core/history';
import type { ProofEntry, ProofMonth } from '../../core/progress';
import type { DayKey } from '../../core/time';
import type { PlannedMission, ProofPhoto, TrackId } from '../../core/types';
import { historyMission, TRACK_BY_ID, TRACKS, type HistoryMission } from '../../content';
import { PROGRESS } from '../../content/copy/progress';

const H = PROGRESS.history;

/** A proof with what every screen needs to show it, from a Proof history entry or a day's page. */
export interface ProofView {
  /** `${day}:${missionId}`, unique on the record. */
  key: string;
  day: DayKey;
  missionId: string;
  title: string;
  /** "School", or '' for an area an old record names that the app no longer has. */
  area: string;
  points: number;
  doneAt: number;
  photos: ProofPhoto[];
  /** The after photo of a pair, else the only one; its uri is '' once the retention setting cleared it. */
  cover: ProofPhoto | null;
  timerSeconds: number;
}

/** "School", or '' for an area the app no longer has. */
export const areaName = (track: string) => TRACK_BY_ID[track as TrackId]?.short ?? '';

/**
 * The mission's title: as it was proven (3.2 keeps it, 3.3 as the user read it, "Work on Your
 * Clothing Brand for 30 Minutes"), else the mission's (one retired in 3.3 by the title it had,
 * content historyMission), else one made from its id or its area (an id nothing knows).
 */
export function proofTitle(missionId: string, title: string | undefined, track: string): string {
  return title?.trim() || historyMission(missionId)?.title || H.fallbackTitle(missionId, areaName(track));
}

export function fromEntry(e: ProofEntry): ProofView {
  const { done } = e;
  return {
    key: e.key,
    day: e.day,
    missionId: done.missionId,
    title: proofTitle(done.missionId, done.title, done.track),
    area: areaName(done.track),
    points: typeof done.points === 'number' && Number.isFinite(done.points) ? done.points : 0,
    doneAt: done.doneAt ?? 0,
    photos: done.photos,
    cover: e.cover,
    timerSeconds: typeof done.timerSeconds === 'number' && done.timerSeconds > 0 ? done.timerSeconds : 0,
  };
}

/** A mission a day's plan held and didn't prove, as the day's page lists it. */
export interface OpenMission {
  id: string;
  title: string;
  /** The area it was planned in ("School"), or '' for one the app no longer has. */
  area: string;
}

/**
 * What a day's plan held that wasn't proven, in plan order: an approved mission or one of the
 * user's own by the title Today showed it with (`titleOf`), one retired in 3.3 by the title it
 * had then (content historyMission, history only), so the rows match the planned count. An id
 * nothing knows is left out.
 */
export function openMissions(ids: readonly string[], planned: readonly PlannedMission[] | undefined, titleOf: (m: HistoryMission) => string): OpenMission[] {
  return ids.flatMap(id => {
    const m = historyMission(id);
    if (!m) return [];
    const p = planned?.find(x => x.missionId === id);
    return [{ id, title: titleOf(m), area: areaName(p?.area ?? m.track) }];
  });
}

export function fromDay(day: DayKey, p: DayProof): ProofView {
  return {
    key: `${day}:${p.missionId}`,
    day,
    missionId: p.missionId,
    title: proofTitle(p.missionId, p.title, p.track),
    area: areaName(p.track),
    points: p.points,
    doneAt: p.doneAt,
    photos: p.photos,
    cover: p.cover,
    timerSeconds: p.timerSeconds,
  };
}

/** How Proof history is organised: by month (newest first), by mission (most proven first), by area. */
export type HistoryBy = 'date' | 'mission' | 'area';
export const HISTORY_BY: readonly HistoryBy[] = ['date', 'mission', 'area'];

export interface ProofSection {
  key: string;
  title: string;
  /** Under a month ("19 active days · 47 missions proven"); beside a mission or an area, its count. */
  meta: string;
  said: string;
  month: boolean;
  /** Newest first. */
  proofs: ProofView[];
}

/**
 * Proof history's sections. By date: a section a month. By mission: one per mission title, most
 * proven first (a tie keeps the one proven last first). By area: the app's areas in order, then
 * any area an old record names that the app no longer has. Proofs newest first in each.
 */
export function proofSections(by: HistoryBy, months: readonly ProofMonth[], thisYear: string): ProofSection[] {
  if (by === 'date') {
    return months.map(m => {
      const title = PROGRESS.month(m.month, thisYear);
      const meta = H.monthMeta(m.activeDays, m.missions);
      return { key: m.month, title, meta, said: `${title}. ${meta}`, month: true, proofs: m.entries.map(fromEntry) };
    });
  }
  const groups = new Map<string, ProofView[]>();
  for (const p of months.flatMap(m => m.entries.map(fromEntry))) {
    const k = by === 'mission' ? p.title : p.area;
    const list = groups.get(k);
    if (list) list.push(p);
    else groups.set(k, [p]);
  }
  const keys =
    by === 'mission'
      ? [...groups.keys()].sort((a, b) => groups.get(b)!.length - groups.get(a)!.length)
      : [...TRACKS.map(t => t.short).filter(n => groups.has(n)), ...(groups.has('') ? [''] : [])];
  return keys.map(k => {
    const proofs = groups.get(k)!;
    const title = k || H.otherArea;
    return { key: `${by}:${k}`, title, meta: H.count(proofs.length), said: H.a11ySection(title, proofs.length), month: false, proofs };
  });
}
