// A mission's title for this user (docs/MISSIONS_SPEC.md §4, Personalization). Only the slot
// an approved mission names ({project}, {subject}, {opportunity}, {skill}) is filled, from the
// user's own goal or skills; the action never changes, and when nothing clear comes out of the
// goal the approved title stands as it is. No text is generated: each slot is a word or two
// lifted from what the user wrote, or a known name ("Coding"). The mission id stays the
// approved one, so the record and analytics see one mission however it reads.
import { goalLean } from './personalize';
import type { Mission, Profile, SkillId } from './types';

export type Slot = NonNullable<Mission['personalize']>;

/** What a goal can name for a project: the thing being built. Anything else keeps the plain title. */
const PROJECT_NOUNS = new Set([
  'app', 'apps', 'brand', 'business', 'website', 'site', 'store', 'shop', 'channel', 'podcast', 'startup', 'company',
  'game', 'line', 'label', 'blog', 'newsletter', 'product', 'book', 'album', 'film', 'portfolio', 'project', 'agency',
  'page', 'collection',
]);

/** Words that can sit in front of the thing ("clothing brand", "youtube channel"), at most two. */
const PROJECT_LEAD = /^[a-z][a-z'-]{1,15}$/;
/** Never part of a project's name. */
const NOT_A_NAME = new Set(['my', 'a', 'an', 'the', 'one', 'own', 'new', 'first', 'real', 'big', 'small', 'better', 'successful', 'side', 'some']);
/** A count in front of the thing ("Finish one book a month") counts things done; it doesn't name a project. */
const COUNT = /^(one|two|three|four|five|ten|\d+)$/i;

const SUBJECTS: Record<string, string> = {
  calculus: 'Calculus', precalculus: 'Precalculus', 'pre-calculus': 'Precalculus', algebra: 'Algebra', geometry: 'Geometry',
  trigonometry: 'Trigonometry', trig: 'Trigonometry', statistics: 'Statistics', math: 'Math', maths: 'Math',
  chemistry: 'Chemistry', chem: 'Chemistry', biology: 'Biology', physics: 'Physics', history: 'History',
  english: 'English', spanish: 'Spanish', french: 'French', german: 'German', chinese: 'Chinese', latin: 'Latin',
  economics: 'Economics', econ: 'Economics', psychology: 'Psychology', accounting: 'Accounting', anatomy: 'Anatomy',
  'computer science': 'Computer Science',
};

/** A field an opportunity can be in ("a finance internship", "a software job"). */
const FIELDS: Record<string, string> = {
  software: 'Software', finance: 'Finance', marketing: 'Marketing', design: 'Design', data: 'Data', engineering: 'Engineering',
  nursing: 'Nursing', sales: 'Sales', accounting: 'Accounting', consulting: 'Consulting', product: 'Product',
  research: 'Research', tech: 'Tech', coding: 'Coding', developer: 'Developer', web: 'Web', ux: 'UX', retail: 'Retail',
  summer: 'Summer', 'part-time': 'Part-Time', remote: 'Remote', banking: 'Banking', it: 'IT', law: 'Law', media: 'Media',
  fashion: 'Fashion', healthcare: 'Healthcare', film: 'Film', music: 'Music', sports: 'Sports',
};

const SKILL_NAMES: Record<SkillId, string> = {
  coding: 'Coding',
  design: 'Design',
  video: 'Video Editing',
  writing: 'Writing',
  language: 'Your Language',
  music: 'Your Instrument',
};

const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase());

/**
 * The thing a goal says the user is building: "Launch my clothing brand" → "Your Clothing
 * Brand", "Build and ship an app" → "Your App", "Launch UNSETLD" → "UNSETLD". null when the goal
 * doesn't clearly name one.
 */
