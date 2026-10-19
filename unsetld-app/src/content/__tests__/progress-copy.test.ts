import { describe, expect, it } from 'vitest';
import type { DayMark } from '../../core/history';
import { levelFor } from '../../core/progress';
import { HOME } from '../copy/home';
import { PROGRESS } from '../copy/progress';

const R = PROGRESS.record;
const D = PROGRESS.day;
const TODAY = '2026-10-12';

const mark = (day: string, extra: Partial<DayMark> = {}): DayMark => ({
  day,
  date: Number(day.slice(8)),
  proven: 0,
  planned: null,
  level: 'none',
  covered: false,
  legacy: false,
  when: day === TODAY ? 'today' : day > TODAY ? 'future' : 'past',
  ...extra,
});

describe('dates on the Record say the year when it is not this one', () => {
  it('this year: day and month only', () => {
    expect(PROGRESS.date('2026-10-14', '2026-10-14')).toBe('14 Oct');
    expect(PROGRESS.date('2026-01-02', '2026-12-31')).toBe('2 Jan');
    expect(PROGRESS.date('2026-10-14')).toBe('14 Oct');
    expect(PROGRESS.longDate('2026-10-07', TODAY)).toBe('October 7');
  });

  it('another year: the year after the month', () => {
    expect(PROGRESS.date('2025-10-14', '2026-10-14')).toBe('14 Oct 2025');
    expect(PROGRESS.date('2025-12-31', '2026-01-01')).toBe('31 Dec 2025');
    expect(PROGRESS.longDate('2025-12-31', '2026-01-01')).toBe('December 31, 2025');
    expect(PROGRESS.month('2025-12', '2026')).toBe('December 2025');
    expect(PROGRESS.month('2026-10', '2026')).toBe('October');
  });

  it('reaches every line that names a day', () => {
    const today = '2026-10-14';
    expect(PROGRESS.moment.reached('2025-10-14', today)).toBe('Reached 14 Oct 2025');
    expect(PROGRESS.moment.a11yDate('2026-09-20', today)).toBe('Reached 20 Sep');
    expect(PROGRESS.stats.activeSince(330, '2025-10-14', today)).toBe('330 days since 14 Oct 2025');
    expect(PROGRESS.stats.a11yBarcode(330, '2025-10-14', today)).toBe('330 active days since 14 Oct 2025.');
    expect(PROGRESS.achievements.a11yReached('First mission', '2025-10-14', today)).toBe('First mission. Reached 14 Oct 2025.');
    expect(PROGRESS.history.proven('9:47 AM', '2025-10-14', today, 15)).toBe('Proven 9:47 AM · 14 Oct 2025 · +15 pts');
    expect(PROGRESS.history.a11yTile('Study for 30 Minutes', 'School', '2025-10-14', today, 'cleared')).toBe(
      'Study for 30 Minutes, School, proven 14 Oct 2025, photo cleared.',
    );
    expect(D.title('2025-10-07', today)).toBe('October 7, 2025');
    expect(R.a11yDay(mark('2025-10-07', { proven: 1, level: 'one' }), today)).toBe('October 7, 2025, 1 mission proven');
  });
});

describe('the Record tab', () => {
  it('is called Record, and shares your record', () => {
    expect(R.title).toBe('Record');
    expect(R.share).toBe('Share your record');
  });

  it('reads each day on the grid as one sentence', () => {
    expect(R.a11yDay(mark('2026-10-07', { proven: 3, planned: 3, level: 'perfect' }), TODAY)).toBe('October 7, perfect day, 3 of 3 proven');
    expect(R.a11yDay(mark('2026-10-09', { proven: 1, level: 'one' }), TODAY)).toBe('October 9, 1 mission proven');
    expect(R.a11yDay(mark('2026-10-10', { proven: 2, planned: 3, level: 'two' }), TODAY)).toBe('October 10, 2 of 3 proven');
    expect(R.a11yDay(mark(TODAY), TODAY)).toBe('October 12, today, nothing proven yet');
    expect(R.a11yDay(mark(TODAY, { proven: 1, planned: 3, level: 'one' }), TODAY)).toBe('October 12, today, 1 of 3 proven');
    expect(R.a11yDay(mark('2026-10-08'), TODAY)).toBe('October 8, missed');
    expect(R.a11yDay(mark('2026-10-08', { covered: true }), TODAY)).toBe('October 8, covered by an Off Day');
    expect(R.a11yDay(mark('2026-10-02'), TODAY, { before: true })).toBe('October 2, before your record');
    expect(R.a11yDay(mark('2026-10-03', { legacy: true, level: 'one' }), TODAY)).toBe('October 3, on record from before missions');
    expect(R.a11yDay(mark('2026-10-20'), TODAY)).toBe('October 20, still to come');
    expect(R.a11yDay(mark(TODAY), TODAY, { weekday: true })).toBe('Monday, October 12, today, nothing proven yet');
  });

  it('sums up the month and the record without a zero or a 0 day streak', () => {
    // The month's missions proven out of what its proven days held (core/progress completionIn).
    expect(R.summary(18, 42, 51)).toBe('18 days proven · 42 of 51 missions');
    expect(R.summary(1, 1, 1)).toBe('1 day proven · 1 of 1 mission');
    expect(R.summary(1, 2, 0)).toBe('1 day proven · 2 of 2 missions');
    expect(R.momentum(12, 30)).toBe('12 day streak · 30 days on record');
    expect(R.momentum(1, 1)).toBe('1 day streak · 1 day on record');
    expect(R.momentum(0, 4)).toBe('Prove a mission today to start a streak · 4 days on record');
    expect(R.momentum(0, 0)).not.toMatch(/\b0\b/);
    expect(R.a11ySummary(18, 42, 51, 12, 30)).toBe('This month, 18 days proven, 42 of 51 missions proven. 12 day streak. 30 days on record.');
    // A 2.x record with nothing proven since: no "0 days proven".
    expect(R.a11ySummary(0, 0, 0, 0, 0)).toBe('Prove a mission today to start a streak.');
  });

  it('starts Day 1 with one line and one button, no numbers', () => {
    expect(R.start.line).toBe('Your first proven mission starts your record.');
    expect(R.start.action).toBe('Start today');
    expect(R.start.line).not.toMatch(/\d/);
  });

  it('keeps the key under the grid short', () => {
    expect(Object.values(R.legend)).toEqual(['1 mission', '2', 'Perfect day', 'Off Day']);
    expect(R.letters).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });
});

