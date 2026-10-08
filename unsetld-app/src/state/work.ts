// Today's work for any day: the rules, the daily task, your own tasks.
import { dailyTask, dayWork } from '../core/points';
import type { DayKey } from '../core/time';
import type { WorkItem } from '../core/types';
import { TASKS } from '../content';
import { useApp, useEntitlements, type Entitlements, type Settings } from './store';

export function workFor(day: DayKey, settings: Settings, ent: Entitlements, salt: string): WorkItem[] {
  const daily = dailyTask(TASKS, ent.mix, salt, day);
  return dayWork(settings.standard, daily, settings.ownTasks.slice(0, ent.maxOwnTasks));
}

export function useWork(day: DayKey): WorkItem[] {
  const settings = useApp(s => s.settings);
  const salt = useApp(s => s.installSalt);
  const ent = useEntitlements();
  return workFor(day, settings, ent, salt);
}
