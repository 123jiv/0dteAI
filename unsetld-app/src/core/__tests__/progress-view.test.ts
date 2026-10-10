// The 3.1 Progress views (docs/UX_REDESIGN.md §7–8): the week row, areas with time put in,
// achievements, proof history by month (cleared photos and timer-only proofs keep their place),
// and the weekly review's "Next week" focus.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { DEFAULT_PROFILE } from '../missions';
import { achievementsView, areaProgress, areasShown, milestones, proofMonths, trackProgress, weekDays } from '../progress';
import { emptyRecord } from '../record';
import { focusChoices, reviewFocusWeek } from '../review';
import { computeStreak } from '../streak';
import type { DayKey } from '../time';
import type { FocusId, Mission, MissionDone, Profile, ProofPhoto, RecordState, TrackId } from '../types';

const accepted = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };

interface Entry {
  day: DayKey;
  id: string;
  track?: TrackId;
  points?: number;
  photos?: ProofPhoto[];
  timer?: number;
  at?: number;
  rejected?: boolean;
}

function recordOf(entries: Entry[]): RecordState {
  const missions: Record<DayKey, Record<string, MissionDone>> = {};
  for (const e of entries) {
    missions[e.day] = {
      ...missions[e.day],
      [e.id]: {
        missionId: e.id,
        slot: 'main',
        track: e.track ?? 'school',
        points: e.points ?? 10,
        doneAt: e.at ?? 1,
        photos: e.photos ?? [],
        timerSeconds: e.timer,
        verification: e.rejected ? { ...accepted, status: 'rejected' } : accepted,
      },
    };
  }
  return { ...emptyRecord(), missions };
}

const photo = (uri: string, kind: ProofPhoto['kind'] = 'single'): ProofPhoto => ({ uri, kind, takenAt: 1, hash: uri || kind });

describe('this week on Progress', () => {
  it('reads each day: proven, missed, covered, today, ahead, and nothing before the first mission', () => {
    // Wednesday 14 Oct 2026; the week starts Monday 12 Oct. First mission ever on Monday.
    const active = new Set(['2026-10-12']);
    const days = weekDays(active, [], '2026-10-14', '2026-10-12');
    expect(days.map(d => d.kind)).toEqual(['proven', 'missed', 'today', 'ahead', 'ahead', 'ahead', 'ahead']);
    // Proven today, an Off Day covered Tuesday.
    const later = weekDays(new Set(['2026-10-12', '2026-10-14']), ['2026-10-13'], '2026-10-14', '2026-10-12');
    expect(later.map(d => d.kind).slice(0, 3)).toEqual(['proven', 'covered', 'today-proven']);
    // A first mission on Wednesday: Monday and Tuesday weren't missed, there was nothing yet.
    const fresh = weekDays(new Set(['2026-10-14']), [], '2026-10-14', '2026-10-12');
    expect(fresh.map(d => d.kind).slice(0, 3)).toEqual(['before', 'before', 'today-proven']);
  });

  it('marks a covered day the way the streak counted it', () => {
    const active = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-13'];
    const s = computeStreak(new Set(active), '2026-10-14');
    expect(s.covered).toEqual(['2026-10-12']);
    expect(weekDays(new Set(active), s.covered, '2026-10-14', '2026-10-12')[0].kind).toBe('covered');
  });
});

describe('areas', () => {
  it('adds time: the timer where it ran, else the mission minutes; XP stays the level points', () => {
    const r = recordOf([
      { day: '2026-10-01', id: 'school-a', points: 15, timer: 1800 },
      { day: '2026-10-02', id: 'school-b', points: 10 },
      { day: '2026-10-02', id: 'gone-x', points: 5 },
      { day: '2026-10-03', id: 'school-c', points: 20, rejected: true },
      { day: '2026-10-03', id: 'fitness-a', track: 'fitness', points: 20 },
    ]);
    const minutes: Record<string, number> = { 'school-b': 20, 'fitness-a': 45 };
    const a = areaProgress(r, id => minutes[id]);
    expect(a.school).toMatchObject({ xp: 30, missions: 3, seconds: 1800 + 20 * 60 });
    expect(a.fitness).toMatchObject({ xp: 20, missions: 1, seconds: 45 * 60 });
    expect(a.school.xp).toBe(trackProgress(r).school.xp);
  });

  it('shows the chosen areas that can get missions, then others with points, never one ruled out with none', () => {
    const r = recordOf([
      { day: '2026-10-01', id: 'money-a', track: 'money', points: 25 },
      { day: '2026-10-01', id: 'skills-a', track: 'skills', points: 5 },
    ]);
    const levels = trackProgress(r);
    // Chose School, Fitness, Business; not in school, so School can't get missions.
    expect(areasShown(['school', 'fitness', 'business'], ['fitness', 'business'], levels)).toEqual(['fitness', 'business', 'money', 'skills']);
    const withSchool = trackProgress(recordOf([{ day: '2026-10-01', id: 'school-a', track: 'school' }]));
    expect(areasShown(['school', 'fitness'], ['fitness'], withSchool)).toEqual(['school', 'fitness']);
  });
});

