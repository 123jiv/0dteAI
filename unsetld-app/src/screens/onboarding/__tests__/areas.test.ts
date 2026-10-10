// R6: the fewest areas a save may leave. About you and Areas read it once, as they open.
import { describe, expect, it } from 'vitest';
import type { TrackId } from '../../../core/types';
import { minAreasFor } from '../areas';

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
