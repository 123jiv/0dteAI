import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isClean, lineForTask, pickFor, todayLine } from '../core/feed';
import { planNotifications, type PlannedNotification } from '../core/reminders';
import { dayKeyOf, type DayKey } from '../core/time';
import type { ChapterId } from '../core/types';
import { LINE_BY_NO, LINES, PROMPTS, SCHEDULE } from '../content';
import { COPY } from '../content/copy';

const supported = Platform.OS !== 'web';
export const NIGHT_CATEGORY = 'NIGHT_CHECK';
const ACTION_HELD = 'HELD';
const ACTION_NOT_TODAY = 'NOT_TODAY';
const OWN_PREFIXES = ['rem-', 'night-'];

let configured = false;

/** Called once at module scope (index.ts) so night-check actions work from a cold start. */
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
  Notifications.setNotificationCategoryAsync(NIGHT_CATEGORY, [
    { identifier: ACTION_HELD, buttonTitle: COPY.notifications.held, options: { opensAppToForeground: false } },
    { identifier: ACTION_NOT_TODAY, buttonTitle: COPY.notifications.notToday, options: { opensAppToForeground: false } },
  ]).catch(() => {});
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

export interface ScheduleInput {
  remindersOn: boolean;
  count: number;
  first: number;
  last: number;
  night: { on: boolean; time: number };
  answered: Set<DayKey>;
  mix: ChapterId[];
  /** Lines never to send. */
  hidden: number[];
  /** Open work per scheduled day (today: what's still not done). Task reminders name it. */
  work: { day: DayKey; open: { text: string; chapter: ChapterId | null }[] }[];
  seed: string;
}

export type ComposedNotification = PlannedNotification & {
  body: string;
  /** "Still open: Train every day." on task reminders. */
  subtitle?: string;
  lineNo: number | null;
};

/** The reminder plan with each notification's body and line. Shared with the widget timeline. */
export function composePlan(input: ScheduleInput, now: Date): ComposedNotification[] {
  const plan = planNotifications({
    now,
    today: dayKeyOf(now),
    count: input.remindersOn ? input.count : 0,
    first: input.first,
    last: input.last,
    night: { enabled: input.night.on, time: input.night.time },
    answered: input.answered,
    prompts: PROMPTS,
    seed: input.seed,
  });
  const mix = new Set(input.mix);
  const hidden = new Set(input.hidden);
  const mixPool = LINES.filter(l => mix.has(l.chapter) && isClean(l) && !l.attribution && l.text.length <= 90 && !hidden.has(l.no));
  const workByDay = new Map(input.work.map(w => [w.day, w.open]));
  const out: ComposedNotification[] = [];
  for (const p of plan) {
    if (p.kind === 'night') {
      out.push({ ...p, body: COPY.notifications.night, lineNo: null });
      continue;
    }
    if (p.kind === 'today') {
      const t = todayLine(LINES, SCHEDULE, p.day);
      // Today's line is the same for everyone, unless this user hid it.
      const l = t && !hidden.has(t.no) ? t : pickFor(mixPool, `${input.seed}:${p.id}`);
      out.push({ ...p, body: l?.text ?? '', lineNo: l?.no ?? null });
      continue;
    }
    // Task reminder: name the next open task, with a line about it.
    const open = workByDay.get(p.day);
    if (open && !open.length) continue; // everything's done: no nudge
    const task = open?.length ? open[(p.index - 1) % open.length] : null;
    const chapters = task?.chapter ? [task.chapter] : input.mix;
    const line = lineForTask(LINES.filter(l => !hidden.has(l.no)), chapters, `${input.seed}:${p.id}`) ?? pickFor(mixPool, `${input.seed}:${p.id}`);
    out.push({
      ...p,
      subtitle: task ? COPY.notifications.stillOpen(task.text) : undefined,
      body: line?.text ?? p.prompt ?? '',
      lineNo: line?.no ?? null,
    });
  }
  return out;
}

/** Rebuilds the rolling schedule. Call on every foreground and after settings change. */
export async function reschedule(input: ScheduleInput): Promise<number> {
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
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: {
        title: COPY.notificationTitle,
        subtitle: p.subtitle,
        body: p.body,
        sound: false,
        categoryIdentifier: p.kind === 'night' ? NIGHT_CATEGORY : undefined,
        data: p.kind === 'night' ? { night: p.day } : { line: p.lineNo, day: p.day },
      },
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
    content: { title: COPY.notificationTitle, body: COPY.notifications.trial(price), sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 48 * 3600_000) },
  }).catch(() => {});
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
  return sameDay ? `today at ${t}` : tomorrow ? `tomorrow at ${t}` : `on ${publicAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${t}`;
}

/** Drop alerts: opt-in only. Day 7+ hears at early-access open; everyone else at public open. */
export async function scheduleDropAlerts(drops: Drop[], optedIn: boolean, earlyAccess: boolean) {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter(n => n.identifier.startsWith('drop-')).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!optedIn) return;
  for (const d of drops) {
    const publicAt = new Date(d.publicAt);
    const at = earlyAccess ? new Date(d.earlyAt) : new Date(publicAt.getTime() - 86_400_000);
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now()) continue;
    const body = earlyAccess
      ? COPY.notifications.dropEarly(d.collection, whenText(publicAt, at))
      : COPY.notifications.dropPublic(d.collection, whenText(publicAt, at));
    await Notifications.scheduleNotificationAsync({
      identifier: `drop-${d.id}`,
      content: { title: COPY.notificationTitle, body, sound: false, data: { drop: d.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

export type NotificationEvent =
  | { kind: 'night-answer'; day: DayKey; held: boolean }
  | { kind: 'open-line'; no: number }
  | { kind: 'open-night' }
  | { kind: 'open-today' };

const handled = new Set<string>();

function toEvent(r: Notifications.NotificationResponse): NotificationEvent | null {
  const key = `${r.notification.request.identifier}:${r.actionIdentifier}`;
  if (handled.has(key)) return null;
  handled.add(key);
  const data = r.notification.request.content.data as { line?: number | null; night?: DayKey } | undefined;
  if (r.actionIdentifier === ACTION_HELD && data?.night) return { kind: 'night-answer', day: data.night, held: true };
  if (r.actionIdentifier === ACTION_NOT_TODAY && data?.night) return { kind: 'night-answer', day: data.night, held: false };
  if (data?.night) return { kind: 'open-night' };
  if (typeof data?.line === 'number' && LINE_BY_NO[data.line]) return { kind: 'open-line', no: data.line };
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
