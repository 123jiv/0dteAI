// The reminders name each mission as Today does: the approved title with the user's goal filled
// in (core/titles), and never a mission retired in 3.3. expo-notifications and react-native are
// stubbed so the text can be checked in node.
import { describe, expect, it, vi } from 'vitest';
import { HOME } from '../../content/copy/home';
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

// Today's reminders card shows right after the day's first proof and says when they stop: that
// has to match what's scheduled (UX review 2).
describe('when reminders stop', () => {
  const now = new Date(2026, 9, 22, 13, 0, 0);
  const day = (proven: boolean[]) => ({
    remindersOn: true,
    count: 3,
    first: 7 * 60,
    last: 22 * 60,
    perDay: 2,
    streak: 1,
    seed: 's',
    plans: { '2026-10-22': reminderMissions(['F1', 'M1'], () => false).map((m, i) => ({ ...m, proven: proven[i] })) },
  });
  const today = (proven: boolean[]) => composePlan(day(proven), now).filter(p => p.day === '2026-10-22');

  it('not at the first proof: a day with one of two proven still gets them', () => {
    expect(today([true, false]).length).toBeGreaterThan(0);
  });

  it('once every mission is proven, as the card says', () => {
    expect(today([true, true])).toEqual([]);
    expect(HOME.remindersCard.body(3, '7:00 AM', '10:00 PM')).toMatch(/None once every mission is proven\.$/);
  });
});
