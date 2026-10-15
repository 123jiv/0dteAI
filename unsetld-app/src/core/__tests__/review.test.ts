// The weekly review only names areas the user could have had missions in: School is
// never "Didn't get to" for someone who said they're not in school.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { DEFAULT_PROFILE, usableAreas } from '../missions';
import { emptyRecord } from '../record';
import { weeklyReview } from '../review';
import type { DayKey } from '../time';
import type { Mission, MissionDone, Profile, RecordState, TrackId } from '../types';

const LIBRARY = (missionsJson as Mission[]).filter(m => m.active);
const WEEK: DayKey = '2026-10-05'; // a Monday

/** A record with one accepted proof per entry, in the area given. */
function provenIn(entries: { day: DayKey; track: TrackId; id: string }[]): RecordState {
  const r = emptyRecord();
  const missions: Record<DayKey, Record<string, MissionDone>> = {};
  for (const e of entries) {
    missions[e.day] = {
      ...missions[e.day],
      [e.id]: {
        missionId: e.id,
        slot: 'main',
        track: e.track,
        points: 10,
        doneAt: 1,
        photos: [],
        verification: { status: 'accepted', method: 'on-device', checks: [], at: 1 },
      },
    };
  }
  return { ...r, missions };
}

const notInSchool: Profile = { ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'money'], school: false, age: '18plus' };
/** A library with no School missions: School can get none, whatever the user picked. */
const NO_SCHOOL = LIBRARY.filter(m => m.track !== 'school');

describe('weekly review and areas that can get missions', () => {
  it('keeps every area the user picked that has missions, School too: picking it is enough', () => {
    expect(usableAreas(LIBRARY, notInSchool)).toEqual(['school', 'fitness', 'money']);
    expect(usableAreas(NO_SCHOOL, notInSchool)).toEqual(['fitness', 'money']);
  });

  it("never says Didn't get to: School when School could get no missions", () => {
    const r = provenIn([
      { day: WEEK, track: 'money', id: 'M1' },
      { day: '2026-10-06', track: 'fitness', id: 'F1' },
      { day: '2026-10-07', track: 'money', id: 'M2' },
    ]);
    const areas = usableAreas(NO_SCHOOL, notInSchool);
    expect(weeklyReview(r, {}, notInSchool, WEEK, areas)).toMatchObject({ strongest: 'money', ignored: null });
    // Without the usable areas every chosen area counts, as before.
    expect(weeklyReview(r, {}, notInSchool, WEEK).ignored).toBe('school');
  });

  it('still names a usable area that got nothing, skipping the one ruled out', () => {
    const profile: Profile = { ...notInSchool, tracks: ['school', 'fitness', 'money', 'discipline'] };
    const r = provenIn([{ day: WEEK, track: 'fitness', id: 'F1' }]);
    expect(weeklyReview(r, {}, profile, WEEK, usableAreas(NO_SCHOOL, profile)).ignored).toBe('money');
  });

  it('names nothing outside the chosen areas when none of them can get missions (no fallback areas)', () => {
    const profile: Profile = { ...notInSchool, tracks: ['school'] };
    const areas = usableAreas(NO_SCHOOL, profile);
    expect(areas).toEqual([]);
    const r = provenIn([{ day: WEEK, track: 'discipline', id: 'D1' }]);
    expect(weeklyReview(r, {}, profile, WEEK, areas)).toMatchObject({ strongest: 'discipline', ignored: null });
  });

  it('counts a proof for the area the plan put it in, never one the user did not choose', () => {
    // "Improve One Part of Your Portfolio" (Career) planned for Projects.
    const profile: Profile = { ...DEFAULT_PROFILE, tracks: ['skills', 'projects'] };
    const r = provenIn([{ day: WEEK, track: 'career', id: 'C4' }]);
    const plans = { [WEEK]: { day: WEEK, missions: [{ slot: 'main' as const, missionId: 'C4', area: 'projects' as TrackId }], rerolls: 0, replaced: [] } };
    expect(weeklyReview(r, plans, profile, WEEK, usableAreas(LIBRARY, profile))).toMatchObject({ strongest: 'projects', ignored: 'skills' });
    // A plan from an earlier build has no area: the mission's own.
    const old = { [WEEK]: { ...plans[WEEK], missions: [{ slot: 'main' as const, missionId: 'C4' }] } };
    expect(weeklyReview(r, old, profile, WEEK).strongest).toBe('career');
  });

  it('never ranks an area the app no longer has as the strongest (Business, before the store moves it to Projects)', () => {
    const r = provenIn([
      { day: WEEK, track: 'mindset' as TrackId, id: 'mindset-a' },
      { day: '2026-10-06', track: 'business' as TrackId, id: 'business-b' },
      { day: '2026-10-06', track: 'business' as TrackId, id: 'business-c' },
      { day: '2026-10-07', track: 'fitness', id: 'F1' },
    ]);
    expect(weeklyReview(r, {}, notInSchool, WEEK, usableAreas(LIBRARY, notInSchool))).toMatchObject({ missions: 4, strongest: 'fitness', ignored: 'school' });
  });
});
