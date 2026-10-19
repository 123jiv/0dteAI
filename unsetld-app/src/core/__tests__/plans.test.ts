// Plans (programs.json) as a user runs them, and the validator's plan rules (P1-12). Every plan
// finishes in exactly its number of days through the real planner, on every day shape, proving
// what each day plans; and `npm run validate` rejects a plan that repeats another's days, is
// mostly another's missions, or runs under five or over fourteen days.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS, PROGRAMS } from '../../content';
import { completeMission } from '../complete';
import { DEFAULT_PROFILE, generatePlan, historyFrom, type PlanInput } from '../missions';
import { learnFrom } from '../personalize';
import { programMissions, programProgress, startProgram } from '../programs';
import { emptyRecord } from '../record';
import { addDays, type DayKey } from '../time';
import { missionTitle } from '../titles';
import type { DayPlan, Profile, Program, ProgramState, RecordState, TrackId } from '../types';

const SHAPES: Pick<Profile, 'minutes' | 'intensity'>[] = [
  { minutes: 15, intensity: 'lockin' },
  { minutes: 30, intensity: 'lockin' },
  { minutes: 45, intensity: 'lockin' },
  { minutes: 60, intensity: 'easy' },
  { minutes: 60, intensity: 'push' },
];
const START = '2026-10-19';

/** Runs a plan the way the store does: plan the day, prove everything in it, move the plan on. */
function run(p: Program, shape: Pick<Profile, 'minutes' | 'intensity'>) {
  const others = (['discipline', 'school', 'fitness'] as TrackId[]).filter(t => !p.tracks.includes(t));
  const tracks = [...p.tracks, ...others].slice(0, Math.max(3, p.tracks.length));
  const profile: Profile = { ...DEFAULT_PROFILE, ...shape, tracks, age: '16to17', school: true, schoolLevel: 'high', priority: null, gym: null, goal: null };
  let record: RecordState = emptyRecord();
  const plans: Record<DayKey, DayPlan> = {};
  let state: ProgramState = startProgram(p.id, START);
  const placedPerDay: number[] = [];
  let days = 0;
  for (let i = 0; i < p.days + 3 && !state.finishedDay; i++) {
    const day = addDays(START, i);
    const ids = programMissions(p, state, day);
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt: 'plans-test',
      history: historyFrom(record.missions ?? {}, plans, {}, day),
      hour: 9,
      program: ids.length ? { id: p.id, missionIds: ids } : null,
      adapt: learnFrom(plans, record.missions, MISSION_BY_ID, day),
    };
    const plan = generatePlan(input);
    plans[day] = plan;
    let provenPlanMission = false;
    plan.missions.forEach((pm, k) => {
      const m = MISSION_BY_ID[pm.missionId]!;
      const at = new Date(`${day}T${10 + k * 3}:00:00`).getTime();
      const verification = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at };
      record = completeMission(record, day, plan, m, [], verification, { at, verifiedClock: true, title: missionTitle(m, profile) }).record;
      if (pm.programId === p.id) provenPlanMission = true;
    });
    placedPerDay.push(plan.missions.filter(pm => pm.programId === p.id).length);
    if (provenPlanMission) state = programProgress(p, state, day);
    days++;
  }
  return { finished: state.finishedDay, days, placedPerDay };
}

describe('every plan finishes in its number of days', () => {
  for (const p of PROGRAMS) {
    it(`${p.title}: ${p.days} days on every day shape`, () => {
      for (const shape of SHAPES) {
        const r = run(p, shape);
        const label = `${p.id} at ${shape.minutes}/${shape.intensity}`;
        expect(r.finished, label).toBe(addDays(START, p.days - 1));
        expect(r.days, label).toBe(p.days);
        // Every day of it puts at least one of its missions in the day.
        expect(r.placedPerDay.every(n => n >= 1), label).toBe(true);
      }
    });
  }
});

describe('the validator’s plan rules', () => {
  const ROOT = join(__dirname, '..', '..', '..');
  const CONTENT = join(ROOT, 'src', 'content');
  const dirs: string[] = [];
  afterAll(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

  /** `npm run validate` on a copy of the content with programs.json replaced. */
  function validate(programs: unknown[]): { ok: boolean; out: string } {
    const dir = mkdtempSync(join(tmpdir(), 'unsetld-content-'));
    dirs.push(dir);
    cpSync(CONTENT, dir, { recursive: true });
    writeFileSync(join(dir, 'programs.json'), JSON.stringify(programs, null, 1));
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-content.mjs')], { env: { ...process.env, CONTENT_DIR: dir }, encoding: 'utf8' });
    return { ok: r.status === 0, out: `${r.stdout}\n${r.stderr}` };
  }
  const shipped = JSON.parse(readFileSync(join(CONTENT, 'programs.json'), 'utf8')) as Program[];
  const paid = (p: Partial<Program> & Pick<Program, 'id' | 'plan'>): Program => ({ title: 'Test Plan', short: 'A test.', tracks: ['school'], free: false, days: p.plan.length, ...p });

  it('the shipped plans pass', () => {
    const r = validate(shipped);
    expect(r.out).toContain('Content OK.');
    expect(r.ok).toBe(true);
  });

  it('rejects a plan with the same days as another', () => {
    const copy = { ...shipped.find(p => p.id === 'build-something')!, id: 'ship-something', title: 'Ship Something' };
    const r = validate([...shipped, copy]);
    expect(r.ok).toBe(false);
    expect(r.out).toMatch(/build-something and ship-something: the same days/);
  });

  it('rejects a plan that is mostly another plan’s missions, and allows a different one', () => {
    // School Reset's missions, reshuffled: 100% the same set.
    const school = shipped.find(p => p.id === 'school-reset')!;
    const reshuffled = paid({ id: 'school-again', plan: [...school.plan].reverse() });
    const r = validate([...shipped, reshuffled]);
    expect(r.ok).toBe(false);
    expect(r.out).toMatch(/school-reset and school-again: 100% the same missions/);

    // The plus audit's Exam Week: 0.73 overlap with School Reset, under the line.
    const exam = paid({ id: 'exam-week', title: 'Exam Week', plan: [['S12', 'S4'], ['S11'], ['S9', 'S2'], ['S3', 'S7'], ['S15', 'S10'], ['S11'], ['S9', 'S4']] });
    expect(validate([...shipped, exam]).ok).toBe(true);
  });

  it('a plan runs five to fourteen days', () => {
    const four = paid({ id: 'four-days', tracks: ['money'], plan: [['M2', 'M1'], ['M5'], ['M3'], ['M6']] });
    const r4 = validate([...shipped, four]);
    expect(r4.ok).toBe(false);
    expect(r4.out).toMatch(/four-days: must run 5–14 days \(has 4\)/);

    const fifteenDays = Array.from({ length: 15 }, (_, i) => [['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K9', 'K10'][i % 9]!]);
    const r15 = validate([...shipped, paid({ id: 'fifteen-days', tracks: ['skills'], plan: fifteenDays })]);
    expect(r15.ok).toBe(false);
    expect(r15.out).toMatch(/fifteen-days: must run 5–14 days \(has 15\)/);

    const fourteen = paid({ id: 'fourteen-days', tracks: ['skills'], plan: fifteenDays.slice(0, 14) });
    const r14 = validate([...shipped, fourteen]);
    expect(r14.out).not.toMatch(/fourteen-days: must run/);
    expect(r14.ok).toBe(true);
  });
});
