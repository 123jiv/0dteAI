// R6: the fewest areas a save may leave. About you and Areas read it once, as they open.
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, eligibleAreas } from '../../../core/missions';
import type { TrackId } from '../../../core/types';
import { ONBOARDING } from '../../../content/copy/onboarding';
import { areasSave, minAreasFor } from '../areas';
import { asksLearning, learningValue, SKILLS } from '../learning';

describe('minAreasFor', () => {
  it('onboarding always asks for two', () => {
    expect(minAreasFor([], false)).toBe(2);
    expect(minAreasFor(['school'], false)).toBe(2);
  });

  it('editing: one area kept from an earlier version can stay one', () => {
    expect(minAreasFor(['school'], true)).toBe(1);
    expect(minAreasFor([], true)).toBe(1);
  });

  it('editing with two or more: never fewer than two', () => {
    expect(minAreasFor(['school', 'fitness'], true)).toBe(2);
    expect(minAreasFor(['school', 'fitness', 'money', 'career'], true)).toBe(2);
  });

  it('an id the library no longer has does not count', () => {
    expect(minAreasFor(['school', 'mindset' as TrackId], true)).toBe(1);
  });
});

describe('areasSave (launch pass P1-2: picking School means in school)', () => {
  it('a No to school from an earlier version, then School picked: the No is cleared to unanswered', () => {
    expect(areasSave({ priority: null, school: false }, ['school', 'fitness'])).toEqual({ tracks: ['school', 'fitness'], priority: null, school: null });
    // The planner then has School like any picked area.
    const profile = { ...DEFAULT_PROFILE, school: false, ...areasSave({ priority: null, school: false }, ['school', 'fitness']) };
    expect(eligibleAreas(profile, '2026-10-19')).toContain('school');
  });

  it('a No to school without School picked stays a No; a Yes or no answer is left alone', () => {
    expect(areasSave({ priority: null, school: false }, ['money', 'fitness'])).toEqual({ tracks: ['money', 'fitness'], priority: null });
    expect(areasSave({ priority: null, school: true }, ['school', 'fitness'])).toEqual({ tracks: ['school', 'fitness'], priority: null });
    expect(areasSave({ priority: null, school: null }, ['school', 'fitness'])).toEqual({ tracks: ['school', 'fitness'], priority: null });
  });

  it("the week's lean goes with an area taken off, and stays with one kept", () => {
    expect(areasSave({ priority: 'money', school: null }, ['school', 'fitness']).priority).toBeNull();
    expect(areasSave({ priority: 'fitness', school: null }, ['school', 'fitness']).priority).toBe('fitness');
  });
});

describe("You › What you're learning", () => {
  it('shows only with Skills, Projects or Career', () => {
    expect(asksLearning({ tracks: ['skills', 'fitness'] })).toBe(true);
    expect(asksLearning({ tracks: ['projects'] })).toBe(true);
    expect(asksLearning({ tracks: ['career', 'money'] })).toBe(true);
    expect(asksLearning({ tracks: ['school', 'fitness', 'money', 'discipline'] })).toBe(false);
    expect(asksLearning({ tracks: [] })).toBe(false);
  });

  it('says the skills picked, in chip order, or Not set', () => {
    expect(learningValue({ skills: [] })).toBe('Not set');
    expect(learningValue({ skills: undefined as never })).toBe('Not set');
    expect(learningValue({ skills: ['music', 'coding'] })).toBe('Coding, Music');
    expect(learningValue({ skills: ['language'] })).toBe('A language');
  });

  it('every skill has a chip', () => {
    expect([...SKILLS].sort()).toEqual(Object.keys(ONBOARDING.about.skills).sort());
  });
});
