// Local notifications: mission reminders (spec section 13), drop alerts and the
// trial reminder. The timer-done notification lives in timerNotify.ts.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dayReminderTimes, planNotifications, type PlannedNotification } from '../core/reminders';
import { dayKeyOf, type DayKey } from '../core/time';
import { MISSION_BY_ID, PROMPTS } from '../content';
import { PLATFORM } from '../content/copy/platform';

const N = PLATFORM.notifications;
const supported = Platform.OS !== 'web';
/** Reminder ids. 'night-' cancels the night checks 2.x scheduled. */
const OWN_PREFIXES = ['rem-', 'night-'];
/** The 2.x night check's category (Held / Not today). Removed on launch. */
const OLD_NIGHT_CATEGORY = 'NIGHT_CHECK';

let configured = false;

/** Called once at module scope (index.ts), before the first render, so a tap that launched the app is heard. */
export function configureNotifications() {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  // The night check is gone: its Held / Not today buttons go with it.
  Notifications.deleteNotificationCategoryAsync(OLD_NIGHT_CATEGORY).catch(() => {});
}

export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function notificationStatus(): Promise<Permission> {
  if (!supported) return 'unsupported';
  const s = await Notifications.getPermissionsAsync();
  return s.granted ? 'granted' : s.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotifications(): Promise<boolean> {
  if (!supported) return false;
  const s = await Notifications.requestPermissionsAsync();
  return s.granted;
}

/** A mission in a day's plan, as the reminders name it. */
export interface ReminderMission {
  id: string;
  title: string;
  minutes: number;
  proven: boolean;
}

export interface ScheduleInput {
  remindersOn: boolean;
  count: number;
  /** Minutes after midnight. */
  first: number;
  last: number;
  /** Planned missions by day: today, and any later day that already has a plan. */
  plans: Record<DayKey, ReminderMission[]>;
  /** Missions a day, for days without a plan yet ("Three missions are waiting."). */
  perDay: number;
  /** The streak as it stands today (until something is proven, yesterday's). */
  streak: number;
  /**
   * The streak as it will stand on each later day if nothing more is proven
   * (a missed day breaks it unless an Off Day covers it). Days not listed use `streak`.
   */
  streaks?: Record<DayKey, number>;
  seed: string;
}

export type ComposedNotification = PlannedNotification & { body: string };

/** The missions in a plan, in plan order, as the reminders see them. */
export function reminderMissions(missionIds: readonly string[], proven: (id: string) => boolean): ReminderMission[] {
  return missionIds
    .map(id => MISSION_BY_ID[id])
    .filter(Boolean)
    .map(m => ({ id: m.id, title: m.title, minutes: m.minutes, proven: proven(m.id) }));
}

/**
 * The reminder plan with each notification's text. First of the day: today's
 * missions by name. Later ones: what's left, naming one of the open missions
 * in turn; none once everything is proven. The last one of the day, while
 * nothing is proven yet: the last call for the streak. A day with no plan yet
 * names no mission.
 */
export function composePlan(input: ScheduleInput, now: Date): ComposedNotification[] {
  const count = input.remindersOn ? input.count : 0;
  const plan = planNotifications({
    now,
    today: dayKeyOf(now),
    count,
    first: input.first,
    last: input.last,
    prompts: PROMPTS,
    seed: input.seed,
  });
  const lastIndex = new Map<DayKey, number>();
  const lastOf = (day: DayKey) => {
    let i = lastIndex.get(day);
    if (i === undefined) {
      i = dayReminderTimes({ day, count, first: input.first, last: input.last, seed: input.seed }).length - 1;
      lastIndex.set(day, i);
    }
    return i;
  };
  const streakOn = (day: DayKey) => input.streaks?.[day] ?? input.streak;
  const out: ComposedNotification[] = [];
  for (const p of plan) {
    const isLast = p.index > 0 && p.index === lastOf(p.day);
    const missions = input.plans[p.day];
    if (!missions?.length) {
      const body = p.index === 0 ? N.waiting(input.perDay) : isLast ? N.lastCall(streakOn(p.day)) : p.prompt || N.waiting(input.perDay);
      out.push({ ...p, body });
      continue;
    }
    const open = missions.filter(m => !m.proven);
    if (!open.length) continue; // everything's proven: no nudge
    const proven = missions.length - open.length;
    let body: string;
    if (proven === 0 && isLast) body = N.lastCall(streakOn(p.day));
    else if (proven === 0 && p.index === 0) body = N.first(missions.map(m => m.title));
    else {
      const m = open[p.index % open.length];
      body = N.left(open.length, m.title, m.minutes);
    }
    out.push({ ...p, body });
  }
  return out;
}

/**
 * Runs one call at a time: a newer call waits for the one running, which stops
 * as soon as it's out of date. The newer one then cancels and schedules it all
 * again, so nothing from an older call survives.
 */
function oneAtATime<T, R>(job: (input: T, stale: () => boolean) => Promise<R>, skipped: R): (input: T) => Promise<R> {
  let latest = 0;
  let tail: Promise<unknown> = Promise.resolve();
  return input => {
    const id = ++latest;
    const stale = () => id !== latest;
    const run = tail.then(() => (stale() ? skipped : job(input, stale)));
    tail = run.catch(() => {});
    return run;
  };
}

/** Rebuilds the rolling schedule. Call on every foreground and after plans, proof or settings change. */
export const reschedule = oneAtATime(rebuild, 0);

async function rebuild(input: ScheduleInput, stale: () => boolean): Promise<number> {
  if (!supported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => OWN_PREFIXES.some(p => n.identifier.startsWith(p)))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;
  // Real wall-clock time: notifications fire in the real world even while testing time travel.
  const plan = composePlan(input, new Date()).filter(p => p.body);
  for (const p of plan) {
    if (stale()) return 0;
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: N.title, body: p.body, sound: false, data: { day: p.day } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date },
    });
  }
  return plan.length;
}

