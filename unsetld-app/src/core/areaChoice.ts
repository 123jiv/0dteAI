// Which area a goal or a weekly "Something else" is about, when its words don't say. Plain
// rules, no AI: the words are matched as always (core/personalize goalLean); when they reach
// none of the areas the plan draws from, the screen asks, and the answer is kept beside the
// text (Profile.goalArea, WeeklyFocus.area) so the planner has an area to lean toward. The
// text the user wrote stays as they wrote it.
import { meetsRequirements, planAreas, serves, usableAreas } from './missions';
import { goalLean } from './personalize';
import { TRACK_IDS } from './progress';
import { usableText } from './safety';
import type { DayKey } from './time';
import type { Mission, Profile, TrackId } from './types';

/**
 * The goal's own areas (what its words match) among the areas the plan draws from, with the
 * weekly focus left out. Empty means no confident match: the Goal screen asks which area it's
 * about. "Get my GPA up" with Fitness and Discipline reaches nothing; "Launch my clothing
 * brand" with two areas reaches Projects (it brings Projects in, core/missions impliedAreas).
 */
export function goalReach(library: readonly Mission[], profile: Profile, goal: string | null | undefined, day: DayKey): TrackId[] {
  const words = goalLean(goal).areas;
  if (!words.length) return [];
  const areas = planAreas({ library, profile: { ...profile, goal: goal ?? null, goalArea: null, focus: null, nextFocus: null }, day });
  return words.filter(a => areas.includes(a));
}

/**
 * The areas the Goal screen offers: the user's own that some mission fits (core/missions
 * usableAreas). Never one they didn't pick: a goal only shapes the areas the plan draws from,
 * and adding an area is the Areas screen's job.
 */
export function goalAreaChoices(library: readonly Mission[], profile: Profile, day?: DayKey): TrackId[] {
  return usableAreas(library, profile, day);
}

/** What the Goal screen shows under the field for `goal`: the area question or nothing. */
export interface GoalQuestion {
  /** Ask "Which of your areas is this about?". */
  ask: boolean;
  /** The areas to pick from (the user's own). */
  choices: TrackId[];
  /** An area the words name that isn't one of the user's ("School isn't one of your areas."). */
  outside: TrackId | null;
}

const NO_QUESTION: GoalQuestion = { ask: false, choices: [], outside: null };

/**
 * Whether the Goal screen asks which area `goal` is about: only for text the app can use whose
 * words reach none of the plan's areas, and only when there are two or more areas to pick from
 * (with one, there is nothing to choose).
 */
export function goalQuestion(library: readonly Mission[], profile: Profile, goal: string | null | undefined, day: DayKey): GoalQuestion {
  if (!goal?.trim() || !usableText(goal)) return NO_QUESTION;
  if (goalReach(library, profile, goal, day).length) return NO_QUESTION;
  const choices = goalAreaChoices(library, profile, day);
  if (choices.length < 2) return NO_QUESTION;
  return { ask: true, choices, outside: goalLean(goal).areas.find(a => !choices.includes(a)) ?? null };
}

/**
 * What the Goal screen saves beside the text: the area picked when the question was asked
 * (and the pick is one of the choices), else null. A goal whose words reach an area needs none.
 */
export function goalAreaToSave(q: GoalQuestion, pick: TrackId | null | undefined): TrackId | null {
  return q.ask && pick && q.choices.includes(pick) ? pick : null;
}

/**
 * The areas the weekly "Something else" offers: all eight that have a mission the user's answers
 * allow (a focus brings its area in for the week, picked or not), the user's own first in the
 * order they picked them, then the rest in the usual order. Nothing about school for someone who
 * said they're not in school and didn't pick School (as core/review focusChoices).
 */
export function focusAreaChoices(library: readonly Mission[], profile: Profile): TrackId[] {
  const plannable = (t: TrackId) => library.some(m => m.active && serves(m, t) && meetsRequirements(m.requires, profile));
  const notInSchool = profile.school === false && !profile.tracks.includes('school');
  const ok = (t: TrackId) => plannable(t) && !(notInSchool && t === 'school');
  const mine = profile.tracks.filter(t => TRACK_IDS.includes(t) && ok(t));
  return [...mine, ...TRACK_IDS.filter(t => !mine.includes(t) && ok(t))];
}

/**
 * True when what's typed for "Something else" names no area (goalLean), so it needs one picked
 * before the week can be set: a focus that leans nowhere would change nothing. Empty text and
 * text the safety check refuses don't ask (the first can't be set, the second gets its note).
 */
export function focusNeedsArea(text: string | null | undefined): boolean {
  if (!text?.trim() || !usableText(text, 'focus')) return false;
  return goalLean(text).areas.length === 0;
}
