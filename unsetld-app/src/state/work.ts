// Today's work for any day: the rules, the daily task, your own tasks.
import { dailyTaskFor, dayWork } from '../core/points';
import type { DayKey } from '../core/time';
import type { WorkItem } from '../core/types';
import { RULE_CHAPTER, TASKS } from '../content';
import { useApp, useEntitlements, type Entitlements, type Settings } from './store';

export function workFor(day: DayKey, settings: Settings, ent: Entitlements, salt: string, doneDaily?: string): WorkItem[] {
  const daily = dailyTaskFor(TASKS, ent.mix, salt, day, doneDaily);
  // A preset rule takes its own chapter, so its line and reminders are about it.
  return dayWork(settings.standard, daily, settings.ownTasks.slice(0, ent.maxOwnTasks)).map(w => {
    const ch = w.source === 'rule' ? RULE_CHAPTER[w.text] : undefined;
    return ch ? { ...w, chapter: ch } : w;
  });
}

export function useWork(day: DayKey): WorkItem[] {
  const settings = useApp(s => s.settings);
  const salt = useApp(s => s.installSalt);
  const ent = useEntitlements();
  const doneDaily = useApp(s => s.record.work[day]?.d?.text);
  return workFor(day, settings, ent, salt, doneDaily);
}
