// The reminders name each mission as Today does: the approved title with the user's goal filled
// in (core/titles), and never a mission retired in 3.3. expo-notifications and react-native are
// stubbed so the text can be checked in node.
import { describe, expect, it, vi } from 'vitest';
// vi.mock below runs before this import.
import { composePlan, reminderMissions } from '../notifications';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-notifications', () => ({}));

const BRAND = { goal: 'Launch my clothing brand', skills: [] };

describe('reminder titles', () => {
  it('fill the goal into the approved title, and keep the mission id', () => {
    const ms = reminderMissions(['P1', 'D1'], () => false, BRAND);
    expect(ms).toEqual([
      { id: 'P1', title: 'Work on Your Clothing Brand for 30 Minutes', minutes: 30, proven: false },
      { id: 'D1', title: 'Lock In for 30 Minutes', minutes: 30, proven: false },
    ]);
  });

  it('keep the approved title when the goal names nothing to fill in, or without a profile', () => {
    expect(reminderMissions(['P1'], () => false, { goal: 'Get stronger', skills: [] })[0].title).toBe('Work on Your Project for 30 Minutes');
    expect(reminderMissions(['P1'], () => false)[0].title).toBe('Work on Your Project for 30 Minutes');
  });

  it('never name a retired mission', () => {
    expect(reminderMissions(['school-study-30', 'S1'], () => false, BRAND).map(m => m.id)).toEqual(['S1']);
  });

  it('carry into the first reminder of the day', () => {
    const now = new Date(2026, 9, 15, 6, 0, 0);
    const plans = { '2026-10-15': reminderMissions(['P1', 'S1'], () => false, BRAND) };
    const out = composePlan({ remindersOn: true, count: 2, first: 9 * 60, last: 20 * 60, plans, perDay: 2, streak: 0, seed: 's' }, now);
    expect(out[0]?.body).toBe('Today: Work on Your Clothing Brand for 30 Minutes, Study One Subject for 30 Minutes.');
  });
});
