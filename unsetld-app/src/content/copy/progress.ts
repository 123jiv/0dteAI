// The Record tab, a day's page, Proof history, Achievements, Stats, the weekly review and
// milestone moments. Every user-facing string for the group. Sentence case except kickers (the
// kicker style uppercases them) and primary button labels.
import type { DayMark } from '../../core/history';
import type { MilestoneDef, MilestoneKey } from '../../core/progress';
import { parseDay, shortDate, type DayKey } from '../../core/time';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "4h 20m", "5h", "25m", "0m". */
function focused(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
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

/** "25:00", or "1:05:00" from an hour: a timer proof on a tile. */
function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 3600) return mmss(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}:${r < 10 ? '0' : ''}${r}`;
}

/** "October 7", or "October 7, 2025" when `ref` (today) is in another year. */
function longDate(day: DayKey, ref?: DayKey): string {
  const d = parseDay(day);
  const year = ref && parseDay(ref).getFullYear() !== d.getFullYear() ? `, ${d.getFullYear()}` : '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${year}`;
}

/**
 * A day on the record as VoiceOver reads it, one sentence per dot: "October 7, perfect day, 3 of
 * 3 proven", "October 9, 1 mission proven", "October 12, today, nothing proven yet", "October 8,
 * missed", "October 8, covered by an Off Day". `before`: earlier than the first day on record.
 * `weekday`: lead with the weekday (a week's row, where the letters are all there is).
 */
function daySaid(
  m: Pick<DayMark, 'day' | 'when' | 'level' | 'proven' | 'planned' | 'covered' | 'legacy'>,
  today: DayKey,
  { before = false, weekday = false }: { before?: boolean; weekday?: boolean } = {},
): string {
  const name = longDate(m.day, today);
  const parts = [weekday ? `${WEEKDAYS[parseDay(m.day).getDay()]}, ${name}` : name];
  if (m.when === 'today') parts.push('today');
  if (m.when === 'future') parts.push('still to come');
  else if (m.proven > 0) {
    if (m.level === 'perfect') parts.push('perfect day');
    parts.push(m.planned ? `${m.proven} of ${m.planned} proven` : `${plural(m.proven, 'mission', 'missions')} proven`);
  } else if (m.legacy) parts.push('on record from before missions');
  else if (m.when === 'today') parts.push('nothing proven yet');
  else if (m.covered) parts.push('covered by an Off Day');
  else parts.push(before ? 'before your record' : 'missed');
  return parts.join(', ');
}

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

