// The area a planned mission shows: the one the plan recorded, so "Work on Your Portfolio"
// picked for Projects says Projects (its row, its swap), never Career for a user who didn't
// choose Career. Plans from earlier builds fall back to the first chosen area it serves.
import { describe, expect, it, vi } from 'vitest';
import type { DayPlan } from '../../core/types';
import { MISSION_BY_ID } from '../../content';
import { missionsOf, plannedArea } from '../missions';

// vi.hoisted and vi.mock run before the imports above.
vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({ appStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const portfolio = MISSION_BY_ID['career-portfolio']; // Career, also Projects and Skills

describe('planned area', () => {
  it('uses the area the plan recorded', () => {
    expect(portfolio).toBeDefined();
    expect(plannedArea({ area: 'projects' }, portfolio, ['skills', 'projects'])).toBe('projects');
  });

  it("falls back to the first of the user's areas it serves, then its own", () => {
    expect(plannedArea({}, portfolio, ['fitness', 'skills', 'projects'])).toBe('skills');
    expect(plannedArea(undefined, portfolio, ['fitness'])).toBe('career');
  });

  it("gives Home's rows their area, and skips missions the library no longer has", () => {
    const plan: DayPlan = {
      day: '2026-10-10',
      missions: [
        { slot: 'main', missionId: 'career-portfolio', area: 'projects' },
        { slot: 'easy', missionId: 'focus-plan-tomorrow-tonight' }, // a 3.0 preview mission, gone
        { slot: 'main', missionId: 'career-skill-30' }, // an earlier build's plan: no area
      ],
      rerolls: 0,
      replaced: [],
    };
    const rows = missionsOf(plan, undefined, ['skills', 'projects']);
    expect(rows.map(r => [r.index, r.mission.id, r.area])).toEqual([
      [0, 'career-portfolio', 'projects'],
      [2, 'career-skill-30', 'skills'],
    ]);
  });
});