describe('area progress reads in points: no second currency', () => {
  it('the Record: level, points into the level, missions and time', () => {
    expect(R.level(7)).toBe('Level 7');
    expect(R.areaPoints(430, 500)).toBe('430 / 500');
    expect(R.areaPoints(0, 50)).toBe('0 / 50');
    expect(R.areaPoints(1250, 1500)).toBe('1,250 / 1,500');
    expect(R.areaMeta(18, 8 * 3600 + 24 * 60)).toBe('18 missions · 8h 24m');
    expect(R.areaMeta(1, 0)).toBe('1 mission');
    expect(R.areaMeta(10, 5 * 3600)).toBe('10 missions · 5h');
    expect(R.a11yArea('Projects', 7, 430, 500, 18, 8 * 3600 + 24 * 60)).toBe(
      'Projects, level 7. 430 of 500 toward level 8. 18 missions proven, 8 hours 24 minutes invested.',
    );
    expect(R.a11yArea('Fitness', 1, 0, 50, 0, 0)).toBe('Fitness, level 1. 0 of 50 toward level 2.');
  });

  it('the numbers start over at each new level, as the meter does', () => {
    const fresh = levelFor(0);
    expect(R.areaPoints(fresh.into, fresh.span)).toBe('0 / 50');
    // Just levelled up to 3 (150 points in all): the level's own points, not the total.
    const up = levelFor(150);
    expect(up.level).toBe(3);
    expect(R.areaPoints(up.into, up.span)).toBe('0 / 150');
    const mid = levelFor(225);
    expect(R.areaPoints(mid.into, mid.span)).toBe('75 / 150');
  });

  it('Stats: the total, said as one', () => {
    expect(PROGRESS.stats.areaLine(20, 225, 6 * 3600 + 5 * 60)).toBe('20 missions · 225 pts · 6h 5m invested');
    expect(PROGRESS.stats.a11yArea('School', 3, 20, 225, 0)).toContain('225 points');
  });

  it('Stats keeps a way back to the weekly review', () => {
    expect(PROGRESS.stats.review).toBe('Weekly review');
  });

  it('never says XP on the Record', () => {
    const lines = [R.areaPoints(430, 500), R.areaMeta(18, 600), R.a11yArea('School', 3, 225, 300, 20, 600), PROGRESS.stats.areaLine(20, 225, 600)];
    for (const line of lines) expect(line).not.toMatch(/XP/);
  });
});

describe("a day's page", () => {
  const status = (proven: number, planned: number | null, perfect = false, extra: { legacy?: boolean; today?: boolean } = {}) =>
    D.status({ proven, planned, perfect, legacy: extra.legacy ?? false, today: extra.today ?? false });

  it('says how the day went in a few words', () => {
    expect(status(3, 3, true)).toBe('3 / 3 · Perfect day');
    expect(status(2, 3)).toBe('2 / 3 proven');
    expect(status(1, null)).toBe('1 mission proven');
    expect(status(2, null)).toBe('2 missions proven');
    expect(status(0, null, false, { legacy: true })).toBe('On record from before missions');
    expect(status(0, 3, false, { today: true })).toBe('Nothing proven yet today');
  });

  it('numbers the day and adds up its points', () => {
    expect(D.number(12)).toBe('Day 12');
    expect(D.title('2026-10-07', TODAY)).toBe('October 7');
    expect(D.plus(15)).toBe('+15');
    expect(D.meta('School', '9:42 AM')).toBe('School · 9:42\u00A0AM');
    expect(D.meta('', '9:42 AM')).toBe('9:42\u00A0AM');
    expect(D.a11yRow('Study for 30 Minutes', 'School', '9:42 AM', 15)).toBe('Study for 30 Minutes. School, proven 9:42 AM, 15 points.');
    expect(D.a11yOpen('Complete Your Workout', true)).toBe('Complete Your Workout, still to do.');
    expect(D.a11yOpen('Complete Your Workout', false)).toBe('Complete Your Workout, not proven.');
    expect(D.a11yTotal(55)).toBe('Total, 55 points.');
  });
});

