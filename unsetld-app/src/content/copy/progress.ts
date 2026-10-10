// Progress, Achievements, Stats, Proof history, the weekly review and milestone moments
// (docs/UX_REDESIGN.md §7–8). Every user-facing string for the group. Sentence case except
// kickers (the kicker style uppercases them) and primary button labels.
import type { MilestoneDef, MilestoneKey, WeekDayKind } from '../../core/progress';
import { parseDay, shortDate, type DayKey } from '../../core/time';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

/** "9 Oct", or "9 Oct 2025" when `ref` (today) is in another year. */
function date(day: DayKey, ref?: DayKey): string {
  const d = parseDay(day);
  const year = ref && parseDay(ref).getFullYear() !== d.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MON[d.getMonth()]}${year}`;
}

/** "5–11 Oct", or "29 Sep – 5 Oct" across a month. */
function weekRange(from: DayKey, to: DayKey): string {
  const a = parseDay(from);
  const b = parseDay(to);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}`;
  return `${date(from)} – ${date(to)}`;
}

/** "25:00" from seconds. */
function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** "Tuesday", "Tuesday and Thursday", "Monday, Tuesday and Thursday". */
const listed = (words: readonly string[]) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : (words[0] ?? ''));

/** One per milestone: the big title and one plain sentence (the Moment page). */
const MOMENTS: Record<MilestoneKey, { title: string; line: string }> = {
  'first-mission': { title: 'FIRST MISSION.', line: 'Your first mission, proven.' },
  'missions-10': { title: '10 MISSIONS.', line: 'Ten times you said you would, and then you did.' },
  'perfect-day': { title: 'PERFECT DAY.', line: 'Every mission on the list, proven in one day.' },
  'streak-7': { title: '7 DAYS.', line: 'Seven days in a row.' },
  'missions-30': { title: '30 MISSIONS.', line: 'Thirty proven. This is what you do now.' },
  'missions-100': { title: '100 MISSIONS.', line: 'A hundred missions proven.' },
  'streak-30': { title: '30 DAYS.', line: 'Thirty days in a row.' },
};

/** Achievements: the name of each milestone and what it takes. */
const ACHIEVEMENTS: Record<MilestoneKey, { title: string; how: string }> = {
  'first-mission': { title: 'First mission', how: 'Prove any mission.' },
  'missions-10': { title: '10 missions', how: 'Prove 10 missions.' },
  'perfect-day': { title: 'First perfect day', how: 'Prove every mission on one day.' },
  'streak-7': { title: '7-day streak', how: 'Prove a mission 7 days in a row.' },
  'missions-30': { title: '30 missions', how: 'Prove 30 missions.' },
  'missions-100': { title: '100 missions', how: 'Prove 100 missions.' },
  'streak-30': { title: '30-day streak', how: 'Prove a mission 30 days in a row.' },
};

const WEEK_KIND: Record<WeekDayKind, string> = {
  proven: 'proven',
  covered: 'covered by an Off Day',
  missed: 'missed',
  today: 'today, nothing proven yet',
  'today-proven': 'today, proven',
  ahead: 'still to come',
  before: 'before your first mission',
};

