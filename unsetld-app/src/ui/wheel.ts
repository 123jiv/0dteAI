// The wheel picker's geometry (ui/WheelColumn). Kept apart from the component so it can be tested.

/** One row of a wheel column: 44pt, the minimum touch target. */
export const WHEEL_ROW = 44;

/**
 * The row centred at a scroll offset: the column has two empty rows above its first, so row i
 * sits in the middle band at offset i × WHEEL_ROW. Clamped to the rows there are.
 */
export function rowAt(offsetY: number, count: number): number {
  if (count <= 0) return 0;
  const i = Math.round(offsetY / WHEEL_ROW);
  return Math.min(count - 1, Math.max(0, Number.isFinite(i) ? i : 0));
}