describe('Proof history', () => {
  it('shows a timer proof as a clock, past an hour too', () => {
    expect(PROGRESS.clock(25 * 60)).toBe('25:00');
    expect(PROGRESS.clock(65)).toBe('1:05');
    expect(PROGRESS.clock(3 * 3600)).toBe('3:00:00');
    expect(PROGRESS.clock(3600 + 5 * 60 + 9)).toBe('1:05:09');
  });

  it('names its sections and a way to the day', () => {
    expect(PROGRESS.history.a11ySection('Study for 30 Minutes', 12)).toBe('Study for 30 Minutes, 12 proofs');
    expect(PROGRESS.history.a11ySection('School', 1)).toBe('School, 1 proof');
    expect(Object.values(PROGRESS.history.by)).toEqual(['Date', 'Mission', 'Area']);
    expect(PROGRESS.history.openDay).toBe('Open this day');
  });
});

describe('the mission card for an evening mission', () => {
  it('says tonight, to VoiceOver too', () => {
    expect(HOME.a11y.cardMeta('School', 5, 5, 'PHOTO', true)).toMatch(/^School, 5 minutes, for tonight, 5 points, /);
    expect(HOME.a11y.cardMeta('School', 5, 5, 'PHOTO')).not.toContain('tonight');
  });
});

describe('completion (Stats, the weekly review)', () => {
  const S = PROGRESS.stats;
  const W = PROGRESS.review;

  it('Stats: the percent, then missions proven out of planned, perfect days only when there are some', () => {
    expect(S.completion).toBe('Completion');
    expect(S.week).toBe('This week');
    expect(S.month).toBe('Last 30 days');
    expect(S.percent(76)).toBe('76%');
    expect(S.completionLine(13, 17, 3)).toBe('13 of 17 missions proven · 3 perfect days');
    expect(S.completionLine(1, 1, 1)).toBe('1 of 1 mission proven · 1 perfect day');
    expect(S.completionLine(2, 6, 0)).toBe('2 of 6 missions proven');
    expect(S.a11yCompletion('This week', 76, 13, 17, 3)).toBe('This week, 76 percent: 13 of 17 missions proven, 3 perfect days.');
    expect(S.a11yCompletion('Last 30 days', 33, 2, 6, 0)).toBe('Last 30 days, 33 percent: 2 of 6 missions proven.');
    expect(S.completionNote).toBe('Counted on the days you showed up.');
    expect(S.perfect).toBe('Perfect days');
    expect(S.plans).toBe('Plans finished');
  });

  it('the weekly review: "13 / 17" missions proven, and the days proven', () => {
    expect(W.missions).toBe('Missions proven');
    expect(W.missionsValue(13, 17)).toBe('13 / 17');
    expect(W.missionsValue(4, 3)).toBe('4 / 4');
    expect(W.days).toBe('Days proven');
    expect(W.a11y(13, 17, 5, 130, 340, 3)).toBe('13 of 17 missions proven, 5 days proven, 2 hours 10 minutes on the focus timer, 340 points, 3 perfect days.');
    expect(W.a11y(1, 1, 1, 0, 5, 0)).toBe('1 of 1 mission proven, 1 day proven, 5 points.');
  });

  it('says no zero and no "!" when there is something to count', () => {
    const lines = [
      S.completionLine(1, 3, 0),
      S.a11yCompletion('This week', 33, 1, 3, 0),
      S.percent(1),
      W.missionsValue(1, 3),
      W.a11y(1, 3, 1, 0, 5, 0),
      R.summary(1, 1, 3),
      R.a11ySummary(1, 1, 3, 1, 1),
    ];
    for (const line of lines) {
      expect(line).not.toMatch(/(^|[^\d])0(?![\d])/);
      expect(line).not.toContain('!');
    }
  });
});

describe('milestone moments', () => {
  it('state what was reached: no claims about other people, nothing tied to the day it was reached', () => {
    for (const { line } of Object.values(PROGRESS.moment.byKey)) {
      expect(line).not.toMatch(/!|tomorrow|most people/i);
    }
  });
});
