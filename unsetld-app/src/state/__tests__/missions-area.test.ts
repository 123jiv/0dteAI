// The area a planned mission shows: the one the plan recorded, so a mission picked for one of
// the user's areas says that area (its row, its swap), never one they didn't choose. Plans from
// earlier builds fall back to the first chosen area it serves, then its own.
import { describe, expect, it, vi } from 'vitest';
import type { DayPlan, Mission } from '../../core/types';
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

const portfolio = MISSION_BY_ID['C4']; // Improve One Part of Your Portfolio (Career)
// A mission may serve more than one area (Mission.also); none of the approved ones does.
const shared: Pick<Mission, 'track' | 'also'> = { track: 'career', also: ['projects', 'skills'] };

describe('planned area', () => {
  it('uses the area the plan recorded', () => {
    expect(portfolio).toBeDefined();
    expect(plannedArea({ area: 'career' }, portfolio, ['skills', 'career'])).toBe('career');
    expect(plannedArea({ area: 'projects' }, shared, ['skills', 'projects'])).toBe('projects');
  });

  it("falls back to the first of the user's areas it serves, then its own", () => {
    expect(plannedArea({}, shared, ['fitness', 'skills', 'projects'])).toBe('skills');
    expect(plannedArea(undefined, shared, ['fitness'])).toBe('career');
    expect(plannedArea(undefined, portfolio, ['fitness', 'career'])).toBe('career');
  });

  it("gives Home's rows their area, and skips missions that aren't approved or the user's own", () => {
    const plan: DayPlan = {
      day: '2026-10-10',
      missions: [
        { slot: 'main', missionId: 'C4', area: 'career' },
        { slot: 'easy', missionId: 'focus-plan-tomorrow-tonight' }, // a 3.0 preview mission, gone
        { slot: 'main', missionId: 'career-skill-30', area: 'career' }, // retired in 3.3
        { slot: 'main', missionId: 'P1' }, // an earlier build's plan: no area
      ],
      rerolls: 0,
      replaced: [],
    };
    const rows = missionsOf(plan, undefined, ['skills', 'projects']);
    expect(rows.map(r => [r.index, r.mission.id, r.area])).toEqual([
      [0, 'C4', 'career'],
      [3, 'P1', 'projects'],
    ]);
  });
});
