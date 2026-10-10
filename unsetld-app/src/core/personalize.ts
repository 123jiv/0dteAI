// Personalization for the daily plan: plain, deterministic rules (never "AI").
// - The weekly focus ("What matters most this week?") leans the week toward an area and
//   specific missions.
// - The goal ("What are you working toward?") is matched by keywords against mission tags.
// - What the user did lately adapts the plan: missions swapped or left undone come up less,
//   long missions give way to shorter ones when only the shorter ones get done, an area
//   proven consistently gets slightly bigger missions, and missions tied to the time of day
//   follow when the user usually proves things.
import { addDays, parseDay, type DayKey } from './time';
import type { DayPlan, FocusId, Mission, MissionDone, Profile, TrackId, WeeklyFocus } from './types';

/** Monday of the week `day` is in. */
export function mondayOf(day: DayKey): DayKey {
  const dow = parseDay(day).getDay();
  return addDays(day, -((dow + 6) % 7));
}

/** The focus set for the week starting `week` (a Monday), this week's or one picked ahead on Sunday. */
export function focusFor(profile: Pick<Profile, 'focus' | 'nextFocus'>, week: DayKey): WeeklyFocus | null {
  return [profile.focus, profile.nextFocus].find(f => f?.week === week) ?? null;
}

/** The weekly focus, if it's set for the week `day` is in. */
export function activeFocus(profile: Pick<Profile, 'focus' | 'nextFocus'>, day: DayKey): WeeklyFocus | null {
  return focusFor(profile, mondayOf(day));
}

/** What each weekly focus leans the plan toward: an area to lead with, missions and tags to favour. */
export const FOCUS_LEAN: Record<Exclude<FocusId, 'other'>, { area: TrackId; ids: string[]; tags: string[] }> = {
  'school-catchup': {
    area: 'school',
    ids: ['school-missing-assignment', 'school-finish-assignment', 'school-tonights-homework', 'school-study-30', 'school-term-deadlines'],
    tags: ['homework', 'grades'],
  },
  exam: {
    area: 'school',
    ids: ['school-test-prep', 'school-practice-test', 'school-review-flashcards', 'school-make-flashcards', 'school-practice-problems', 'school-study-sheet', 'school-study-30'],
    tags: ['exam', 'test'],
  },
  business: {
    area: 'business',
    ids: ['business-work-30', 'business-work-60', 'business-product', 'business-content', 'business-customer-interviews'],
    tags: ['customers', 'sell'],
  },
  gym: {
    area: 'fitness',
    ids: ['fitness-gym', 'fitness-workout', 'fitness-train-30', 'fitness-home-workout'],
    tags: ['gym', 'workout', 'strength'],
  },
  project: {
    area: 'projects',
    ids: ['projects-build-30', 'projects-build-60', 'projects-finish-feature', 'projects-finish-not-start', 'projects-launch'],
    tags: ['build', 'launch'],
  },
  routine: {
    area: 'discipline',
    ids: ['discipline-plan-tomorrow', 'discipline-make-your-bed', 'discipline-top-3', 'discipline-lock-in-30', 'discipline-most-important-first'],
    tags: ['routine', 'habits'],
  },
  save: {
    area: 'money',
    ids: ['money-track-spending', 'money-save-today', 'money-simple-budget', 'money-month-review', 'money-compare-prices'],
    tags: ['save', 'savings', 'budget'],
  },
  skill: {
    area: 'skills',
    ids: ['skills-learn-30', 'skills-course-lesson', 'skills-practice-not-watch', 'skills-coding', 'skills-design', 'skills-editing', 'skills-writing', 'skills-language', 'skills-instrument'],
    tags: ['learn', 'practice'],
  },
};

/**
 * Words in a goal and what they point at. Matched as whole words, case-insensitively.
 * Areas lead the plan only when they're among the user's areas; tags favour matching
 * missions in any of the user's areas.
 */