describe('achievements', () => {
  it('lists what was reached, oldest first, then the next three', () => {
    const entries: Entry[] = Array.from({ length: 10 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, id: `school-${i}` }));
    const r = { ...recordOf(entries), bonuses: { '2026-10-03': 15 } };
    const v = achievementsView(milestones(r, '2026-10-10'));
    expect(v.reached.map(m => m.key)).toEqual(['first-mission', 'perfect-day', 'streak-7', 'missions-10']);
    expect(v.next.map(m => m.key)).toEqual(['missions-30', 'missions-100', 'streak-30']);
    expect(v.next[0]).toMatchObject({ progress: 10, target: 30 });
  });
});

describe('proof history', () => {
  it('groups every proven mission by month, newest first, keeping cleared photos and timer-only proofs', () => {
    const r = recordOf([
      { day: '2026-09-29', id: 'school-a', photos: [photo('')] },
      { day: '2026-09-30', id: 'school-b', timer: 1500 },
      { day: '2026-10-01', id: 'fitness-a', track: 'fitness', photos: [photo('web-proof:b', 'before'), photo('web-proof:a', 'after')], at: 5 },
      { day: '2026-10-01', id: 'school-c', photos: [photo('web-proof:c')], at: 9 },
      { day: '2026-10-02', id: 'school-d', rejected: true, photos: [photo('web-proof:d')] },
      { day: '2026-10-02', id: 'gone-x' },
    ]);
    const months = proofMonths(r);
    expect(months.map(m => [m.month, m.activeDays, m.missions])).toEqual([
      ['2026-10', 2, 3],
      ['2026-09', 2, 2],
    ]);
    const oct = months[0].entries;
    expect(oct.map(e => e.done.missionId)).toEqual(['gone-x', 'school-c', 'fitness-a']);
    expect(oct.map(e => e.tile)).toEqual(['none', 'photo', 'photo']);
    // The after photo of a pair is the cover.
    expect(oct[2].cover?.uri).toBe('web-proof:a');
    const sep = months[1].entries;
    expect(sep.map(e => [e.done.missionId, e.tile, e.cover?.uri ?? null])).toEqual([
      ['school-b', 'timer', null],
      ['school-a', 'photo', ''],
    ]);
  });

  it('copes with an empty or damaged record', () => {
    expect(proofMonths(emptyRecord())).toEqual([]);
    const r = { ...emptyRecord(), missions: { '2026-10-01': null as unknown as Record<string, MissionDone> } };
    expect(proofMonths(r)).toEqual([]);
  });
});

describe('the review sets next week’s focus', () => {
  it('asks only at the end of a week, for the week after the one reviewed', () => {
    // Sunday 11 Oct reviews 5–11 Oct and sets the week from 12 Oct.
    expect(reviewFocusWeek('2026-10-05', '2026-10-11')).toBe('2026-10-12');
    // Monday 12 Oct reviews last week and sets the week that just started.
    expect(reviewFocusWeek('2026-10-05', '2026-10-12')).toBe('2026-10-12');
    // This week read early from Progress (Wednesday): no choice.
    expect(reviewFocusWeek('2026-10-12', '2026-10-14')).toBeNull();
  });

  it('offers the weekly focus options without Something else, and only ones the plan can follow', () => {
    const order: FocusId[] = ['school-catchup', 'exam', 'business', 'gym', 'other'];
    const library = missionsJson as unknown as Mission[];
    const p = (patch: Partial<Profile>): Profile => ({ ...DEFAULT_PROFILE, ...patch });
    expect(focusChoices(order, library, p({ school: true }))).toEqual(['school-catchup', 'exam', 'business', 'gym']);
    // Not in school: no school missions to lean toward, so no school options.
    expect(focusChoices(order, library, p({ school: false }))).toEqual(['business', 'gym']);
    // An area with nothing the user's answers allow is left out, whatever it is.
    const onlySchool = library.filter(m => m.track === 'school');
    expect(focusChoices(order, onlySchool, p({ school: true }))).toEqual(['school-catchup', 'exam']);
  });
});
