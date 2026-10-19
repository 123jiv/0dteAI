// A goal or a weekly "Something else" never dead-ends (launch pass, P1-4): when its words reach
// none of the areas the plan draws from, the screen asks which area it's about, and the pick
// gives the planner the same lean a goal naming that area would.
import { describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS } from '../../content';
import { focusAreaChoices, focusNeedsArea, goalAreaChoices, goalAreaToSave, goalQuestion, goalReach } from '../areaChoice';
import { completeMission } from '../complete';
import { DEFAULT_PROFILE, generatePlan, historyFrom, leadArea, type PlanInput } from '../missions';
import { learnFrom } from '../personalize';
import { TRACK_IDS } from '../progress';
import { emptyRecord } from '../record';
import { addDays, type DayKey } from '../time';
import type { DayPlan, Profile, RecordState, TrackId } from '../types';

const DAY: DayKey = '2026-10-21';
const me = (tracks: TrackId[], patch: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, school: null, age: '18plus', priority: null, tracks, ...patch });

describe('goalReach: the goal’s own areas among the plan’s', () => {
  it('a school goal reaches nothing without School, and School with it', () => {
    // Three areas picked: nothing is brought in (core/missions planAreas), so School stays out.
    expect(goalReach(MISSIONS, me(['fitness', 'discipline', 'money']), 'Get my GPA up', DAY)).toEqual([]);
    expect(goalReach(MISSIONS, me(['school', 'fitness']), 'Get my GPA up', DAY)).toEqual(['school']);
  });

  it('with fewer than three areas a school goal brings School in, unless a legacy No says out of school', () => {
    // core/missions impliedAreas: school !== false (onboarding no longer asks).
    expect(goalReach(MISSIONS, me(['fitness', 'discipline']), 'Get my GPA up', DAY)).toEqual(['school']);
    expect(goalReach(MISSIONS, me(['fitness', 'discipline'], { school: false }), 'Get my GPA up', DAY)).toEqual([]);
  });

  it('a brand reaches Projects through the areas it brings in (fewer than three picked)', () => {
    expect(goalReach(MISSIONS, me(['fitness', 'money']), 'Launch my clothing brand', DAY)).toEqual(['projects']);
    expect(goalReach(MISSIONS, me(['fitness', 'money', 'discipline']), 'Launch my clothing brand', DAY)).toEqual([]);
  });

  it('words that match nothing, empty text and refused text reach nothing', () => {
    expect(goalReach(MISSIONS, me(['fitness', 'money']), 'Get my life together', DAY)).toEqual([]);
    expect(goalReach(MISSIONS, me(['fitness', 'money']), '', DAY)).toEqual([]);
    expect(goalReach(MISSIONS, me(['projects', 'money']), 'Launch my vape shop', DAY)).toEqual([]);
  });

  it("this week's focus doesn't count: the goal has to reach an area on its own", () => {
    const focus = { week: '2026-10-19', id: 'exam' as const };
    expect(goalReach(MISSIONS, me(['fitness', 'discipline', 'money'], { focus }), 'Get my GPA up', DAY)).toEqual([]);
  });
});

describe('goalQuestion: when the Goal screen asks which area', () => {
  it("asks for words that reach none of the user's areas, offering their own areas", () => {
    const q = goalQuestion(MISSIONS, me(['fitness', 'discipline']), 'Get my life together', DAY);
    expect(q).toEqual({ ask: true, choices: ['fitness', 'discipline'], outside: null });
    expect(goalAreaChoices(MISSIONS, me(['fitness', 'discipline']), DAY)).toEqual(['fitness', 'discipline']);
  });

  it("names an area the words point at that isn't one of theirs", () => {
    expect(goalQuestion(MISSIONS, me(['fitness', 'discipline', 'money']), 'Get my GPA up', DAY)).toEqual({
      ask: true,
      choices: ['fitness', 'discipline', 'money'],
      outside: 'school',
    });
    // Two areas: School comes in with the goal, so there's nothing to ask.
    expect(goalQuestion(MISSIONS, me(['fitness', 'discipline']), 'Get my GPA up', DAY).ask).toBe(false);
  });

  it("doesn't ask when the words reach an area, with one area or none to pick, or for empty or refused text", () => {
    expect(goalQuestion(MISSIONS, me(['school', 'fitness']), 'Get my GPA up', DAY).ask).toBe(false);
    expect(goalQuestion(MISSIONS, me(['fitness']), 'Get my life together', DAY).ask).toBe(false);
    expect(goalQuestion(MISSIONS, me(['fitness', 'money']), '   ', DAY).ask).toBe(false);
    // Refused text gets its safety line, never the question or a keyword hint.
    for (const g of ['I want to die', 'Launch my vape shop', 'Starve myself', 'My password is hunter2']) {
      expect(goalQuestion(MISSIONS, me(['fitness', 'money']), g, DAY).ask, g).toBe(false);
    }
  });

  it('a goal with a note can still be given an area', () => {
    expect(goalQuestion(MISSIONS, me(['discipline', 'money']), 'Lose weight', DAY)).toEqual({ ask: true, choices: ['discipline', 'money'], outside: 'fitness' });
  });

  it('saves the pick only when it was asked for and is one of the choices', () => {
    const q = goalQuestion(MISSIONS, me(['fitness', 'discipline']), 'Get my life together', DAY);
    expect(goalAreaToSave(q, 'discipline')).toBe('discipline');
    expect(goalAreaToSave(q, 'money')).toBeNull();
    expect(goalAreaToSave(q, null)).toBeNull();
    expect(goalAreaToSave(goalQuestion(MISSIONS, me(['school', 'fitness']), 'Get my GPA up', DAY), 'fitness')).toBeNull();
  });
});