/** Day-2 reminder for the free trial (trial start + 48 h). */
export async function scheduleTrialReminder(price: string) {
  if (!supported) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'trial-day2',
    content: { title: N.title, body: N.trial(price), sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 48 * 3600_000) },
  }).catch(() => {});
}

/** The trial was cancelled or has ended: its "ends tomorrow" reminder would be wrong. */
export function cancelTrialReminder() {
  if (!supported) return;
  Notifications.cancelScheduledNotificationAsync('trial-day2').catch(() => {});
}

export interface Drop {
  id: string;
  collection: string;
  /** ISO times. */
  publicAt: string;
  earlyAt: string;
}

function whenText(publicAt: Date, from: Date): string {
  const t = publicAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const sameDay = dayKeyOf(publicAt) === dayKeyOf(from);
  const tomorrow = dayKeyOf(new Date(from.getTime() + 86_400_000)) === dayKeyOf(publicAt);
  if (sameDay) return N.whenToday(t);
  if (tomorrow) return N.whenTomorrow(t);
  return N.whenOn(publicAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), t);
}

/**
 * Drop alerts: opt-in only. Early access (7 active days, not paused, access on)
 * hears at early-access open; everyone else gets a heads-up 24 hours before
 * public open. One run at a time.
 */
export const scheduleDropAlerts = oneAtATime(dropAlerts, undefined);

async function dropAlerts(
  { drops, optedIn, earlyAccess }: { drops: Drop[]; optedIn: boolean; earlyAccess: boolean },
  stale: () => boolean,
): Promise<void> {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter(n => n.identifier.startsWith('drop-')).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!optedIn) return;
  for (const d of drops) {
    if (stale()) return;
    const publicAt = new Date(d.publicAt);
    const at = earlyAccess ? new Date(d.earlyAt) : new Date(publicAt.getTime() - 86_400_000);
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now()) continue;
    const body = earlyAccess ? N.dropEarly(d.collection, whenText(publicAt, at)) : N.dropPublic(d.collection, whenText(publicAt, at));
    await Notifications.scheduleNotificationAsync({
      identifier: `drop-${d.id}`,
      content: { title: N.title, body, sound: false, data: { drop: d.id, early: earlyAccess } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

export type NotificationEvent = { kind: 'open-today' } | { kind: 'open-mission'; missionId: string; day: DayKey };

const handled = new Set<string>();
let earlyDropTapped = false;

/**
 * True once after an early drop alert was tapped. That tap lands on Home like
 * any other, and the navigator then opens the early-access page.
 */
export function takeEarlyDropTap(): boolean {
  const t = earlyDropTapped;
  earlyDropTapped = false;
  return t;
}

function toEvent(r: Notifications.NotificationResponse): NotificationEvent | null {
  // The delivery time is part of the key: the timer-done notification reuses
  // one identifier, and each new one that's tapped must be heard.
  const key = `${r.notification.request.identifier}:${r.notification.date}:${r.actionIdentifier}`;
  if (handled.has(key)) return null;
  handled.add(key);
  // Only a tap on the notification itself opens something. (A 2.x night check
  // still in Notification Center can carry Held / Not today: they do nothing now.)
  if (r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const data = r.notification.request.content.data as { drop?: string; early?: boolean; mission?: string; day?: DayKey } | undefined;
  if (data?.drop) {
    earlyDropTapped = data.early === true;
    return { kind: 'open-today' };
  }
  // The focus timer finished: back to its mission for the proof photo.
  if (typeof data?.mission === 'string' && MISSION_BY_ID[data.mission] && typeof data.day === 'string') {
    return { kind: 'open-mission', missionId: data.mission, day: data.day };
  }
  return { kind: 'open-today' };
}

/**
 * Registered at module scope in index.ts. Also replays the response that
 * launched the app (deduped by request id + action).
 */
export function listenForResponses(cb: (e: NotificationEvent) => void): () => void {
  if (!supported) return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r) return;
    const e = toEvent(r);
    if (e) cb(e);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
