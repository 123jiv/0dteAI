// Apple's Declared Age Range through expo-age-range (launch pass P0-4): asked only on iOS 26+, only
// where Apple says age rules apply, and anything but a declared range falls back to the year question.
import { describe, expect, it, vi } from 'vitest';
import { askAppleAgeRange, askWith, type AgeRangeApi } from '../ageRange';

// Hoisted above the imports: the service reads Platform as it loads.
vi.mock('react-native', () => ({ Platform: { OS: 'web', Version: undefined } }));

function fake(eligible: boolean | null | Error, answer: object | Error): AgeRangeApi & { asked: number; checked: number } {
  const api = {
    asked: 0,
    checked: 0,
    isEligibleForAgeFeaturesAsync: async () => {
      api.checked++;
      if (eligible instanceof Error) throw eligible;
      return eligible;
    },
    requestAgeRangeAsync: async (opts: object) => {
      api.asked++;
      expect(opts).toEqual({ threshold1: 13, threshold2: 16, threshold3: 18 });
      if (answer instanceof Error) throw answer;
      return answer as never;
    },
  };
  return api;
}

const declined = Object.assign(new Error('The user declined the age verification request'), { code: 'ERR_AGE_RANGE_USER_DECLINED' });
const unavailable = Object.assign(new Error('The Age Range service is not available'), { code: 'ERR_AGE_RANGE_NOT_AVAILABLE' });

describe('askWith', () => {
  it('never asks on the web, Android or before iOS 26', async () => {
    for (const [os, v] of [['web', undefined], ['android', 36], ['ios', '18.6'], ['ios', '25.9']] as const) {
      const api = fake(true, { lowerBound: 18, upperBound: null, ageRangeDeclaration: 'selfDeclared' });
      expect(await askWith(os, v, api)).toBeNull();
      expect(api.checked + api.asked).toBe(0);
    }
  });

  it('without the native module (an older dev client) there is nothing to ask', async () => {
    expect(await askWith('ios', '26.2', null)).toBeNull();
  });

  it('asks only where Apple says age rules apply', async () => {
    for (const eligible of [false, null]) {
      const api = fake(eligible, { lowerBound: 13, upperBound: 15, ageRangeDeclaration: 'selfDeclared' });
      expect(await askWith('ios', '26.2', api)).toBeNull();
      expect(api.asked).toBe(0);
    }
  });

  it('a declared range answers the gate', async () => {
    expect(await askWith('ios', '26.2', fake(true, { lowerBound: 13, upperBound: 15, ageRangeDeclaration: 'selfDeclared' }))).toEqual({ kind: 'ok', age: 'u16' });
    expect(await askWith('ios', '26.4', fake(true, { lowerBound: 18, upperBound: null, ageRangeDeclaration: 'confirmed' }))).toEqual({ kind: 'ok', age: '18plus' });
    expect(await askWith('ios', '26.2', fake(true, { lowerBound: null, upperBound: 12, ageRangeDeclaration: 'guardianDeclared' }))).toEqual({ kind: 'under13' });
  });

  it('the simulated adult (no declaration) is never an answer', async () => {
    expect(await askWith('ios', '26.2', fake(true, { lowerBound: 18, upperBound: null }))).toBeNull();
    expect(await askWith('ios', '26.2', fake(true, { lowerBound: 18, upperBound: null, ageRangeDeclaration: null }))).toBeNull();
  });

  it('a decline, an unavailable service or a failed check falls back to the year question', async () => {
    expect(await askWith('ios', '26.2', fake(true, declined))).toBeNull();
    expect(await askWith('ios', '26.2', fake(true, unavailable))).toBeNull();
    expect(await askWith('ios', '26.2', fake(unavailable, { lowerBound: 18, upperBound: null, ageRangeDeclaration: 'selfDeclared' }))).toBeNull();
  });
});

describe('askAppleAgeRange', () => {
  it('in the browser preview: null, without loading the module', async () => {
    expect(await askAppleAgeRange()).toBeNull();
  });
});
