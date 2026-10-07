import { shortCode } from './random';
import { monthKey, type DayKey } from './time';

/**
 * v1 discount codes rotate monthly and are the same for every eligible user.
 * The founder pre-creates them in Shopify (once per customer, $60 minimum,
 * end-of-month expiry, total-use cap) with `npm run codes`.
 * v2 (Rank Sync) replaces this with single-use codes minted per person.
 */
export function monthlyCode(salt: string, percent: number, day: DayKey): string {
  const month = monthKey(day);
  return `UNSETLD${percent}-${shortCode(`${salt}|${month}|${percent}`, 6)}`;
}

export function monthEnd(day: DayKey): DayKey {
  const [y, m] = day.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
