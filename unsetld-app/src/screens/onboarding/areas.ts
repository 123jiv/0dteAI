// How few areas a save may leave (UX_REDESIGN 12). Kept apart from the screens so it can be tested.
import type { TrackId } from '../../core/types';
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
