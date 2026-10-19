// Personalization for the daily plan: plain, deterministic rules (never "AI").
// - The weekly focus ("What matters most this week?") leans the week toward an area and
//   specific missions.
// - The goal ("What are you working toward?") is matched by keywords against mission tags;
//   when its words reach none of the user's areas, the area they pick for it (Profile.goalArea).
// - Text the safety check refuses (core/safety) steers nothing, saved before the check or not.
// - What the user did lately adapts the plan: missions swapped or left undone come up less,
//   long missions give way to shorter ones when only the shorter ones get done, an area
//   proven consistently gets slightly bigger missions, and missions tied to the time of day
//   follow when the user usually proves things.
import { TRACK_IDS } from './progress';
import { usableText } from './safety';
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

/**
 * What each weekly focus leans the plan toward: an area to lead with, missions (approved ids,
 * most fitting first) and tags to favour. "Make progress on my business" leans Projects: the
 * approved library keeps business work there.
 */
export const FOCUS_LEAN: Record<Exclude<FocusId, 'other'>, { area: TrackId; ids: string[]; tags: string[] }> = {
  'school-catchup': { area: 'school', ids: ['S5', 'S6', 'S13', 'S11', 'S1'], tags: ['homework', 'assignment', 'grades'] },
  exam: { area: 'school', ids: ['S2', 'S9', 'S4', 'S10', 'S15', 'S3', 'S12'], tags: ['exam', 'test'] },
  business: { area: 'projects', ids: ['P1', 'P9', 'P3', 'P4', 'P10'], tags: ['business', 'brand', 'customers', 'sell', 'content'] },
  gym: { area: 'fitness', ids: ['F1', 'F7', 'F5', 'F3', 'F8'], tags: ['gym', 'workout', 'strength'] },
  project: { area: 'projects', ids: ['P1', 'P2', 'P5', 'P10', 'P12', 'P6'], tags: ['build', 'launch', 'project'] },
  apply: { area: 'career', ids: ['C2', 'C3', 'C12', 'C1', 'C5'], tags: ['apply', 'job', 'internship', 'resume'] },
  routine: { area: 'discipline', ids: ['D4', 'D1', 'D2', 'D5'], tags: ['routine', 'habits'] },
  organize: { area: 'organization', ids: ['O1', 'O2', 'O8', 'O9', 'O5'], tags: ['clean', 'organize'] },
  save: { area: 'money', ids: ['M3', 'M1', 'M2', 'M6', 'M5'], tags: ['save', 'savings', 'budget'] },
  skill: { area: 'skills', ids: ['K1', 'K2', 'K3', 'K9', 'K10'], tags: ['learn', 'practice'] },
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
  // A brand or a business is something being built: Projects (3.3 folded Business into it).
  {
    words: /\b(brand|clothing|apparel|business|shop|store|sell(ing)?|customers?|clients?|startup|company|merch|side hustle|hustle|entrepreneur\w*|etsy|resell(ing)?)\b/i,
    areas: ['projects'],
    tags: ['brand', 'clothing', 'shop', 'sell', 'customers', 'business'],
  },
  // Career, split by stage: an internship, a job search, or moving up where they already work.
  { words: /\b(internships?)\b/i, areas: ['career'], tags: ['internship'] },
  { words: /\b(jobs?|hired|resume|cv|interviews?|linkedin|apply|applications?)\b/i, areas: ['career'], tags: ['job', 'resume', 'interview', 'apply'] },
  { words: /\b(career|promotion|raise|advanc\w*|professional(ly)?|salary|manager)\b/i, areas: ['career'], tags: ['work', 'skill', 'resume'] },
  { words: /\b(network(ing)?|connections?)\b/i, areas: ['career'], tags: ['network'] },
  // Building a thing (an app, a site) is a project first; learning to code is a skill first, and so
  // is software on its own ("Become a software engineer" isn't building anything yet).
  { words: /\b(apps?|websites?)\b/i, areas: ['projects', 'skills'], tags: ['app', 'coding', 'code'] },
  { words: /\b(cod(e|ing)|program(ming)?|developer|software|python|javascript)\b/i, areas: ['skills', 'projects'], tags: ['coding', 'code', 'programming'] },
  {
    // "Spend less time on my phone" is about time, not money.
    words: /\b(save|saving|savings|budget(ing)?|debt|invest(ing)?|money|spend(ing)?(?!(?:\s+\w+){0,3}\s+time\b)|income|financ\w*)\b|\$\s?\d/i,
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
  // Added after the rows above, so a goal those already matched keeps its areas in the same order.
  // A school subject by name ("Pass calculus", "Get a 5 on AP Calc").
  {
    words: /\b(math|maths|calculus|calc|precalc(ulus)?|algebra|geometry|trig(onometry)?|chemistry|chem|physics|biology|history)\b/i,
    areas: ['school'],
    tags: ['study', 'grades'],
  },
  { words: /\bAP\b/, areas: ['school'], tags: ['study', 'exam'] },
  { words: /\bpromot(ed|ion)\b/i, areas: ['career'], tags: ['work', 'skill', 'resume'] },
  { words: /\b(lock(ed)? in|wast(e|ing) (my )?time)\b/i, areas: ['discipline'], tags: ['routine', 'habits', 'focus'] },
  { words: /\b(credit cards?|emergency fund|impulse|afford\w*|pay(ing)? off)\b/i, areas: ['money'], tags: ['save', 'savings', 'budget', 'money', 'spending'] },
  // Growing an account is a project; cutting down on the app is not ("Limit TikTok to 30 minutes").
  {
    words: /\b(?<!\b(?:limit|less|quit|quitting|stop|delete|deleting|off|no|cut|cutting|without)\s(?:my\s)?)(tiktok|instagram)\b|\bfollowers?\b/i,
    areas: ['projects'],
    tags: ['content', 'audience', 'publish'],
  },
];

/**
 * Does the goal point at an area as the thing it's about: a KEYWORDS row that names the area
 * first. School: grades, homework, studying, exams. Projects: an app or a website, shipping or
 * launching, a brand or a business ("Learn coding" is Skills first, so it doesn't count; there's
 * no bare "build": "Build muscle" is Fitness). core/missions eligibleAreas reads it.
 */
export function goalPointsAt(text: string | null | undefined, area: TrackId): boolean {
  if (!text?.trim() || !usableText(text)) return false;
  return KEYWORDS.some(k => k.areas[0] === area && k.words.test(text));
}

/** A goal that names a job or internship search ("Get a software job", "Land a summer internship"). */
const JOB_SEARCH = /\b(jobs?|internships?|hired|hiring|apply(ing)?|applications?|job hunt(ing)?|job search)\b/i;
/**
 * The same words where they aren't a search: applying to college or for a scholarship, and the
 * job they already have ("Get promoted at my job").
 */
const NOT_A_SEARCH =
  /\b(?:(?:apply(?:ing)?|applications?)\s+(?:to|for)\s+(?:(?!jobs?\b|internships?\b)[a-z-]+\s+){0,2}(?:colleges?|universit(?:y|ies)|schools?|scholarships?|programs?)|(?:college|university|school|scholarship)\s+applications?|(?:at|in|keep|keeping)\s+my\s+(?:current\s+)?job)\b/gi;

/**
 * Is a job or internship search part of what the user is doing: their goal names one, or this
 * week's focus is "Apply for jobs or internships" (with `day`). Career missions for someone who
 * didn't pick Career, and the 'jobsearch' requirement (Apply to One Job or Internship), follow it.
 */
export function jobSearch(profile: Pick<Profile, 'goal' | 'focus' | 'nextFocus'>, day?: DayKey): boolean {
  const goal = usableText(profile.goal) ? (profile.goal ?? '') : '';
  if (JOB_SEARCH.test(goal.replace(NOT_A_SEARCH, ' '))) return true;
  return day != null && activeFocus(profile, day)?.id === 'apply';
}

/**
 * What a goal (or a weekly focus typed under "Something else") points at. Empty for no match,
 * and for text the safety check refuses (core/safety): it steers nothing.
 */
export function goalLean(text: string | null | undefined): { areas: TrackId[]; tags: string[] } {
  const areas: TrackId[] = [];
  const tags: string[] = [];
  if (!text?.trim() || !usableText(text)) return { areas, tags };
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
  /**
   * Areas the goal points at (lead only when no focus or weekly priority is set): what its words
   * match, then the area picked for it on the Goal screen (Profile.goalArea) when that's another.
   */
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

const isArea = (t: unknown): t is TrackId => typeof t === 'string' && TRACK_IDS.includes(t as TrackId);

export function leanFor(profile: Pick<Profile, 'focus' | 'nextFocus' | 'goal' | 'goalArea'>, day: DayKey): Lean {
  const focus = activeFocus(profile, day);
  const goal = profile.goal ?? '';
  if (!focus && !goal.trim()) return NO_LEAN;
  // The area picked for the goal counts only with a goal the app can use.
  const goalArea = goal.trim() && usableText(goal) && isArea(profile.goalArea) ? profile.goalArea : null;
  // "Something else": the area picked for what was typed, when the text itself can be used.
  const otherArea = focus?.id === 'other' && usableText(focus.text, 'focus') && isArea(focus.area) ? focus.area : null;
  const key = `${focus?.id ?? ''}|${focus?.text ?? ''}|${otherArea ?? ''}|${goal}|${goalArea ?? ''}`;
  const hit = leanCache.get(key);
  if (hit) return hit;
  const fromGoal = goalLean(goal);
  const known = focus && focus.id !== 'other' ? FOCUS_LEAN[focus.id] : null;
  const typed = focus?.id === 'other' ? goalLean(focus.text) : null;
  const lean: Lean = {
    focusArea: known?.area ?? otherArea ?? typed?.areas[0] ?? null,
    goalAreas: goalArea && !fromGoal.areas.includes(goalArea) ? [...fromGoal.areas, goalArea] : fromGoal.areas,
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
/**
 * How far back preferShort looks: two weeks, not four, so what the user does once focused missions
 * are shorter can turn it off again (it plans fewer long missions, so the evidence moves slowly).
 */
export const SHORT_LEARN_DAYS = 14;
/** Long and mid-length missions each planned at least this often (on days with a proof) before preferShort decides. */
export const SHORT_MIN_PLANNED = 6;

export interface Adaptation {
  /** Times a mission was planned on a day the user proved something else, and left undone. */
  ignored: Record<string, number>;
  /** Kinds of mission swapped away more than once (by group "g:" or tag "t:"): how many different missions. */
  swappedKinds: Record<string, number>;
  /**
   * Long missions (LONG_MINUTES or more) mostly get left while 15–25 minute ones get done, over the
   * last SHORT_LEARN_DAYS: keep focused missions shorter (every other day, core/missions).
   */
  preferShort: boolean;
  /** Areas proven consistently: they get slightly bigger missions. */
  stepUp: TrackId[];
  /** When proofs usually happen, if there's a clear pattern. */
  timeOfDay: 'morning' | 'evening' | null;
  /** 3.2: missions swapped as "Not relevant" lately (times). They mostly stay away. */
  notForMe?: Record<string, number>;
  /** 3.2: areas whose missions were swapped as "Too hard" more than once lately: shorter ones there. */
  easeIn?: TrackId[];
}

/**
 * A long mission, for preferShort: 30 minutes or more. The approved library's focused missions
 * run 30–45 minutes, so this is where "long" starts; shorter ones (15–25) are the alternative.
 */
export const LONG_MINUTES = 30;

export const NO_ADAPTATION: Adaptation = { ignored: {}, swappedKinds: {}, preferShort: false, stepUp: [], timeOfDay: null, notForMe: {}, easeIn: [] };

/**
 * Tags that name a kind of activity (what you'd be doing), as opposed to the goal keywords
 * (gpa, job, brand ...) that cover most of an area: swapping two planning missions should turn
 * down planning, not the whole area.
 */
const KIND_TAGS: ReadonlySet<string> = new Set([
  'planning', 'reading', 'writing', 'notes', 'flashcards', 'research', 'recall',
  'cardio', 'run', 'walk', 'stretch', 'mobility', 'meal', 'cooking',
  'chores', 'declutter', 'video', 'editing', 'interview', 'resume', 'content',
  'improve', 'portfolio',
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
  const shortSince = addDays(before, -SHORT_LEARN_DAYS);
  const ignored: Record<string, number> = {};
  const swapped: Record<string, Set<string>> = {};
  const area: Record<string, { planned: number; proven: number }> = {};
  const size = { long: { planned: 0, proven: 0 }, mid: { planned: 0, proven: 0 } };
  let morning = 0;
  let evening = 0;
  let proofs = 0;
  const notForMe: Record<string, number> = {};
  const tooEasy: Record<string, number> = {};
  const tooHard: Record<string, number> = {};
  for (const [day, plan] of Object.entries(plans)) {
    if (day < since || day >= before || !plan) continue;
    // Why each swap happened (3.2). "Can't do this today" and "Already did this" say nothing
    // about the mission, so they don't turn its kind down; a plan from before 3.2 has no reasons.
    const why = new Map((plan.swaps ?? []).map(x => [x.from, x]));
    for (const id of plan.replaced ?? []) {
      const m = byId[id];
      if (!m) continue;
      const reason = why.get(id)?.reason;
      if (reason === 'cant-today' || reason === 'already-did') continue;
      const area = why.get(id)?.area ?? m.track;
      if (reason === 'not-relevant') notForMe[id] = (notForMe[id] ?? 0) + 1;
      if (reason === 'too-easy') tooEasy[area] = (tooEasy[area] ?? 0) + 1;
      if (reason === 'too-hard') tooHard[area] = (tooHard[area] ?? 0) + 1;
      // "Too easy" / "Too hard" are about size, not the kind of mission.
      if (reason === 'too-easy' || reason === 'too-hard') continue;
      // "Not relevant" counts twice: one is enough to turn its kind down.
      for (const k of kindsOf(m)) {
        const set = (swapped[k] ??= new Set());
        set.add(id);
        if (reason === 'not-relevant') set.add(`${id}#`);
      }
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
      const bucket = day < shortSince ? null : m.minutes >= LONG_MINUTES ? size.long : m.minutes >= 15 ? size.mid : null;
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
  // Six of each, not three: a focused slot takes 20-minute missions too, so three mid-length ones and
  // two long ones left undone in the first days were enough to turn it on for a month.
  const preferShort =
    size.long.planned >= SHORT_MIN_PLANNED && rate(size.long) < 0.34 && size.mid.planned >= SHORT_MIN_PLANNED && rate(size.mid) >= 0.6;
  const easeIn = (Object.keys(tooHard) as TrackId[]).filter(t => tooHard[t] >= 2 && tooHard[t] > (tooEasy[t] ?? 0));
  const consistent = (Object.keys(area) as TrackId[]).filter(t => area[t].planned >= 8 && area[t].proven >= 6 && rate(area[t]) >= 0.75);
  // "Too easy" twice in an area asks for bigger missions there, as being consistent does.
  const asked = (Object.keys(tooEasy) as TrackId[]).filter(t => tooEasy[t] >= 2 && tooEasy[t] > (tooHard[t] ?? 0));
  const stepUp = [...new Set([...consistent, ...asked])].filter(t => !easeIn.includes(t));
  const timeOfDay = proofs >= 8 ? (morning / proofs >= 0.7 ? 'morning' : evening / proofs >= 0.7 ? 'evening' : null) : null;
  return { ignored, swappedKinds, preferShort, stepUp, timeOfDay, notForMe, easeIn };
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
  // Swapped as "Not relevant": it mostly stays away (still possible if nothing else fits).
  const notForMe = adapt.notForMe?.[m.id] ?? 0;
  if (notForMe) w *= notForMe >= 2 ? 0.1 : 0.25;
  if (adapt.stepUp.includes(area) && m.minutes >= 30) w *= 1.4;
  if (adapt.easeIn?.includes(area)) w *= m.minutes >= 30 ? 0.5 : m.minutes <= 20 ? 1.3 : 1;
  if (adapt.timeOfDay === 'evening' && m.when === 'morning') w *= 0.7;
  if (adapt.timeOfDay === 'morning' && m.when === 'evening') w *= 0.7;
  return w;
}
