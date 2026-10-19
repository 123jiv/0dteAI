// New users after the launch pass's three-step onboarding (P1-2) are never asked About you: school,
// work, project, gym and age stay null and no skill is picked. Their days are as full and stay in
// their own areas, and the answers no longer asked never changed a plan anyway. Counts come from
// slotsFor, never a fixed number of missions a day.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { DEFAULT_PROFILE, eligibleAreas, generatePlan, historyFrom, impliedAreas, meetsRequirements, slotsFor, type PlanInput } from '../missions';
import { addDays, type DayKey } from '../time';
import type { DayPlan, Mission, Profile, TrackId } from '../types';

const LIBRARY = (missionsJson as Mission[]).filter(m => m.active);
const BY_ID = new Map(LIBRARY.map(m => [m.id, m]));

/** What a new user's profile holds for the About you answers: nothing. */
const UNASKED: Partial<Profile> = { school: null, schoolLevel: null, work: null, project: null, gym: null, age: null, skills: [] };

const USERS: { tracks: TrackId[]; goal: string | null }[] = [
  { tracks: ['school', 'fitness', 'discipline'], goal: 'Improve grades and train consistently.' },
  { tracks: ['projects', 'money', 'fitness'], goal: 'Build a clothing brand and save money.' },
  { tracks: ['career', 'skills', 'organization'], goal: 'Get a software job and improve coding.' },
  { tracks: ['projects', 'skills', 'discipline'], goal: 'Build and ship an app.' },
  { tracks: ['fitness', 'money', 'career'], goal: 'Improve fitness, save money, and find a better job.' },
  { tracks: ['school', 'money'], goal: null },
  { tracks: ['discipline', 'organization', 'skills', 'career'], goal: null },
];

const newUser = (u: (typeof USERS)[number], minutes: Profile['minutes']): Profile => ({ ...DEFAULT_PROFILE, ...UNASKED, tracks: u.tracks, goal: u.goal, minutes });

/** Days in a row with every planned mission proven, so cooldowns and rotation do their work. */
function run(profile: Profile, days = 14, start: DayKey = '2026-10-12', salt = 'new-user'): DayPlan[] {
  const done: Record<DayKey, Record<string, { missionId: string }>> = {};
  const plans: Record<DayKey, DayPlan> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const input: PlanInput = { library: LIBRARY, profile, day, salt, history: historyFrom(done, plans, {}, day), hour: 8 };
    const plan = generatePlan(input);
    plans[day] = plan;
    done[day] = Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }]));
    out.push(plan);
  }
  return out;
}

describe('a new user, About you never asked', () => {
  for (const u of USERS) {
    for (const minutes of [15, 30, 45, 60] as const) {
      it(`${u.tracks.join(', ')} at ${minutes} min${u.goal ? `, "${u.goal}"` : ''}: full days, their own areas`, () => {
        const profile = newUser(u, minutes);
        const days = run(profile);
        const seen = new Set<TrackId>();
        for (const plan of days) {
          expect(plan.missions.length, plan.day).toBe(slotsFor(profile).length);
          const eligible = eligibleAreas(profile, plan.day);
          for (const p of plan.missions) {
            const m = BY_ID.get(p.missionId);
            expect(m, p.missionId).toBeTruthy();
            expect(eligible, `${plan.day} ${p.missionId}`).toContain(p.area ?? m!.track);
            expect(meetsRequirements(m!.requires, profile, plan.day), p.missionId).toBe(true);
            seen.add((p.area ?? m!.track) as TrackId);
          }
        }
        // Every area they picked comes up within two weeks.
        for (const t of u.tracks) expect(seen.has(t), t).toBe(true);
      });
    }
  }
});

describe('the answers About you no longer asks', () => {
  it('work, gym and age never change a plan', () => {
    for (const u of USERS) {
      const base = run(newUser(u, 45), 7).map(p => p.missions.map(x => x.missionId).join(','));
      for (const answers of [
        { work: true, gym: true, age: '18plus' },
        { work: false, gym: false, age: 'u16' },
        { work: true, gym: false, age: '16to17' },
      ] as Partial<Profile>[]) {
        const answered = run({ ...newUser(u, 45), ...answers }, 7).map(p => p.missions.map(x => x.missionId).join(','));
        expect(answered, `${u.tracks.join(', ')} ${JSON.stringify(answers)}`).toEqual(base);
      }
    }
  });

  it('a No to school from an earlier version still keeps School out, whatever the goal says', () => {
    const p = { ...DEFAULT_PROFILE, ...UNASKED, tracks: ['fitness', 'money'] as TrackId[], goal: 'Get better grades' };
    expect(impliedAreas({ ...p, school: false })).not.toContain('school');
    expect(eligibleAreas({ ...p, school: false }, '2026-10-19')).not.toContain('school');
    expect(impliedAreas({ ...p, school: true })).toContain('school');
  });

  it('a goal that names something being built brings Projects in without the project question', () => {
    const p = { ...DEFAULT_PROFILE, ...UNASKED, tracks: ['fitness', 'money'] as TrackId[], goal: 'Launch my clothing brand' };
    expect(impliedAreas(p)).toContain('projects');
  });
});