export const PROGRESS = {
  focused,
  weekRange,
  mmss,
  date,
  /** "Tuesday" */
  weekday: (day: DayKey) => WEEKDAYS[parseDay(day).getDay()],
  /** "October", or "October 2025" outside the current year. `month` is 'YYYY-MM'. */
  month: (month: string, thisYear: string) => {
    const [y, m] = month.split('-');
    const name = MONTHS[Number(m) - 1] ?? month;
    return y === thisYear ? name : `${name} ${y}`;
  },
  /** "1,290" */
  number: (n: number) => n.toLocaleString('en-US'),

  /** The Progress tab (§7). */
  screen: {
    title: 'Progress',
    share: 'Share your progress',
    /** Day 1: nothing proven yet. One empty state instead of the numbers. */
    empty: {
      title: 'Your record starts with your first mission.',
      body: 'Prove one of today’s missions and it shows up here.',
      action: 'Go to today',
    },
    /**
     * Days on record from 2.x and nothing proven since (only a 2.x record gets here: since 3.0 a
     * day goes on record only through a proof). The days are kept, so they're said, not denied.
     */
    before: {
      title: (n: number) => (n === 1 ? 'Your 1 day from before missions is on record.' : `Your ${plural(n, 'day', 'days')} from before missions are on record.`),
      body: 'Prove one of today’s missions to start your streak here.',
    },
    streakLabel: 'Day streak',
    /** In place of a 0 streak once there's history: the streak broke. */
    streakAgain: 'Prove a mission today to start a new streak.',
    longest: (n: number) => `Longest ${plural(n, 'day', 'days')}`,
    todayLabel: 'Today',
    perfect: 'Perfect day',
    a11yStreak: (n: number) => `Current streak, ${plural(n, 'day', 'days')}`,
    a11yToday: (done: number, of: number) => `Today, ${done} of ${of} missions proven`,

    week: 'This week',
    /** Right of THIS WEEK: "2 active days"; nothing before the week's first. */
    weekCount: (n: number) => (n ? plural(n, 'active day', 'active days') : ''),
    letters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    a11yWeek: (summary: string) => `This week. ${summary}`,
    a11yDay: (day: DayKey, kind: WeekDayKind) => `${WEEKDAYS[parseDay(day).getDay()]}, ${WEEK_KIND[kind]}`,
    a11yWeekHint: 'Opens the week',
    /** Under the squares, when an Off Day covered a day this week. `going`: that day is in the streak running now. */
    weekOff: (weekdays: readonly string[], going: boolean) =>
      `${weekdays.length === 1 ? 'An Off Day' : 'Off Days'} covered ${listed(weekdays)}.${going ? ' Your streak is still going.' : ''}`,

    areas: 'Your areas',
    level: (n: number) => `Level ${n}`,
    /** XP into the level, against what the level takes: "75 / 150 XP to level 4" (Stats has the total). */
    xp: (into: number, span: number, level: number) => `${into} / ${span} XP to level ${level + 1}`,
    /** "18 missions · 8h 24m" */
    areaMeta: (missions: number, seconds: number) => `${plural(missions, 'mission', 'missions')} · ${focused(Math.floor(seconds / 60))} invested`,
    /** An area the user chose with nothing proven in it yet: no zeros. */
    areaStart: (short: string) => `Your first ${short} mission starts it.`,
    a11yArea: (name: string, level: number, into: number, span: number, missions: number, seconds: number) =>
      `${name}, level ${level}. ${into} of ${span} XP to level ${level + 1}. ${plural(missions, 'mission', 'missions')}, ${focusedSaid(Math.floor(seconds / 60))} invested.`,
    a11yAreaStart: (name: string) => `${name}, level 1. Your first ${name} mission starts it.`,

    proofs: 'Proof history',
    proofsValue: (n: number) => plural(n, 'proof', 'proofs'),
    achievements: 'Achievements',
    achievementsValue: (n: number, of: number) => `${n} of ${of}`,
    stats: 'Stats',
    /** Rewards off (no Rewards tab): the point total, and where it's explained. */
    points: 'How points work',
    pointsValue: (n: number) => plural(n, 'point', 'points'),
  },

  /** Progress › Achievements: milestones reached, then the next three. */
  achievements: {
    title: 'Achievements',
    byKey: ACHIEVEMENTS,
    reached: 'Reached',
    next: 'Next',
    /** Progress toward one not reached yet; '' when there's nothing to count (the how line says it). */
    progress: (kind: MilestoneDef['kind'], n: number, target: number) =>
      n <= 0 || kind === 'perfect' ? '' : kind === 'streak' ? `Longest streak ${n} of ${target} days` : `${n} of ${target}`,
    empty: { title: 'Nothing reached yet.', body: 'Your first proven mission is the first one.' },
    allReached: 'Every achievement reached.',
    a11yReached: (title: string, day: DayKey, today: DayKey) => `${title}. Reached ${date(day, today)}.`,
    a11yReachedHint: 'Opens the moment.',
    a11yNext: (title: string, how: string, progress: string) => [title, how, progress].filter(Boolean).join('. '),
  },

  /** Progress › Stats: the detailed numbers. */
  stats: {
    title: 'Stats',
    allTime: 'All time',
    longest: 'Longest streak',
    missions: 'Missions proven',
    points: 'Points earned',
    focused: 'On the focus timer',
    streakDays: (n: number) => plural(n, 'day', 'days'),
    week: 'This week',
    weekPercent: (done: number, planned: number) => `${Math.round((done / planned) * 100)}%`,
    weekLine: (done: number, planned: number) => `${done} of ${planned} missions proven`,
    a11yWeek: (done: number, planned: number) => `This week, ${Math.round((done / planned) * 100)} percent: ${done} of ${planned} missions proven.`,
    active: 'Active days',
    activeSince: (n: number, since: DayKey, today: DayKey) => `${plural(n, 'day', 'days')} since ${date(since, today)}`,
    today: 'TODAY',
    a11yBarcode: (n: number, since: DayKey, today: DayKey) => `${plural(n, 'active day', 'active days')} since ${date(since, today)}.`,
    off: 'Off Days',
    offBanked: (n: number, max: number) => `${n} of ${max} banked`,
    offExplain: 'Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.',
    offCovered: (weekday: string) => `An Off Day covered ${weekday}. Your streak is still going.`,
    a11yOff: (n: number, max: number) => `Off Days, ${n} of ${max} banked.`,
    byArea: 'By area',
    /** "18 missions · 340 XP total · 8h 24m invested" (timer time where it ran, else the mission's minutes). */
    areaLine: (missions: number, xp: number, seconds: number) =>
      `${plural(missions, 'mission', 'missions')} · ${xp.toLocaleString('en-US')} XP total · ${focused(Math.floor(seconds / 60))} invested`,
    level: (n: number) => `Level ${n}`,
    a11yArea: (name: string, level: number, missions: number, xp: number, seconds: number) =>
      `${name}, level ${level}. ${plural(missions, 'mission', 'missions')}, ${xp} XP total, ${focusedSaid(Math.floor(seconds / 60))} invested.`,
    empty: { title: 'No numbers yet.', body: 'Prove a mission and your stats start here.' },
  },

  /** The weekly review (a modal from Today on Sundays, or the week from Progress). */
  review: {
    thisWeek: 'This week',
    lastWeek: 'Last week',
    week: 'Week',
    /** "5–11 Oct", or "5–11 Oct · 2 days left" while the week is still on. */
    dates: (range: string, left: number) => (left > 0 ? `${range} · ${plural(left, 'day', 'days')} left` : range),
    /** "2 days left", under the dates while the week is still on. */
    daysLeft: (left: number) => `${plural(left, 'day', 'days')} left`,
    missions: 'Missions',
    focused: 'On the focus timer',
    points: 'Points',
    perfect: (n: number) => (n === 1 ? 'Perfect day' : 'Perfect days'),
    a11y: (missions: number, minutes: number, points: number, perfect: number) =>
      [plural(missions, 'mission', 'missions'), minutes ? `${focusedSaid(minutes)} on the focus timer` : '', plural(points, 'point', 'points'), perfect ? plural(perfect, 'perfect day', 'perfect days') : '']
        .filter(Boolean)
        .join(', ') + '.',
    strongest: 'Strongest',
    didntGetTo: 'Didn’t get to',
    /** A week with nothing proven: still going, or already over. */
    empty: 'Nothing proven yet this week. One mission today starts it.',
    emptyPast: 'Nothing proven that week. This week starts with one mission.',
    /** The weekly focus for the week after the one reviewed (or the one that just started). */
    nextLabel: 'Next week',
    nowLabel: 'This week',
    nextBody: 'What matters most? Pick one and your missions lean toward it.',
    /** Once one is picked: for next week (from the Sunday review), or the week that just started. */
    setNext: 'From Monday, your missions lean toward it.',
    setNow: 'Your missions lean toward it this week.',
    a11yOption: (label: string) => `Focus on: ${label}`,
    done: 'Done',
  },

  moment: {
    byKey: MOMENTS,
    /** "Reached 9 Oct" (kicker), "Reached 9 Oct 2025" from another year. */
    reached: (day: DayKey, today: DayKey) => `Reached ${date(day, today)}`,
    footer: 'Never settle for less.',
    close: 'Close',
    a11yDate: (day: DayKey, today: DayKey) => `Reached ${date(day, today)}`,
  },

  /** Progress › Proof history (§8): the private record, by month. */
  history: {
    title: 'Proof history',
    privacy: 'Only on this phone. Never posted anywhere.',
    /** "19 active days · 47 missions proven" */
    monthMeta: (days: number, missions: number) => `${plural(days, 'active day', 'active days')} · ${plural(missions, 'mission', 'missions')} proven`,
    empty: { title: 'Your proof builds up here.', body: 'Every mission you prove, by month.' },
    /** Under the grid: what happens to photos. */
    keep: (days: number) =>
      days === 0
        ? 'Photos are kept until you clear them. Change it in You › Proof photos.'
        : `Photos are cleared after ${days === 365 ? 'a year' : `${days} days`}; the record stays. Change it in You › Proof photos.`,
    /** Timer tile: "25 min". */
    timerTile: (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`,
    /** Placeholder for a photo the retention setting cleared (the viewer). */
    cleared: (days: number) => (days === 365 ? 'Photo cleared after a year' : days > 0 ? `Photo cleared after ${days} days` : 'Photo cleared'),
    notHere: 'Not on this phone',
    a11yTile: (title: string, area: string, day: DayKey, today: DayKey, state: 'photo' | 'cleared' | 'missing' | 'timer' | 'none', seconds = 0) =>
      [
        title,
        area,
        `proven ${date(day, today)}`,
        state === 'cleared' ? 'photo cleared' : state === 'missing' ? 'photo not on this phone' : state === 'timer' ? `${focusedSaid(Math.round(seconds / 60))} on the timer` : '',
      ]
        .filter(Boolean)
        .join(', ') + '.',
    a11yTileHint: 'Opens the proof.',
    before: 'Before',
    after: 'After',
    stampBefore: 'BEFORE',
    stampAfter: 'AFTER',
    /** "Proven 9:47 AM · 12 Oct · +15 pts" ("12 Oct 2025" from another year). */
    proven: (time: string, day: DayKey, today: DayKey, points: number) => `Proven ${time} · ${date(day, today)} · +${points} pts`,
    timer: (seconds: number) => `${mmss(seconds)} on the focus timer`,
    timerLabel: 'Focus timer',
    checked: 'Checked on this phone.',
    a11yPhoto: (title: string) => `Proof photo for ${title}`,
    /**
     * A mission no longer in the library: its id made readable ("focus-plan-tomorrow-tonight" →
     * "Plan tomorrow tonight"), else "<area> mission" from the area on the record, else "Mission".
     */
    fallbackTitle: (missionId: string, area = '') => {
      const words = missionId.split('-').slice(1).join(' ').trim();
      if (words) return words.charAt(0).toUpperCase() + words.slice(1);
      return area ? `${area} mission` : 'Mission';
    },
  },
} as const;

/** "9 OCT", for the mono stamp on tiles (kept with the stamp's style). */
export const tileDate = (day: DayKey) => shortDate(day);
