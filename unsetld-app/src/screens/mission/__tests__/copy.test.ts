// Mission copy: the lock-in screen START opens (THE RECORD, "Start should mean start"), the
// done stage's record moment ("I showed up": points secondary) and what VoiceOver says.
import { describe, expect, it } from 'vitest';
import { MISSION } from '../../../content/copy/mission';

const NB = ' ';

describe('the lock-in screen', () => {
  it('says how long, one line while it runs, and what to do when the time is up', () => {
    expect(MISSION.timer.lockIn(30)).toBe('Lock in for 30 minutes');
    expect(MISSION.timer.lockIn(1)).toBe('Lock in for 1 minute');
    expect(MISSION.timer.stay).toBe('Stay here. Get it done.');
    expect(MISSION.timer.paused).toBe('Paused.');
    expect(MISSION.timer.time).toBe('Time.');
    expect(MISSION.button.takeProof).toBe('Take proof');
    expect(MISSION.button.prove).toBe('Prove it');
  });

  it('VoiceOver hears what comes next at zero', () => {
    expect(MISSION.timer.timeSaid(true)).toBe('Time. Take proof.');
    expect(MISSION.timer.timeSaid(false)).toBe('Time. Prove it.');
  });

  it('the timer-done notification asks for the same thing as the button', () => {
    expect(MISSION.notify.body('30:00', 'TIMER_AND_PHOTO')).toBe('30:00 done. Take proof.');
    expect(MISSION.notify.body('30:00', 'TIMER')).toBe('30:00 done. Open the mission and prove it.');
  });

  it('no more paragraphs about coming back', () => {
    const t = MISSION.timer as Record<string, unknown>;
    expect(t.line).toBeUndefined();
    expect(t.lineNoRing).toBeUndefined();
  });
});

describe('a photo mission’s page', () => {
  it('DO IT over the one instruction', () => {
    expect(MISSION.detail.doIt).toBe('Do it');
    expect(MISSION.button.before).toBe('Take the before photo');
    expect(MISSION.button.after).toBe('Take the after photo');
  });
});

describe('the done stage', () => {
  it('the points are small and plain', () => {
    expect(MISSION.done.pts(15)).toBe(`+15${NB}pts`);
    expect(MISSION.done.pts(1)).toBe(`+1${NB}pt`);
    expect(MISSION.done.pts(1200)).toBe(`+1,200${NB}pts`);
  });

  it('the record moment: the day added, the count, the perfect day and the streak', () => {
    expect(MISSION.done.dayAdded(12)).toBe('Day 12 added to your record.');
    expect(MISSION.done.count(1, 3)).toBe('1 / 3');
    expect(MISSION.done.today).toBe('today');
    expect(MISSION.done.perfect).toBe('Perfect day');
    expect(MISSION.done.bonus(15)).toBe('+15 bonus');
    expect(MISSION.done.streak(1)).toBe('Streak started');
    expect(MISSION.done.streak(12)).toBe('12 day streak');
    expect(MISSION.done.weekdays).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('the next reward, secondary', () => {
    expect(MISSION.done.toNext(220)).toBe(`220${NB}pts to next reward`);
    expect(MISSION.done.toNext(1)).toBe(`1${NB}pt to next reward`);
    expect(MISSION.done.ready('10% off')).toBe('10% off is ready');
  });

  it('the area line has no second currency', () => {
    expect(MISSION.done.level('School', 3)).toBe('School · Level 3');
    expect(MISSION.done.area(15, 'Fitness', 2)).toBe('+15 to Fitness · Level 2');
    expect(MISSION.a11y.area(15, 'Fitness', 2)).toBe('Plus 15 to Fitness. Level 2.');
    expect(MISSION.a11y.level('School', 3, 5, 150)).toBe('School is now level 3. 5 of 150 to level 4.');
    expect((MISSION.done as Record<string, unknown>).xp).toBeUndefined();
  });

  it('one button: Continue', () => {
    expect(MISSION.button.continue).toBe('Continue');
    expect(MISSION.done.share).toBe('Share today');
  });
});

describe('what the done stage says as it opens', () => {
  it('the first proof of the day: proven, the day added, the count, the streak, the reward', () => {
    expect(
      MISSION.a11y.done({
        points: 15,
        day: MISSION.done.dayAdded(12),
        today: MISSION.a11y.today(1, 3, false),
        streak: MISSION.done.streak(12),
        reward: MISSION.a11y.toNext(205, '10% off'),
      }),
    ).toBe('Proven. Plus 15 points. Day 12 added to your record. 1 of 3 today. 12 day streak. 205 points to next reward, 10% off.');
  });

  it('a perfect day: the bonus after the streak, then the reward and a new level', () => {
    expect(
      MISSION.a11y.done({
        points: 10,
        today: MISSION.a11y.today(3, 3, true),
        bonus: MISSION.a11y.bonus(15),
        reward: MISSION.a11y.ready('5% off'),
        level: MISSION.a11y.levelSaid('School', 3),
      }),
    ).toBe('Proven. Plus 10 points. 3 of 3 today. Perfect day. Plus 15 bonus points. 5% off is ready. School is now level 3.');
  });

  it('Day 1, rewards off: the streak starts, no reward line', () => {
    expect(
      MISSION.a11y.done({ points: 1, day: MISSION.done.dayAdded(1), today: MISSION.a11y.today(1, 3, false), streak: MISSION.done.streak(1), reward: null }),
    ).toBe('Proven. Plus 1 point. Day 1 added to your record. 1 of 3 today. Streak started.');
  });

  it('not counted, with what failed', () => {
    expect(MISSION.a11y.rejected(['Finish the timer first.'])).toBe('Not counted. Finish the timer first.');
    expect(MISSION.a11y.rejected([])).toBe('Not counted.');
  });
});

describe('the week row, one sentence a day', () => {
  const day = (o: Partial<Parameters<typeof MISSION.a11y.day>[1]>) =>
    MISSION.a11y.day('Wednesday', { when: 'past', proven: 0, perfect: false, covered: false, legacy: false, before: false, ...o });

  it('says what each day holds', () => {
    expect(day({ when: 'today', proven: 1 })).toBe('Wednesday, today, 1 mission proven');
    expect(day({ proven: 2 })).toBe('Wednesday, 2 missions proven');
    expect(day({ proven: 3, perfect: true })).toBe('Wednesday, perfect day');
    expect(day({ covered: true })).toBe('Wednesday, Off Day, streak kept');
    expect(day({ legacy: true })).toBe('Wednesday, on your record');
    expect(day({ before: true })).toBe('Wednesday, before your record');
    expect(day({})).toBe('Wednesday, nothing proven');
    expect(day({ when: 'future' })).toBe('Wednesday, to come');
  });
});

describe('plain voice', () => {
  it('no exclamation marks, never AI, no XP', () => {
    const lines = [
      MISSION.timer.lockIn(30),
      MISSION.timer.stay,
      MISSION.timer.ring,
      MISSION.timer.timeSaid(true),
      MISSION.done.dayAdded(3),
      MISSION.done.streak(4),
      MISSION.done.area(10, 'School', 2),
      MISSION.done.level('School', 2),
      MISSION.a11y.level('School', 2, 0, 100),
      MISSION.a11y.area(10, 'School', 2),
      MISSION.a11y.done({ points: 10, today: MISSION.a11y.today(1, 3, false), streak: 'Streak started' }),
      MISSION.notify.body('25:00', 'TIMER'),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/!/);
      expect(l).not.toMatch(/\bAI\b/);
      expect(l).not.toMatch(/\bXP\b/);
    }
  });
});
