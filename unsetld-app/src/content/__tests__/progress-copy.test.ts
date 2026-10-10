import { describe, expect, it } from 'vitest';
import { HOME } from '../copy/home';
import { PROGRESS } from '../copy/progress';

const P = PROGRESS.screen;

describe('dates on Progress say the year when it is not this one', () => {
  it('this year: day and month only', () => {
    expect(PROGRESS.date('2026-10-14', '2026-10-14')).toBe('14 Oct');
    expect(PROGRESS.date('2026-01-02', '2026-12-31')).toBe('2 Jan');
    expect(PROGRESS.date('2026-10-14')).toBe('14 Oct');
  });

  it('another year: the year after the month', () => {
    expect(PROGRESS.date('2025-10-14', '2026-10-14')).toBe('14 Oct 2025');
    expect(PROGRESS.date('2025-12-31', '2026-01-01')).toBe('31 Dec 2025');
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
  });
});

describe('XP reads the same way on Progress and Stats', () => {
  it('Progress: XP into the level, toward the next one', () => {
    expect(P.xp(75, 150, 3)).toBe('75 / 150 XP to level 4');
  });

  it('Stats: the total, said as one', () => {
    expect(PROGRESS.stats.areaLine(20, 225, 6 * 3600 + 5 * 60)).toBe('20 missions · 225 XP total · 6h 5m invested');
    expect(PROGRESS.stats.a11yArea('School', 3, 20, 225, 0)).toContain('225 XP total');
  });
});

describe('the Off Day line under this week', () => {
  it('names the day, and the streak only while it is still going', () => {
    expect(P.weekOff(['Tuesday'], true)).toBe('An Off Day covered Tuesday. Your streak is still going.');
    expect(P.weekOff(['Tuesday'], false)).toBe('An Off Day covered Tuesday.');
    expect(P.weekOff(['Tuesday', 'Thursday'], true)).toBe('Off Days covered Tuesday and Thursday. Your streak is still going.');
  });
});

describe('a 2.x record with days on record and nothing proven since', () => {
  it('Progress says the days are on record', () => {
    expect(P.before.title(41)).toBe('Your 41 days from before missions are on record.');
    expect(P.before.title(1)).toBe('Your 1 day from before missions is on record.');
  });

  it('Today says them in place of Day 1’s line', () => {
    expect(HOME.stats.before(41)).toBe('41 days on record. Your next mission starts your streak.');
    expect(HOME.stats.before(1)).toBe('1 day on record. Your next mission starts your streak.');
    expect(HOME.stats.before(1200)).toBe('1,200 days on record. Your next mission starts your streak.');
  });
});

describe('the mission card for an evening mission', () => {
  it('says tonight, to VoiceOver too', () => {
    expect(HOME.a11y.cardMeta('School', 5, 5, 'PHOTO', true)).toMatch(/^School, 5 minutes, for tonight, 5 points, /);
    expect(HOME.a11y.cardMeta('School', 5, 5, 'PHOTO')).not.toContain('tonight');
  });
});

describe('milestone moments', () => {
  it('state what was reached: no claims about other people, nothing tied to the day it was reached', () => {
    for (const { line } of Object.values(PROGRESS.moment.byKey)) {
      expect(line).not.toMatch(/!|tomorrow|most people/i);
    }
  });
});
