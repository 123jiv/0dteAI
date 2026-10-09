// Progress, the weekly review, milestone moments and the proof gallery (spec sections 7–9).
// Every user-facing string for the group.
import type { MilestoneKey } from '../../core/progress';
import { parseDay, shortDate, type DayKey } from '../../core/time';
import type { MissionSlot, Track } from '../../core/types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "4h 20m", "25m", "0m". */
function focused(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** "4 hours 20 minutes", for VoiceOver. */
function focusedSaid(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hs = h === 1 ? '1 hour' : `${h} hours`;
  const ms = m === 1 ? '1 minute' : `${m} minutes`;
  return h ? (m ? `${hs} ${ms}` : hs) : ms;
}

/** "5–11 OCT", or "29 SEP – 5 OCT" across a month. */
function weekRange(from: DayKey, to: DayKey): string {
  const a = parseDay(from);
  const b = parseDay(to);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${shortDate(from)} – ${shortDate(to)}`;
}

/** "Skills & Projects" from "SKILLS & PROJECTS". */
function areaName(t: Pick<Track, 'name'>): string {
  return t.name
    .toLowerCase()
    .split(' ')
    .map(w => (w === '&' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** "25:00" from seconds. */
function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

/** "SO FAR · 4 DAYS LEFT" */
function soFar(left: number): string {
  return left === 1 ? 'SO FAR · 1 DAY LEFT' : `SO FAR · ${left} DAYS LEFT`;
}

const SLOT: Record<MissionSlot, string> = { quick: 'QUICK WIN', progress: 'PROGRESS', challenge: 'CHALLENGE' };

/** One per milestone: the big title and one plain sentence. */
const MOMENTS: Record<MilestoneKey, { title: string; line: string }> = {
  'first-mission': { title: 'FIRST MISSION.', line: 'The first one is proven. Now do it again tomorrow.' },
  'missions-10': { title: '10 MISSIONS.', line: 'Ten times you said you would, and then you did.' },
  'perfect-day': { title: 'PERFECT DAY.', line: 'Every mission on the list, proven in one day.' },
  'streak-7': { title: '7 DAYS.', line: 'A full week without a gap. That is how habits start.' },
  'missions-30': { title: '30 MISSIONS.', line: 'Thirty proven. This is what you do now.' },
  'missions-100': { title: '100 MISSIONS.', line: 'A hundred proven. Most people stop long before ten.' },
  'streak-30': { title: '30 DAYS.', line: 'A month in a row. Keep the bar where it is.' },
};

export const PROGRESS = {
  focused,
  focusedSaid,
  weekRange,
  areaName,
  mmss,
  slot: SLOT,
  /** "Tuesday" */
  weekday: (day: DayKey) => WEEKDAYS[parseDay(day).getDay()],
  days: (n: number) => (n === 1 ? 'day' : 'days'),
  /** "1,290" */
  number: (n: number) => n.toLocaleString('en-US'),
  /** What VoiceOver reads for a labelled number: "streak, 12 days". */
  said: (label: string, value: string) => `${label.toLowerCase()}, ${value}`,
  close: 'Close',
  settings: 'Settings',

  screen: {
    title: 'Progress',
    stats: {
      streak: 'STREAK',
      longest: 'LONGEST',
      missions: 'MISSIONS',
      points: 'POINTS',
      focused: 'FOCUSED',
      week: 'THIS WEEK',
      /** Unit after the points total: everything earned, before any reward was taken. */
      earned: 'earned',
      /** Completion this week, "67%"; a dash before anything was planned. */
      percent: (done: number, planned: number) => (planned ? `${Math.round((done / planned) * 100)}%` : '–'),
      a11yWeek: (done: number, planned: number) => (planned ? `This week, ${done} of ${planned} missions proven` : 'This week, nothing planned yet'),
    },

    activeLabel: 'ACTIVE DAYS',
    activeCount: (n: number) => (n === 1 ? '1 DAY' : `${n} DAYS`),
    today: 'TODAY',
    a11yBarcode: (n: number, since: string) =>
      n === 0 ? 'No active days yet. A day counts once a mission is proven.' : `${n} active ${n === 1 ? 'day' : 'days'} since ${since}.`,
    activeNote: 'A day counts once a mission is proven.',

    offLabel: 'OFF DAYS',
    offBanked: (n: number, max: number) => `${n} OF ${max} BANKED`,
    offExplain: 'Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.',
    offCovered: (weekday: string) => `An Off Day covered ${weekday}. Streak's still going.`,
    a11yOff: (n: number, max: number) => `Off Days, ${n} of ${max} banked.`,

    levelsLabel: 'LEVELS',
    levelsNote: 'Every proven mission adds its points to its area.',
    level: (n: number) => `LEVEL ${n}`,
    xp: (into: number, span: number) => `${into} / ${span}`,
    a11yLevel: (name: string, level: number, into: number, span: number) =>
      `${name}, level ${level}. ${into} of ${span} points to level ${level + 1}.`,

    milestonesLabel: 'MILESTONES',
    milestoneProgress: (n: number, target: number) => `${n} / ${target}`,
    a11yReached: (title: string, date: string) => `${title}. Reached ${date}.`,
    a11yOpen: (title: string, n: number, target: number) => `${title}. ${n} of ${target}.`,
    a11yReachedHint: 'Opens the moment.',

    weekLabel: 'THIS WEEK',
    seeWeek: 'See the week →',
    a11ySeeWeek: 'See the week',

    proofRow: 'Proof photos',
    proofCount: (n: number) => String(n),
    a11yProofRow: (n: number) => (n === 1 ? 'Proof photos, 1 mission' : `Proof photos, ${n} missions`),
  },

  /** The four numbers on the weekly review and the This week block. */
  week: {
    missions: 'MISSIONS',
    focused: 'FOCUSED',
    points: 'POINTS',
    perfect: 'PERFECT DAYS',
    a11y: (missions: number, minutes: number, points: number, perfect: number) =>
      `${missions} ${missions === 1 ? 'mission' : 'missions'}, ${focusedSaid(minutes)} focused, ${points} points, ${perfect} perfect ${perfect === 1 ? 'day' : 'days'}.`,
  },

  review: {
    thisWeek: 'THIS WEEK',
    lastWeek: 'LAST WEEK',
    week: 'WEEK',
    soFar,
    /** "5–11 OCT", or "5–11 OCT · SO FAR · 4 DAYS LEFT" while the week is still on. */
    dates: (range: string, left: number) => (left > 0 ? `${range} · ${soFar(left)}` : range),
    strongest: (name: string) => `Strongest area: ${name}`,
    didntGetTo: (short: string) => `Didn't get to: ${short}.`,
    empty: 'No missions proven this week. Pick an area below and start with one.',
    nextLabel: 'NEXT WEEK',
    nextBody: 'Pick one area to lean on.',
    leaning: (short: string) => `${short} takes the progress slot most days.`,
    a11yChip: (name: string) => `Lean on ${name}`,
    footer: 'Never settle for less.',
    done: 'Done',
  },

  moment: {
    byKey: MOMENTS,
    /** "REACHED 9 OCT" */
    reached: (date: string) => `REACHED ${date}`,
    footer: 'Never settle for less.',
    close: 'Close',
    a11yDate: (date: string) => `Reached ${date}`,
  },

  gallery: {
    title: 'Proof',
    empty: 'No proof yet.',
    emptyBody: 'Prove a mission and its photo shows up here.',
    /** Placeholder for a photo the retention setting cleared. */
    cleared: (days: number) => (days === 365 ? 'Photo cleared after a year' : days > 0 ? `Photo cleared after ${days} days` : 'Photo cleared'),
    notHere: 'Not on this phone',
    note: (days: number) =>
      days === 0
        ? 'Photos stay on this phone and are kept until you clear them. The missions stay on your record either way.'
        : `Photos stay on this phone and are cleared after ${days === 365 ? 'a year' : `${days} days`}. The missions stay on your record.`,
    before: 'Before',
    after: 'After',
    stampBefore: 'BEFORE',
    stampAfter: 'AFTER',
    proven: (time: string, date: string, points: number) => `PROVEN ${time} · ${date} · +${points} POINTS`,
    timer: (seconds: number) => `${mmss(seconds)} FOCUSED`,
    checked: 'Checked on this phone.',
    a11yThumb: (title: string, date: string) => `${title}, proven ${date}. Opens the photo.`,
    a11yPhoto: (title: string) => `Proof photo for ${title}`,
    /** A mission no longer in the library: its id, made readable. */
    fallbackTitle: (missionId: string) => {
      const words = missionId.split('-').slice(1).join(' ');
      return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Mission';
    },
  },
} as const;