describe('focusAreaChoices: what "Something else" offers', () => {
  it('all eight areas, the user’s own first in the order they picked them', () => {
    expect(focusAreaChoices(MISSIONS, me(['money', 'fitness']))).toEqual(['money', 'fitness', 'discipline', 'school', 'career', 'skills', 'projects', 'organization']);
    expect(focusAreaChoices(MISSIONS, me(['fitness', 'money'])).length).toBe(TRACK_IDS.length);
  });

  it('nothing about school for someone who said they’re not in school and didn’t pick School', () => {
    expect(focusAreaChoices(MISSIONS, me(['fitness', 'money'], { school: false }))).not.toContain('school');
    expect(focusAreaChoices(MISSIONS, me(['school', 'money'], { school: false }))[0]).toBe('school');
  });

  it('an area with nothing the user’s answers allow is left out', () => {
    expect(focusAreaChoices(MISSIONS.filter(m => m.track !== 'organization'), me(['fitness', 'money']))).not.toContain('organization');
  });

  it('asks for an area only when the words name none', () => {
    expect(focusNeedsArea('Get my life together')).toBe(true);
    // Words that only say how ("consistently") name no area either.
    expect(focusNeedsArea('Do it consistently')).toBe(true);
    expect(focusNeedsArea('Finish my portfolio site')).toBe(false);
    expect(focusNeedsArea('')).toBe(false);
    expect(focusNeedsArea('Win at the casino')).toBe(false);
  });
});

/** Two weeks from Monday 19 October, planned at 9 AM the way the store does it, every mission proven. */
function twoWeeks(profile: Profile, salt: string): { plans: DayPlan[]; leads: (TrackId | undefined)[] } {
  let record: RecordState = emptyRecord();
  const saved: Record<DayKey, DayPlan> = {};
  const plans: DayPlan[] = [];
  const leads: (TrackId | undefined)[] = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays('2026-10-19', i);
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt,
      history: historyFrom(record.missions ?? {}, saved, {}, day),
      hour: 9,
      program: null,
      adapt: learnFrom(saved, record.missions, MISSION_BY_ID, day),
    };
    leads.push(leadArea(input, profile.tracks));
    const plan = generatePlan(input);
    saved[day] = plan;
    plan.missions.forEach((p, k) => {
      const at = new Date(`${day}T${10 + k}:00:00`).getTime();
      record = completeMission(record, day, plan, MISSION_BY_ID[p.missionId], [], { status: 'accepted', method: 'on-device', checks: [], at }, { at, verifiedClock: true }).record;
    });
    plans.push(plan);
  }
  return { plans, leads };
}

describe('the pick shapes the plan as a matching goal would', () => {
  const base = me(['school', 'fitness', 'discipline'], { school: true, minutes: 45 });
  const areasOf = (plans: DayPlan[]) => plans.map(p => p.missions.map(m => m.area ?? MISSION_BY_ID[m.missionId]?.track));

  for (const salt of ['pick-0', 'pick-1']) {
    it(`"Get my life together" with Discipline leads and fills slots like "Stop procrastinating" (${salt})`, () => {
      const picked = twoWeeks({ ...base, goal: 'Get my life together', goalArea: 'discipline' }, salt);
      const named = twoWeeks({ ...base, goal: 'Stop procrastinating' }, salt);
      const plain = twoWeeks({ ...base, goal: 'Get my life together' }, salt);
      expect(picked.leads).toEqual(named.leads);
      expect(areasOf(picked.plans)).toEqual(areasOf(named.plans));
      // Without the pick the goal changes nothing: Discipline doesn't lead.
      expect(picked.leads.filter(l => l === 'discipline').length).toBeGreaterThan(plain.leads.filter(l => l === 'discipline').length);
    });
  }

  it('Day 1 leads with the picked area', () => {
    const p = me(['school', 'fitness', 'money'], { school: true, minutes: 30, goal: 'Buy a car', goalArea: 'money' });
    const input: PlanInput = { library: MISSIONS, profile: p, day: DAY, salt: 'day-1', history: { lastDone: {}, lastPlanned: {}, skips: {} }, hour: 9, program: null };
    expect(leadArea(input, p.tracks)).toBe('money');
    expect(leadArea({ ...input, profile: { ...p, goalArea: null } }, p.tracks)).toBeUndefined();
  });
});
