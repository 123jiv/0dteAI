// The title a mission shows this user (core/titles missionTitle): the approved title with its
// one slot filled from their goal or skills, "Work on Your Clothing Brand for 30 Minutes" for
// P1. Every screen naming a mission to do reads it here. A past proof names the title it was
// proven under (MissionDone.title, screens/progress/proofView), and a mission of the user's
// own keeps its own title (it has no template).
import { useCallback } from 'react';
import { missionTitle } from '../core/titles';
import type { Mission } from '../core/types';
import { useApp } from '../state/store';

export type Titled = Pick<Mission, 'title' | 'template' | 'personalize'>;

/** Names missions for this user; the function changes only when their goal or skills do. */
export function useMissionTitle(): (m: Titled) => string {
  const goal = useApp(s => s.profile.goal);
  const skills = useApp(s => s.profile.skills);
  return useCallback((m: Titled) => missionTitle(m, { goal, skills }), [goal, skills]);
}

/** The mission with its title as this user reads it, for the parts that draw `mission.title`. */
export function titled<M extends Titled>(m: M, titleOf: (m: Titled) => string): M {
  const title = titleOf(m);
  return title === m.title ? m : { ...m, title };
}
