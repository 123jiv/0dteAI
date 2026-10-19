// You › MEMBERSHIP: what the UNSETLD+ row says, from the membership as the store last reported it
// (state/premium setPremiumFrom). Pure, so it can be tested without the screen.
import { dayMonth, dayMonthYear } from '../../core/trial';
import { PLATFORM } from '../../content/copy/platform';
import type { Premium } from '../../state/store';

const S = PLATFORM.you;

/** A saved ISO date, or null when there isn't a usable one. */
function dateOf(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "Free trial, ends 22 Oct" (a trial that will renew), "Annual, ends 22 Oct 2026" (cancelled,
 * still active), "Annual, renews 22 Oct 2026", "Lifetime", or "Member" when the plan isn't known.
 * The trial and end fields arrived in 3.3 and are optional in saved state: missing reads as none.
 */
export function renewText(p: Pick<Premium, 'plan' | 'renews' | 'trialEnds' | 'ends'>): string {
  const name = p.plan ? (S.planName[p.plan] ?? S.member) : S.member;
  const trialEnds = dateOf(p.trialEnds);
  if (trialEnds) return S.trialEnds(dayMonth(trialEnds));
  if (!p.plan || p.plan === 'lifetime') return name;
  const ends = dateOf(p.ends);
  if (ends) return S.ends(name, dayMonthYear(ends));
  const renews = dateOf(p.renews);
  return renews ? S.renews(name, dayMonthYear(renews)) : name;
}
