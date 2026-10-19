// You › What you're learning (launch pass P1-2). Kept apart from the screens so it can be tested.
import type { Profile, SkillId, TrackId } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';

/** The order the chips show in, and the order a profile keeps them in. */
export const SKILLS: SkillId[] = ['coding', 'design', 'video', 'writing', 'language', 'music'];

/** The areas whose missions can name a skill ("Practice Coding for 30 Minutes"). */
export const LEARNING_AREAS: readonly TrackId[] = ['skills', 'projects', 'career'];

/** You shows the "What you're learning" row only with one of those areas picked. */
export function asksLearning(p: Pick<Profile, 'tracks'>): boolean {
  return p.tracks.some(t => LEARNING_AREAS.includes(t));
}

/** The row's value: the skills picked, in chip order ("Coding, Design"), or "Not set". */
export function learningValue(p: Pick<Profile, 'skills'>): string {
  const picked = p.skills ?? [];
  return ONBOARDING.about.rowValue(SKILLS.filter(s => picked.includes(s)).map(s => ONBOARDING.about.skills[s]));
}