const KEYWORDS: { words: RegExp; areas: TrackId[]; tags: string[] }[] = [
  {
    words: /\b(gpa|grades?|homework|class(es)?|study(ing)?|school|college|university|semester|courses?|essays?|assignments?|science fair|school project|class project)\b/i,
    areas: ['school'],
    tags: ['study', 'grades', 'gpa', 'homework'],
  },
  { words: /\b(exams?|tests?|sat|act|finals?|midterms?|quiz(zes)?)\b/i, areas: ['school'], tags: ['exam', 'test'] },
  {
    words: /\b(muscle|gym|strength|strong(er)?|lift(ing)?|work(ing)?\s?outs?|exercis\w*|train(ing)?|bulk|fit|fitness|shape|athlet\w*|abs|lose weight|weight loss|tryouts?|gymnastics|cheer|dance)\b/i,
    areas: ['fitness'],
    tags: ['gym', 'muscle', 'strength', 'workout'],
  },
  { words: /\b(run(ning)?|jog(ging)?|walk(ing)?|cardio|endurance|marathon|5k|10k|stamina)\b/i, areas: ['fitness'], tags: ['run', 'cardio', 'endurance', 'walk'] },
  { words: /\b(stretch(ing)?|flexib\w*|mobility)\b/i, areas: ['fitness'], tags: ['stretch', 'mobility'] },
  {
    words: /\b(sports?|varsity|basketball|soccer|football|baseball|softball|volleyball|tennis|hockey|wrestling|lacrosse|swim(ming)?)\b/i,
    areas: ['fitness'],
    tags: ['sport', 'training'],
  },
  { words: /\b(eat(ing)? (better|healthier|healthy)|healthier|nutrition|meals?|protein|cook(ing)?)\b/i, areas: ['fitness'], tags: ['meal', 'food'] },
  {
    words: /\b(brand|clothing|apparel|business|shop|store|sell(ing)?|customers?|clients?|startup|company|merch|side hustle|hustle|entrepreneur\w*|etsy|resell(ing)?)\b/i,
    areas: ['business'],
    tags: ['brand', 'clothing', 'shop', 'sell', 'customers'],
  },
  // Career, split by stage: an internship, a job search, or moving up where they already work.
  { words: /\b(internships?)\b/i, areas: ['career'], tags: ['internship'] },
  { words: /\b(jobs?|hired|resume|cv|interviews?|linkedin|apply|applications?)\b/i, areas: ['career'], tags: ['job', 'resume', 'interview', 'apply'] },
  { words: /\b(career|promotion|raise|advanc\w*|professional(ly)?|salary|manager)\b/i, areas: ['career'], tags: ['work', 'skill', 'resume'] },
  { words: /\b(network(ing)?|connections?)\b/i, areas: ['career'], tags: ['network'] },
  {
    words: /\b(cod(e|ing)|program(ming)?|developer|software|apps?|websites?|python|javascript)\b/i,
    areas: ['skills', 'projects'],
    tags: ['coding', 'code', 'app', 'programming'],
  },
  {
    words: /\b(save|saving|savings|budget(ing)?|debt|invest(ing)?|money|spend(ing)?|income|financ\w*)\b|\$\s?\d/i,
    areas: ['money'],
    tags: ['save', 'savings', 'budget', 'money'],
  },
  { words: /\b(read(ing)?|books?)\b/i, areas: ['skills'], tags: ['reading'] },
  {
    words: /\b(routine|disciplin\w*|habits?|productive|productivity|focus(ed)?|procrastinat\w*|lazy|wake up|early|phone|screen time|scrolling)\b/i,
    areas: ['discipline'],
    tags: ['routine', 'habits', 'focus'],
  },
  // "...consistently": how they want to do it, not an area of its own.
  { words: /\b(consistent(ly)?|consistency)\b/i, areas: [], tags: ['routine', 'habits'] },
  { words: /\b(organi[sz](e|ed|ing)|clean(er|ing)?|declutter|tidy|messy|laundry|chores?)\b/i, areas: ['organization'], tags: ['clean', 'organize'] },
  { words: /\b(ship|launch|portfolio|side project|project)\b/i, areas: ['projects'], tags: ['build', 'launch', 'project'] },
  // A skill by name also names its medium, so missions made for that medium can come up.
  { words: /\b(design(ing)?|drawing|draw|art)\b/i, areas: ['skills'], tags: ['practice', 'learn', 'design'] },
  { words: /\b(editing|video|youtube|film(ing)?|content)\b/i, areas: ['skills'], tags: ['practice', 'learn', 'video', 'editing'] },
  { words: /\b(writ(e|ing)|blog)\b/i, areas: ['skills'], tags: ['practice', 'learn', 'writing'] },
  { words: /\b(music|guitar|piano|drums|singing|instrument)\b/i, areas: ['skills'], tags: ['practice', 'learn', 'music'] },
  { words: /\b(languages?|spanish|french|german|japanese|korean|chinese)\b/i, areas: ['skills'], tags: ['practice', 'learn', 'language'] },
  { words: /\b(learn(ing)?|skills?)\b/i, areas: ['skills'], tags: ['learn'] },
];

