import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppConfig } from '../config/app';
import { buildPool } from '../core/lines';
import { hash32 } from '../core/random';
import { planReminders } from '../core/reminders';
import type { CustomLine, LaneId, Line } from '../core/types';
import { LINES } from '../content';
import { dayKey } from '../core/time';

const supported = Platform.OS !== 'web';
const REMINDER_PREFIX = 'rem-';
const DROP_PREFIX = 'drop-';

export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function notificationStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!supported) return 'unsupported';
  const s = await Notifications.getPermissionsAsync();
  return s.granted ? 'granted' : s.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotifications(): Promise<boolean> {
  if (!supported) return false;
  const s = await Notifications.requestPermissionsAsync();
  return s.granted;
}

export interface ReminderInput {
  enabled: boolean;
  perDay: number;
  startHour: number;
  endHour: number;
  lanes: LaneId[];
  lockScreenClean: boolean;
  tone: 'clean' | 'unfiltered';
  custom: CustomLine[];
  salt: string;
}

/** Rebuilds the rolling reminder schedule (call on open and on settings change). */
export async function rescheduleReminders(o: ReminderInput): Promise<number> {
  if (!supported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith(REMINDER_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!o.enabled || o.perDay <= 0) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  const pool: Line[] = buildPool(LINES, {
    lanes: o.lanes,
    tone: o.tone,
    cleanOnly: o.lockScreenClean,
    custom: o.custom,
  });
  if (!pool.length) return 0;
  // Real wall-clock time: notifications fire in the real world even when the
  // dev tools are time-travelling.
  const real = new Date();
  const slots = planReminders({
    now: real,
    today: dayKey(real),
    perDay: o.perDay,
    startHour: o.startHour,
    endHour: o.endHour,
    seed: o.salt,
  });
  for (const slot of slots) {
    const line = pool[hash32(`${o.salt}:${slot.day}:${slot.index}`) % pool.length];
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMINDER_PREFIX}${slot.day}-${slot.index}`,
      content: { title: AppConfig.name, body: line.text, data: { lineId: line.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.date },
    });
  }
  return slots.length;
}

export interface Drop {
  id: string;
  name: string;
  date: string;
  earlyAccessHours?: number;
}

/** Drop alerts are marketing: only scheduled when the user opted in to them. */
export async function scheduleDropAlerts(drops: Drop[], optedIn: boolean) {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith(DROP_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!optedIn) return;
  for (const d of drops) {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${DROP_PREFIX}${d.id}`,
      content: { title: `${AppConfig.name} drop`, body: `${d.name} is live.`, data: { drop: d.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}

export function onReminderOpened(cb: (lineId: string) => void): () => void {
  if (!supported) return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    const id = r?.notification.request.content.data?.lineId;
    if (typeof id === 'string') cb(id);
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
