// How few areas a save may leave (UX_REDESIGN 12), and what a save writes. Kept apart from the
// screens so it can be tested.
import type { Profile, TrackId } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { MIN_AREAS } from '../../content/copy/onboarding';

/**
 * Two, or one for someone whose saved areas are one (earlier versions allowed it) when
 * editing. Onboarding always asks for two. Ids the library no longer has don't count.
 */
export function minAreasFor(saved: readonly TrackId[], edit: boolean): number {
  if (!edit) return MIN_AREAS;
  return Math.max(1, Math.min(MIN_AREAS, saved.filter(id => TRACK_BY_ID[id]).length));
}

/**
 * What saving the areas writes: the areas, this week's lean while it's still one of them, and,
 * once School is picked, a No to "In school or college?" from an earlier version cleared to
 * unanswered. Picking School is what says someone is in school now (launch pass P1-2).
 */
export function areasSave(value: Pick<Profile, 'priority' | 'school'>, chosen: readonly TrackId[]): Partial<Profile> {
  const patch: Partial<Profile> = { tracks: [...chosen], priority: value.priority && chosen.includes(value.priority) ? value.priority : null };
  if (value.school === false && chosen.includes('school')) patch.school = null;
  return patch;
}