/** What a goal (or a weekly focus typed under "Something else") points at. Empty for no match. */
export function goalLean(text: string | null | undefined): { areas: TrackId[]; tags: string[] } {
  const areas: TrackId[] = [];
  const tags: string[] = [];
  if (!text?.trim()) return { areas, tags };
  for (const k of KEYWORDS) {
    if (!k.words.test(text)) continue;
    for (const a of k.areas) if (!areas.includes(a)) areas.push(a);
    for (const t of k.tags) if (!tags.includes(t)) tags.push(t);
  }
  return { areas, tags };
}

/** Everything the plan leans toward today: from the weekly focus, then the goal. */
export interface Lean {
  /** The week's focus area: it leads the day (and joins the user's areas for the week if it wasn't one). */
  focusArea: TrackId | null;
  /** Areas the goal points at (lead only when no focus or weekly priority is set). */
  goalAreas: TrackId[];
  /** Missions the weekly focus names. */
  ids: ReadonlySet<string>;
  /** Tags from the weekly focus (or what was typed for "Something else"). */
  focusTags: ReadonlySet<string>;
  /** Tags from the goal. A mission matching both the focus and the goal gets both leans. */
  goalTags: ReadonlySet<string>;
}

const NO_LEAN: Lean = { focusArea: null, goalAreas: [], ids: new Set(), focusTags: new Set(), goalTags: new Set() };
const leanCache = new Map<string, Lean>();

export function leanFor(profile: Pick<Profile, 'focus' | 'nextFocus' | 'goal'>, day: DayKey): Lean {
  const focus = activeFocus(profile, day);
  const goal = profile.goal ?? '';
  if (!focus && !goal.trim()) return NO_LEAN;
  const key = `${focus?.id ?? ''}|${focus?.text ?? ''}|${goal}`;
  const hit = leanCache.get(key);
  if (hit) return hit;
  const fromGoal = goalLean(goal);
  const known = focus && focus.id !== 'other' ? FOCUS_LEAN[focus.id] : null;
  const typed = focus?.id === 'other' ? goalLean(focus.text) : null;
  const lean: Lean = {
    focusArea: known?.area ?? typed?.areas[0] ?? null,
    goalAreas: fromGoal.areas,
    ids: new Set(known?.ids ?? []),
    focusTags: new Set([...(known?.tags ?? []), ...(typed?.tags ?? [])]),
    goalTags: new Set(fromGoal.tags),
  };
  if (leanCache.size > 50) leanCache.clear();
  leanCache.set(key, lean);
  return lean;
}

// ── Learning from what the user did ─────────────────────────────────────────

/** How far back the plan looks at what was done, swapped and left undone. */
export const LEARN_DAYS = 28;

export interface Adaptation {
  /** Times a mission was planned on a day the user proved something else, and left undone. */
  ignored: Record<string, number>;
  /** Kinds of mission swapped away more than once (by group "g:" or tag "t:"): how many different missions. */
  swappedKinds: Record<string, number>;
  /** Long missions (45+ min) mostly get left while 20–35 minute ones get done: keep focused missions shorter. */
  preferShort: boolean;
  /** Areas proven consistently: they get slightly bigger missions. */
  stepUp: TrackId[];
  /** When proofs usually happen, if there's a clear pattern. */
  timeOfDay: 'morning' | 'evening' | null;
}

export const NO_ADAPTATION: Adaptation = { ignored: {}, swappedKinds: {}, preferShort: false, stepUp: [], timeOfDay: null };

/**
 * Tags that name a kind of activity (what you'd be doing), as opposed to the goal keywords
 * (gpa, job, brand ...) that cover most of an area: swapping two planning missions should turn
 * down planning, not the whole area.
 */
const KIND_TAGS: ReadonlySet<string> = new Set([
  'planning', 'reading', 'writing', 'notes', 'flashcards', 'research',
  'cardio', 'run', 'walk', 'stretch', 'mobility', 'meal', 'cooking',
  'chores', 'declutter', 'video', 'editing', 'interview', 'resume', 'content',
]);

/** The kinds a mission belongs to, for "this kind keeps getting swapped": its group and its activity tags. */
export function kindsOf(m: Pick<Mission, 'group' | 'tags' | 'track'>): string[] {
  const out: string[] = [];
  if (m.group) out.push(`g:${m.group}`);
  for (const t of m.tags ?? []) if (KIND_TAGS.has(t)) out.push(`t:${t}`);
  return out;
}

const accepted = (d: MissionDone | undefined) => d?.verification?.status === 'accepted';

