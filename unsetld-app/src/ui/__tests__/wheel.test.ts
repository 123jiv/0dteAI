// The wheel picker (ui/WheelColumn, the age gate's year): rows are a full 44pt touch target, and
// the row a scroll stops on is the one in the middle band, so scrolling a year into the middle
// picks it, as on the iOS wheel (UX review 6).
import { describe, expect, it } from 'vitest';
import { rowAt, WHEEL_ROW } from '../wheel';

describe('the wheel', () => {
  it('rows are at least 44pt', () => {
    expect(WHEEL_ROW).toBeGreaterThanOrEqual(44);
  });

  it('the row centred at an offset, to the nearest row, within the rows there are', () => {
    expect(rowAt(0, 10)).toBe(0);
    expect(rowAt(3 * WHEEL_ROW, 10)).toBe(3);
    expect(rowAt(3 * WHEEL_ROW + WHEEL_ROW / 2 - 1, 10)).toBe(3);
    expect(rowAt(3 * WHEEL_ROW + WHEEL_ROW / 2 + 1, 10)).toBe(4);
    // Over-scrolled past either end (the bounce).
    expect(rowAt(-80, 10)).toBe(0);
    expect(rowAt(40 * WHEEL_ROW, 10)).toBe(9);
    expect(rowAt(Number.NaN, 10)).toBe(0);
    expect(rowAt(100, 0)).toBe(0);
  });
});
