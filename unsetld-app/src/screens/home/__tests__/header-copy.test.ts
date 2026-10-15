// Today's header (THE RECORD, "Today also needs a stronger loop"): status at a glance, no
// sentences; START as its own control; the weekly focus question kept light.
import { describe, expect, it } from 'vitest';
import { FOCUS } from '../../../content/copy/focus';
import { HOME } from '../../../content/copy/home';

const NB = ' ';

describe('the header says status, not sentences', () => {
  it('a number and its unit: "12 day streak", "380 pts", "0 day streak" after a break', () => {
    expect(HOME.day(12)).toBe('DAY 12');
    expect(HOME.stats.streak).toBe('day streak');
    expect(HOME.stats.points).toBe('pts');
    expect(HOME.stats.a11yStreak(0)).toBe('0 day streak');
    expect(HOME.stats.a11yStreak(1)).toBe('1 day streak');
    expect(HOME.stats.a11yPoints(380)).toBe('380 points');
  });

  it('no sentence in place of the streak', () => {
    const stats = HOME.stats as Record<string, unknown>;
    expect(stats.first).toBeUndefined();
    expect(stats.restart).toBeUndefined();
    expect(stats.before).toBeUndefined();
  });

  it('the next reward in one line, named for VoiceOver', () => {
    expect(HOME.reward.toNext(220)).toBe(`220${NB}pts to next reward`);
    expect(HOME.reward.toNext(1200)).toBe(`1,200${NB}pts to next reward`);
    expect(HOME.reward.ready('10% off')).toBe('10% off is ready');
    expect(HOME.reward.a11yToGo(220, '10% off')).toBe('Next reward, 10% off, 220 points to go');
    expect(HOME.reward.a11yToGo(1, '10% off')).toBe('Next reward, 10% off, 1 point to go');
    expect(HOME.reward.a11yReady('10% off')).toBe('Next reward, 10% off, ready');
    const reward = HOME.reward as Record<string, unknown>;
    expect(reward.label).toBeUndefined();
    expect(reward.first).toBeUndefined();
  });

  it('TODAY and the count', () => {
    expect(HOME.today.label).toBe('TODAY');
    expect(HOME.today.count(0, 3)).toBe('0 / 3');
  });
});

describe('START', () => {
  it('its own control, with what it does', () => {
    expect(HOME.action.start).toBe('START');
    expect(HOME.a11y.start('Study One Subject for 30 Minutes')).toBe('Start Study One Subject for 30 Minutes');
    expect(HOME.a11y.startHint(30)).toBe('Starts the 30-minute timer');
    expect(HOME.a11y.startHint(null)).toBe('Opens the mission to do it and prove it');
  });

  it('a finished timer asks for proof, as the mission page does', () => {
    expect(HOME.action.timerDone).toBe('TAKE PROOF');
    expect(HOME.action.markDone).toBe('PROVE IT');
    expect(HOME.a11y.timerDone).toBe('Timer done, take proof');
    expect(HOME.a11y.timerDoneMark).toBe('Timer done, prove it');
  });
});

describe('the weekly focus card', () => {
  it('the question and Choose, no sentence under it', () => {
    expect(FOCUS.prompt).toBe('What matters most this week?');
    expect(FOCUS.promptGo).toBe('Choose');
    expect(FOCUS.skip).toBe('Not this week');
    expect((FOCUS as Record<string, unknown>).promptBody).toBeUndefined();
    expect(FOCUS.promptA11y).toBe('What matters most this week?');
  });
});