/** What the last LEARN_DAYS days say, from the plans and proofs before `before`. */
export function learnFrom(
  plans: Record<DayKey, DayPlan>,
  done: Record<DayKey, Record<string, MissionDone>> | undefined,
  byId: Readonly<Record<string, Mission>>,
  before: DayKey,
): Adaptation {
  const since = addDays(before, -LEARN_DAYS);
  const ignored: Record<string, number> = {};
  const swapped: Record<string, Set<string>> = {};
  const area: Record<string, { planned: number; proven: number }> = {};
  const size = { long: { planned: 0, proven: 0 }, mid: { planned: 0, proven: 0 } };
  let morning = 0;
  let evening = 0;
  let proofs = 0;
  for (const [day, plan] of Object.entries(plans)) {
    if (day < since || day >= before || !plan) continue;
    for (const id of plan.replaced ?? []) {
      const m = byId[id];
      if (!m) continue;
      for (const k of kindsOf(m)) (swapped[k] ??= new Set()).add(id);
    }
    const proven = done?.[day] ?? {};
    const any = Object.values(proven).some(accepted);
    // A day off says nothing about its missions; only days with a proof count.
    if (!any) continue;
    for (const p of plan.missions) {
      const m = byId[p.missionId];
      if (!m) continue;
      const ok = accepted(proven[p.missionId]);
      const a = (area[p.area ?? m.track] ??= { planned: 0, proven: 0 });
      a.planned += 1;
      if (ok) a.proven += 1;
      const bucket = m.minutes >= 45 ? size.long : m.minutes >= 20 ? size.mid : null;
      if (bucket) {
        bucket.planned += 1;
        if (ok) bucket.proven += 1;
      }
      if (!ok) ignored[p.missionId] = (ignored[p.missionId] ?? 0) + 1;
    }
    for (const d of Object.values(proven)) {
      if (!accepted(d) || !d.doneAt) continue;
      proofs += 1;
      const h = new Date(d.doneAt).getHours();
      if (h >= 4 && h < 12) morning += 1;
      else if (h >= 17 || h < 4) evening += 1;
    }
  }
  const swappedKinds: Record<string, number> = {};
  for (const [k, ids] of Object.entries(swapped)) if (ids.size >= 2) swappedKinds[k] = ids.size;
  const rate = (x: { planned: number; proven: number }) => (x.planned ? x.proven / x.planned : 0);
  const preferShort = size.long.planned >= 3 && rate(size.long) < 0.34 && size.mid.planned >= 3 && rate(size.mid) >= 0.6;
  const stepUp = (Object.keys(area) as TrackId[]).filter(t => area[t].planned >= 8 && area[t].proven >= 6 && rate(area[t]) >= 0.75);
  const timeOfDay = proofs >= 8 ? (morning / proofs >= 0.7 ? 'morning' : evening / proofs >= 0.7 ? 'evening' : null) : null;
  return { ignored, swappedKinds, preferShort, stepUp, timeOfDay };
}

/** Does the week's focus or the goal point at this mission (by id or tag)? */
export function leansTo(m: Mission, lean: Lean): boolean {
  return lean.ids.has(m.id) || (m.tags ?? []).some(t => lean.focusTags.has(t) || lean.goalTags.has(t));
}

/**
 * The personal part of a mission's weight in a slot for `area`: the weekly focus and the goal
 * favour their missions; what the user did lately turns down what they swap or leave and turns
 * up bigger missions in an area they're consistent in.
 */
export function personalWeight(m: Mission, area: TrackId, lean: Lean, adapt: Adaptation): number {
  let w = 1;
  const tags = m.tags ?? [];
  // The week's focus first (a mission it names, else one of its tags); the goal's tags on top.
  if (lean.ids.has(m.id)) w *= 2;
  else if (tags.some(t => lean.focusTags.has(t))) w *= 1.7;
  if (tags.some(t => lean.goalTags.has(t))) w *= 1.5;
  const ignored = adapt.ignored[m.id] ?? 0;
  if (ignored) w *= Math.max(0.4, Math.pow(0.75, ignored));
  let kinds = 1;
  for (const k of kindsOf(m)) {
    const n = adapt.swappedKinds[k];
    if (n) kinds = Math.min(kinds, n >= 3 ? 0.45 : 0.6);
  }
  w *= kinds;
  if (adapt.stepUp.includes(area) && m.minutes >= 30) w *= 1.4;
  if (adapt.timeOfDay === 'evening' && m.when === 'morning') w *= 0.7;
  if (adapt.timeOfDay === 'morning' && m.when === 'evening') w *= 0.7;
  return w;
}
