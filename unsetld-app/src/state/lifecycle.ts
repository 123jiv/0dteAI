import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { SLOTS_BY_INTENSITY } from '../core/missions';
import { activeDays, isProven } from '../core/progress';
import { accessState, dayCount } from '../core/record';
import { daysAhead } from '../core/reminders';
import { computeStreak } from '../core/streak';
import { addDays, nextDayStart, type DayKey } from '../core/time';
import type { DayPlan, MissionDone } from '../core/types';
import { accessDays, accessRecord } from '../screens/access';
import { fetchConfig, fetchDrops, syncCheckIn } from '../services/access';
import { backupRecord, readBackup } from '../services/backup';
import { now, today } from '../services/clock';
import {
  cancelTrialReminder,
  reminderMissions,
  reschedule,
  scheduleDropAlerts,
  type Drop,
  type ReminderMission,
  type ScheduleInput,
} from '../services/notifications';
import { deletePhoto } from '../services/proof';
import { initPurchases, purchaseMode, refreshPremium, type EntitlementInfo } from '../services/purchases';
import { cancelTimerDone } from '../services/timerNotify';
import { prepareWidgetAssets, updateWidgets } from '../services/widgets';
import { parseUrl, useIntent } from './intents';
import { useAccessEnabled, useApp, useEntitlements } from './store';

/** The last drops.json that loaded, for the early-access page. Fetched on launch and every foreground. */
export const useDrops = create<{ drops: Drop[] }>(() => ({ drops: [] }));

/**
 * RevenueCat's answer. Active but not renewing means the trial was cancelled
 * (or it's Lifetime), so the "trial ends tomorrow" reminder goes. Not on
 * inactive: a stale answer right after buying would drop the reminder the
 * paywall promised.
 */
function setPremiumFrom(active: boolean, info: EntitlementInfo) {
  useApp.getState().setPremium({ active, plan: info.plan, renews: info.renews });
  if (active && !info.renews) cancelTrialReminder();
}

function applyPremium() {
  refreshPremium()
    .then(r => {
      if (r) setPremiumFrom(r.active, r.info);
    })
    .catch(() => {});
}

/** unsetld.com's config: Access on or off, the collection, and reward tiers (null keeps the defaults). */
function applyConfig() {
  fetchConfig()
    .then(c => {
      if (c) useApp.getState().setRemote({ accessEnabled: c.accessEnabled, collection: c.collection, rewards: c.rewards });
    })
    .catch(() => {});
}

/** Today's plan, built the first time it's needed. Not before onboarding: the profile isn't chosen yet. */
function ensureToday() {
  const s = useApp.getState();
  s.refreshDay();
  if (s.settings.onboarded) s.ensurePlan(today());
}

/** Clears proof photos past the retention setting, from the record and from the phone. */
function expirePhotos() {
  const s = useApp.getState();
  if (!s.settings.onboarded) return;
  for (const uri of s.expireProofPhotos()) deletePhoto(uri);
}

/** One-time startup work after the store has hydrated. */
export function useBootstrap() {
  const hydrated = useApp(s => s.hydrated);
  const done = useRef(false);
  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    const s = useApp.getState();

    // Reinstall: bring the record back from the Keychain.
    if (dayCount(s.record) === 0 && !Object.keys(s.record.missions ?? {}).length) {
      readBackup()
        .then(b => {
          if (b && (Object.keys(b.record.days ?? {}).length || Object.keys(b.record.missions ?? {}).length)) {
            useApp.getState().restore(b.installSalt, b.record);
          }
        })
        .catch(() => {});
    }

    useApp.getState().setPremium({ mode: purchaseMode });
    initPurchases(setPremiumFrom)
      .then(applyPremium)
      .catch(() => {});
    applyConfig();
    prepareWidgetAssets().catch(() => {});
    ensureToday();
    expirePhotos();

    // Roll the day over at 4:00 AM even if the app stays open: the new day gets its plan.
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        ensureToday();
        arm();
      }, Math.max(1000, nextDayStart(now()).getTime() - now().getTime() + 500));
    };
    arm();

    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return;
      ensureToday();
      expirePhotos();
      applyPremium();
      applyConfig();
    });

    // Deep links from widgets and other apps.
    if (Platform.OS !== 'web') {
      Linking.getInitialURL()
        .then(url => {
          const i = url ? parseUrl(url) : null;
          if (i) useIntent.getState().push(i);
        })
        .catch(() => {});
    }
    const linkSub =
      Platform.OS !== 'web'
        ? Linking.addEventListener('url', ({ url }) => {
            const i = parseUrl(url);
            if (i) useIntent.getState().push(i);
          })
        : null;

    return () => {
      sub.remove();
      linkSub?.remove();
      clearTimeout(timer);
    };
  }, [hydrated]);
}

