// Mission copy added for R12 (what VoiceOver says), R19 (the timer line) and R31 (area levels).
import { describe, expect, it } from 'vitest';
import { MISSION } from '../../../content/copy/mission';

describe('the timer line', () => {
  it('says when to come back when nothing will ring', () => {
    expect(MISSION.timer.lineNoRing(25)).toBe('Phone down. Come back in 25 minutes.');
    expect(MISSION.timer.lineNoRing(1)).toBe('Phone down. Come back in 1 minute.');
    expect(MISSION.timer.line).toBe('Phone down. Come back when it rings.');
  });
});

describe('what the done stage says', () => {
  it('the final numbers, not the count-up', () => {
    expect(MISSION.a11y.done({ points: 15, reward: MISSION.a11y.toReward(205, '10% off'), streak: MISSION.done.streak(12) })).toBe(
      'Proven. Plus 15 points. 205 points to 10% off. Streak: 12 days.',
    );
  });

  it('a perfect day and a new level', () => {
    expect(
      MISSION.a11y.done({
        points: 10,
        reward: MISSION.a11y.ready('5% off'),
        perfect: MISSION.a11y.perfect(3, 3, 15),
        streak: MISSION.done.streakFirst(1),
        level: MISSION.a11y.levelSaid('School', 3),
      }),
    ).toBe('Proven. Plus 10 points. 5% off is ready. 3 of 3. Perfect day. Plus 15 bonus points. Streak started. School is now level 3.');
  });

  it('rewards off: no reward line', () => {
    expect(MISSION.a11y.done({ points: 1, reward: null, streak: MISSION.done.streak(1) })).toBe('Proven. Plus 1 point. Streak: 1 day.');
  });

  it('not counted, with what failed', () => {
    expect(MISSION.a11y.rejected(['Finish the timer first.'])).toBe('Not counted. Finish the timer first.');
    expect(MISSION.a11y.rejected([])).toBe('Not counted.');
  });
});

describe('the area line', () => {
  it('a new level, and the quiet XP line', () => {
    expect(MISSION.done.level('School', 3)).toBe('School · Level 3');
    expect(MISSION.done.xp(15, 'Fitness', 2)).toBe('+15 XP · Fitness · Level 2');
    expect(MISSION.a11y.level('School', 3, 5, 150)).toBe('School is now level 3. 5 of 150 XP to level 4.');
  });

  it('plain voice: no exclamation marks, never AI', () => {
    const lines = [
      MISSION.timer.lineNoRing(10),
      MISSION.done.level('School', 2),
      MISSION.done.xp(10, 'School', 2),
      MISSION.a11y.level('School', 2, 0, 100),
      MISSION.a11y.xp(10, 'School', 2),
      MISSION.a11y.done({ points: 10, streak: 'Streak started.' }),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/!/);
      expect(l).not.toMatch(/\bAI\b/);
    }
  });
});