export const PROGRESS = {
  focused,
  weekRange,
  mmss,
  clock,
  date,
  longDate,
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

  /**
   * The Record tab: the month's days as dots, what they add up to, your areas and recent proof.
   * Day 1 (nothing on record) is this week's empty dots and one line, no zeros.
   */
  record: {
    title: 'Record',
    share: 'Share your record',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    /** Monday first. */
    letters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    /** A day on the grid, read as one sentence ("October 7, perfect day, 3 of 3 proven"). */
    a11yDay: daySaid,
    a11yDayHint: 'Opens the day.',
    /** The key under the grid: what each dot means. */
    legend: { one: '1 mission', two: '2', perfect: 'Perfect day', off: 'Off Day' },
    a11yLegend: 'A small dot is 1 mission proven, a larger dot 2 or more, a solid dot a perfect day.',
    a11yLegendOff: 'A ring with a line is a missed day an Off Day covered.',
    /** Under the grid, for the month on it: "18 days proven · 42 missions" (kicker style uppercases it). */
    summary: (days: number, missions: number) => `${plural(days, 'day', 'days')} proven · ${plural(missions, 'mission', 'missions')}`,
    /**
     * The momentum line: "12 day streak · 30 days on record" (the streak as Today says it, and the
     * whole record: Today's DAY N). A broken streak says what starts one, never "0 day streak".
     */
    momentum: (streak: number, onRecord: number) =>
      [
        streak > 0 ? `${streak.toLocaleString('en-US')} day streak` : 'Prove a mission today to start a streak',
        onRecord > 0 ? `${plural(onRecord, 'day', 'days')} on record` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    a11ySummary: (days: number, missions: number, streak: number, onRecord: number) =>
      [
        days > 0 ? `This month, ${plural(days, 'day', 'days')} proven, ${plural(missions, 'mission', 'missions')}.` : '',
        streak > 0 ? `${streak.toLocaleString('en-US')} day streak.` : 'Prove a mission today to start a streak.',
        onRecord > 0 ? `${plural(onRecord, 'day', 'days')} on record.` : '',
      ]
        .filter(Boolean)
        .join(' '),

    /** Day 1: nothing on record yet. This week's empty dots, one line, one button. */
    start: {
      week: 'This week',
      line: 'Your first proven mission starts your record.',
      action: 'Start today',
    },

    areas: 'Your areas',
    level: (n: number) => `Level ${n}`,
    /**
     * How far into its level an area is: the points since the level began against what the level
     * takes, "430 / 500" (no second currency). Starts over at each new level, as the meter does.
     */
    areaPoints: (into: number, span: number) => `${into.toLocaleString('en-US')} / ${span.toLocaleString('en-US')}`,
    /** "18 missions · 8h 24m": missions proven and the time put in. */
    areaMeta: (missions: number, seconds: number) =>
      seconds >= 60 ? `${plural(missions, 'mission', 'missions')} · ${focused(Math.floor(seconds / 60))}` : plural(missions, 'mission', 'missions'),
    a11yArea: (name: string, level: number, into: number, span: number, missions: number, seconds: number) =>
      [
        `${name}, level ${level}`,
        `${into.toLocaleString('en-US')} of ${span.toLocaleString('en-US')} toward level ${level + 1}`,
        missions > 0 ? `${plural(missions, 'mission', 'missions')} proven${seconds >= 60 ? `, ${focusedSaid(Math.floor(seconds / 60))} invested` : ''}` : '',
      ]
        .filter(Boolean)
        .join('. ') + '.',

    recent: 'Recent proof',
    viewAll: 'View all proof',
    achievements: 'Achievements',
    achievementsValue: (n: number, of: number) => `${n} of ${of}`,
    stats: 'Stats',
    /** Rewards off (no Rewards tab): the point total, and where it's explained. */
    points: 'How points work',
    pointsValue: (n: number) => plural(n, 'point', 'points'),
  },

  /** Record › a day: each mission proven, its points, the bonus and the total. */
  day: {
    /** "Day 12": the day's place among the days with a mission proven. */
    number: (n: number) => `Day ${n.toLocaleString('en-US')}`,
    /** "October 7", or "October 7, 2025" from another year. */
    title: (day: DayKey, today: DayKey) => longDate(day, today),
    /**
     * Under the title: "3 / 3 · Perfect day", "2 / 3 proven", "1 mission proven" (the day's size
     * unknown), "On record from before missions" (2.x), "Nothing proven yet today".
     */
    status: ({ proven, planned, perfect, legacy, today }: { proven: number; planned: number | null; perfect: boolean; legacy: boolean; today: boolean }) => {
      if (proven > 0 && perfect) return `${proven} / ${Math.max(planned ?? proven, proven)} · Perfect day`;
      if (proven > 0) return planned ? `${proven} / ${planned} proven` : `${plural(proven, 'mission', 'missions')} proven`;
      if (legacy) return 'On record from before missions';
      return today ? 'Nothing proven yet today' : 'Nothing proven this day';
    },
    goToday: 'Go to today',
    proven: 'Proven',
    notProven: 'Not proven',
    stillToDo: 'Still to do',
    plus: (n: number) => `+${n.toLocaleString('en-US')}`,
    /** "School · 9:42 AM" (the time never breaks before AM). */
    meta: (area: string, time: string) => [area, time.replace(' ', '\u00A0')].filter(Boolean).join(' · '),
    a11yRow: (title: string, area: string, time: string, points: number) =>
      `${title}. ${[area, `proven ${time}`, plural(points, 'point', 'points')].filter(Boolean).join(', ')}.`,
    a11yRowHint: 'Opens the photo.',
    a11yOpen: (title: string, today: boolean) => `${title}, ${today ? 'still to do' : 'not proven'}.`,
    a11yLegacy: (text: string, time: string) => (time ? `${text}, ${time}.` : `${text}.`),
    bonus: 'Perfect day bonus',
    total: 'Total',
    pts: 'pts',
    a11yBonus: (n: number) => `Perfect day bonus, ${plural(n, 'point', 'points')}.`,
    a11yTotal: (n: number) => `Total, ${plural(n, 'point', 'points')}.`,
  },

  /** Record › Achievements: milestones reached, then the next three. */
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

  /** Record › Stats: the detailed numbers the Record leaves out. */
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
    /** The way back to the weekly review (this week's, or last week's on Monday and Tuesday). */
    review: 'Weekly review',
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
    /**
     * "18 missions · 340 pts · 8h 24m invested": the area's points (its level, no second currency)
     * and the time (timer time where it ran, else the mission's minutes).
     */
    areaLine: (missions: number, xp: number, seconds: number) =>
      `${plural(missions, 'mission', 'missions')} · ${xp.toLocaleString('en-US')} pts · ${focused(Math.floor(seconds / 60))} invested`,
    level: (n: number) => `Level ${n}`,
    a11yArea: (name: string, level: number, missions: number, xp: number, seconds: number) =>
      `${name}, level ${level}. ${plural(missions, 'mission', 'missions')}, ${plural(xp, 'point', 'points')}, ${focusedSaid(Math.floor(seconds / 60))} invested.`,
    empty: { title: 'No numbers yet.', body: 'Prove a mission and your stats start here.' },
  },

  /** The weekly review (a modal from Today on Sundays). */
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

  /** Record › Proof history (§8): the private record of every proof, by date, mission or area. */
  history: {
    title: 'Proof history',
    privacy: 'Only on this phone. Never posted anywhere.',
    /** How the history is organised: by month (the default), by mission or by area. */
    by: { date: 'Date', mission: 'Mission', area: 'Area' },
    a11yBy: 'Show proof by',
    /** A mission's or an area's section: its name and how many proofs ("Study One Subject for 30 Minutes", "12"). */
    count: (n: number) => n.toLocaleString('en-US'),
    a11ySection: (name: string, n: number) => `${name}, ${plural(n, 'proof', 'proofs')}`,
    /** The section for proofs in an area the app no longer has. */
    otherArea: 'Other',
    /** In the viewer: the proof's day on the record. */
    openDay: 'Open this day',
    /** "19 active days · 47 missions proven" */
    monthMeta: (days: number, missions: number) => `${plural(days, 'active day', 'active days')} · ${plural(missions, 'mission', 'missions')} proven`,
    empty: { title: 'Your proof builds up here.', body: 'Every mission you prove, by month.' },
    /** Under the grid: what happens to photos. */
    keep: (days: number) =>
      days === 0
        ? 'Photos are kept until you clear them. Change it in You › Proof photos.'
        : `Photos are cleared after ${days === 365 ? 'a year' : `${days} days`}; the record stays. Change it in You › Proof photos.`,
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
     * A mission nothing knows (not approved, not the user's own, not one retired in 3.3): its id
     * made readable ("focus-plan-tomorrow-tonight" → "Plan tomorrow tonight"), else "<area>
     * mission" from the area on the record, else "Mission".
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