export function projectFrom(goal: string | null | undefined): string | null {
  if (!goal) return null;
  const m = /\b(?:launch|build|start|grow|run|ship|finish|make|create|scale|open|release|publish)(?:\s+and\s+[a-z]+)?\s+(.{1,40})/i.exec(goal);
  if (!m) return null;
  const rest = m[1].split(/\s+(?:and|by|to|this|before|in|for|while|with|that|so|from|on)\b|[,.;!?]/i)[0].trim();
  const words = rest.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  // A name the user wrote in capitals: "Launch UNSETLD", "Grow Northline". A word that's only
  // capitalised ("Build Muscle", "Start Running", "Finish Chemistry") is what they're doing, not a
  // name, when it's a goal keyword, a school subject or an -ing word (all capitals, or capitals
  // inside, still name one: "YouTube").
  const first = words.find(w => !NOT_A_NAME.has(w.toLowerCase()));
  if (first && words.length <= 2 && /^[A-Z][A-Za-z0-9]{1,19}$/.test(first) && !PROJECT_NOUNS.has(first.toLowerCase()) && words.indexOf(first) === words.length - 1) {
    const word = first.toLowerCase();
    const plain = !/[A-Z]/.test(first.slice(1));
    const lean = goalLean(word);
    if (!plain || !(lean.areas.length || lean.tags.length || Object.prototype.hasOwnProperty.call(SUBJECTS, word) || word.endsWith('ing'))) return first;
  }
  const firstNoun = words.findIndex(w => PROJECT_NOUNS.has(w.toLowerCase()));
  if (words.slice(0, Math.max(0, firstNoun)).some(w => COUNT.test(w))) return null;
  const kept = words.filter(w => !NOT_A_NAME.has(w.toLowerCase()));
  const lower = kept.map(w => w.toLowerCase());
  const nounAt = lower.findIndex(w => PROJECT_NOUNS.has(w));
  if (nounAt < 0 || nounAt > 2) return null;
  if (!lower.slice(0, nounAt).every(w => PROJECT_LEAD.test(w))) return null;
  if (nounAt === 0 && lower[0] === 'project') return null;
  // A sport in front of "game" ("Make my basketball game better") is how they play, not a game they're making.
  if (lower[nounAt] === 'game' && lower.slice(0, nounAt).some(w => goalLean(w).areas[0] === 'fitness')) return null;
  // As the user wrote a name with capitals inside it ("YouTube"); otherwise title case.
  const phrase = kept.slice(0, nounAt + 1).map(w => (/[A-Z]/.test(w.slice(1)) ? w : titleCase(w.toLowerCase())));
  return `Your ${phrase.join(' ')}`;
}

/** One school subject the goal names ("Pass calculus" → "Calculus"); null for none or more than one. */
export function subjectFrom(goal: string | null | undefined): string | null {
  if (!goal) return null;
  const text = goal.toLowerCase();
  const found = new Set<string>();
  for (const [k, v] of Object.entries(SUBJECTS)) if (new RegExp(`\\b${k.replace('-', '\\-')}\\b`).test(text)) found.add(v);
  return found.size === 1 ? [...found][0] : null;
}

/** The opportunity the goal names: "Get a finance internship" → { one: 'Finance Internship', many: 'Finance Internships' }. */
export function opportunityFrom(goal: string | null | undefined): { one: string; many: string } | null {
  if (!goal) return null;
  const m = /\b([a-z-]+)\s+(internship|job)s?\b/i.exec(goal);
  if (!m) return null;
  const field = FIELDS[m[1].toLowerCase()];
  if (!field) return null;
  const kind = m[2].toLowerCase() === 'job' ? 'Job' : 'Internship';
  return { one: `${field} ${kind}`, many: `${field} ${kind}s` };
}

/** The skill to name: the one the goal mentions, else the only one they picked. */
export function skillFrom(profile: Pick<Profile, 'skills' | 'goal'>): string | null {
  const skills = profile.skills ?? [];
  if (!skills.length) return null;
  const goal = (profile.goal ?? '').toLowerCase();
  const named = skills.find(s => goal.includes(s === 'coding' ? 'cod' : s === 'video' ? 'video' : s));
  const pick = named ?? (skills.length === 1 ? skills[0] : null);
  return pick ? SKILL_NAMES[pick] : null;
}

/**
 * The title the user sees for a mission: its template with the slot filled from their goal
 * or skills, or the approved title when there's nothing clear to fill it with.
 */
export function missionTitle(m: Pick<Mission, 'title' | 'template' | 'personalize'>, profile: Pick<Profile, 'goal' | 'skills'>): string {
  if (!m.template || !m.personalize) return m.title;
  let fill: string | null = null;
  if (m.personalize === 'project') fill = projectFrom(profile.goal);
  else if (m.personalize === 'subject') fill = subjectFrom(profile.goal);
  else if (m.personalize === 'skill') fill = skillFrom(profile);
  else if (m.personalize === 'opportunity') {
    const o = opportunityFrom(profile.goal);
    if (o) return m.template.replace('{opportunity}', o.one).replace('{opportunities}', o.many);
  }
  if (!fill) return m.title;
  return m.template.replace(/\{(project|subject|skill)\}/, fill);
}
