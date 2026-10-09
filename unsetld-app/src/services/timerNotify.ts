// The "timer done" notification for TIMER_AND_PHOTO missions. The focus timer
// runs on wall-clock time (core/timer), so the app can be closed while it runs;
// this local notification is what tells the user it reached zero. One timer at
// a time, so one notification, always under the same identifier: scheduling
// again replaces it. The browser preview has no notifications: every call is a
// no-op there.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { clock, endsAt, type FocusTimer } from '../core/timer';
import { MISSION } from '../content/copy/mission';

const supported = Platform.OS !== 'web';

/** Not one of the reminder prefixes ('rem-', 'night-'), so a reminder reschedule never cancels it. */
export const TIMER_NOTIFICATION_ID = 'timer-done';

// Calls run one after another, and a call that's been overtaken stops before it
// schedules: a pause right after a start never leaves the start's notification behind.
let latest = 0;
let tail: Promise<unknown> = Promise.resolve();

function queue(job: (stale: () => boolean) => Promise<void>): Promise<void> {
  const id = ++latest;
  const stale = () => id !== latest;
  const run = tail.then(() => (stale() ? undefined : job(stale)));
  tail = run.catch(() => {});
  return run.catch(() => {});
}

async function allowed(ask: boolean): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return true;
  if (!ask || !p.canAskAgain) return false;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

/**
 * Schedules the notification for when `timer` reaches zero (replacing any
 * earlier one). A paused or finished timer only cancels it. `ask` asks for
 * notification permission first if it was never asked (starting a timer is a
 * good moment: the screen says it will ring).
 */
export function scheduleTimerDone(timer: FocusTimer, opts: { ask?: boolean } = {}): Promise<void> {
  if (!supported) return Promise.resolve();
  return queue(async stale => {
    await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID).catch(() => {});
    const at = endsAt(timer);
    if (at == null || at <= Date.now() + 1000) return;
    if (!(await allowed(Boolean(opts.ask))) || stale()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_NOTIFICATION_ID,
      content: {
        title: MISSION.notify.title,
        body: MISSION.notify.body(clock(timer.requiredSeconds)),
        sound: true,
        data: { mission: timer.missionId, day: timer.day },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    });
  });
}

/** Cancels the notification (timer ended early, paused, proven or replaced). */
export function cancelTimerDone(): Promise<void> {
  if (!supported) return Promise.resolve();
  return queue(async () => {
    await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID);
  });
}

/** Brings the notification in line with the store's timer: scheduled while it runs, gone otherwise. */
export function syncTimerDone(timer: FocusTimer | null, opts: { ask?: boolean } = {}): Promise<void> {
  if (!timer || timer.pausedAt != null) return cancelTimerDone();
  return scheduleTimerDone(timer, opts);
}