/** Planned missions for today and every later day that already has a plan, as the reminders name them. */
function reminderPlans(
  plans: Record<DayKey, DayPlan>,
  missions: Record<DayKey, Record<string, MissionDone>> | undefined,
  day: DayKey,
  days: number,
): Record<DayKey, ReminderMission[]> {
  const out: Record<DayKey, ReminderMission[]> = {};
  for (let i = 0; i < days; i++) {
    const d = addDays(day, i);
    const plan = plans[d];
    if (!plan) continue;
    const done = missions?.[d] ?? {};
    out[d] = reminderMissions(
      plan.missions.map(p => p.missionId),
      id => isProven(done[id]),
    );
  }
  return out;
}

/** Keeps the day's plan, notifications, widgets, the Keychain backup and drop alerts in step with app state. */
export function useSideEffects() {
  const hydrated = useApp(s => s.hydrated);
  const onboarded = useApp(s => s.settings.onboarded);
  const reminders = useApp(s => s.settings.reminders);
  const record = useApp(s => s.record);
  const plans = useApp(s => s.plans);
  const intensity = useApp(s => s.profile.intensity);
  const salt = useApp(s => s.installSalt);
  const day = useApp(s => s.currentDay);
  const account = useApp(s => s.account.userId);
  const ent = useEntitlements();
  const perDay = SLOTS_BY_INTENSITY[intensity]?.length ?? 3;
  const active = useMemo(() => activeDays(record), [record]);
  const streak = useMemo(() => computeStreak(active, day).current, [active, day]);

  // A new day (4:00 AM, a foreground on a later day, tester time travel) gets its plan.
  useEffect(() => {
    if (hydrated && onboarded) useApp.getState().ensurePlan(today());
  }, [hydrated, onboarded, day]);

  const count = reminders.on ? Math.min(reminders.count, ent.maxReminders) : 0;
  const schedule: ScheduleInput = useMemo(() => {
    const days = daysAhead(count);
    // A later day's last call names the streak as it will stand then, if nothing more is proven.
    const streaks: Record<DayKey, number> = {};
    for (let i = 1; count > 1 && i < days; i++) {
      const d = addDays(day, i);
      streaks[d] = computeStreak(active, d).current;
    }
    return {
      remindersOn: reminders.on,
      count,
      first: reminders.first,
      last: reminders.last,
      plans: reminderPlans(plans, record.missions, day, days),
      perDay,
      streak,
      streaks,
      seed: salt,
    };
  }, [reminders.on, reminders.first, reminders.last, count, plans, record.missions, day, perDay, streak, active, salt]);

  // Notifications: after plans, proof, the profile or settings change, on a new
  // day, and on every foreground (so allowing notifications in iOS Settings
  // mid-day takes effect at once).
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    const t = setTimeout(() => reschedule(schedule).catch(() => {}), 600);
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') reschedule(schedule).catch(() => {});
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [hydrated, onboarded, schedule]);

  // Widgets: next mission, today's missions, the streak.
  const colorway = ent.colorway;
  const premium = ent.premium;
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    updateWidgets({ today: day, premium, colorway, record, plans, perDay });
  }, [hydrated, onboarded, day, premium, colorway, record, plans, perDay]);

  // No focus timer, no "timer done" notification: whatever ended the timer
  // (proof, Home closing an old day's timer, tester tools) takes it with it.
  const hasTimer = useApp(s => s.timer !== null);
  useEffect(() => {
    if (hydrated && !hasTimer) cancelTimerDone().catch(() => {});
  }, [hydrated, hasTimer]);

  // Keychain backup of the record.
  useEffect(() => {
    if (hydrated) backupRecord({ installSalt: salt, record });
  }, [hydrated, salt, record]);

  // Account holders: tell the server about today's day on record (a proven mission).
  const recordedToday = Boolean(record.days[day]);
  useEffect(() => {
    if (hydrated && account && recordedToday) syncCheckIn(day).catch(() => {});
  }, [hydrated, account, recordedToday, day]);

  // Drops: fetched on launch and every foreground, for the early-access page
  // and the opt-in alerts. Early access needs 7 active days, access on and no
  // pause. A failed fetch keeps the alerts already scheduled.
  const accessEnabled = useAccessEnabled();
  const paused = useMemo(() => accessState(accessRecord(record), day).paused, [record, day]);
  const early = accessEnabled && accessDays(record) >= 7 && !paused;
  const dropAlerts = useApp(s => s.settings.dropAlerts);
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    if (!dropAlerts) scheduleDropAlerts({ drops: [], optedIn: false, earlyAccess: early }).catch(() => {});
    const run = () =>
      fetchDrops()
        .then(drops => {
          if (!drops) return;
          useDrops.setState({ drops });
          if (live && dropAlerts) return scheduleDropAlerts({ drops, optedIn: true, earlyAccess: early });
        })
        .catch(() => {});
    run();
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') run();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [hydrated, dropAlerts, early]);
}
