import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { slotsFor } from '../core/missions';
import { activeDays, isProven } from '../core/progress';
import { ORPHAN_GRACE_MS, orphans } from '../core/proofs';
import { dayCount } from '../core/record';
import { daysAhead } from '../core/reminders';
import { computeStreak } from '../core/streak';
import { addDays, nextDayStart, type DayKey } from '../core/time';
import type { DayPlan, MissionDone, Profile } from '../core/types';
import { fetchConfig, fetchDrops, syncCheckIn } from '../services/access';
import { clearSession } from '../services/account';
import { backupRecord, openBackups } from '../services/backup';
import { now, today } from '../services/clock';
import {
  NO_REMINDERS,
  reminderMissions,
  reschedule,
  scheduleDropAlerts,
  type ReminderMission,
  type ScheduleInput,
} from '../services/notifications';
import { clearPhotoCaches, deletePhoto, deleteProofFiles, listProofFiles } from '../services/proof';
import { initPurchases, refreshPremium, type EntitlementInfo } from '../services/purchases';
import { cancelTimerDone } from '../services/timerNotify';
import { prepareWidgetAssets, resetWidgets, updateWidgets } from '../services/widgets';
import { afterLocalDelete } from '../services/wipe';
import { showDialog } from '../ui/actions';
import { PLATFORM } from '../content/copy/platform';
import { parseUrl, useIntent } from './intents';
import { guardPremium, setPremiumFrom } from './premium';
import { useSaveFailed } from './storage';
import { loadedOnDefaults, useApp, useEntitlements } from './store';

let toldOutOfSpace = false;

/**
 * RevenueCat's answer, saved whole (state/premium setPremiumFrom: the trial reminder follows it).
 * An 'unavailable' build always answers inactive, so nothing saved stays unlocked there.
 */
function applyPremium() {
  refreshPremium()
    .then(r => {
      if (r) return setPremiumFrom(r.active, r.info);
    })
    .catch(() => {});
}

function onPremiumChange(active: boolean, info: EntitlementInfo) {
  setPremiumFrom(active, info).catch(() => {});
}

/** unsetld.com's config: Access on or off, the collection, reward tiers and status tiers (null keeps the defaults). */
function applyConfig() {
  fetchConfig()
    .then(c => {
      if (c) useApp.getState().setRemote({ accessEnabled: c.accessEnabled, collection: c.collection, rewards: c.rewards, status: c.status });
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

/**
 * Startup clean-up, once the Keychain restore check is over (so a restored record's photos
 * count). Whatever an earlier run left half done (Delete data on this phone stopped partway, a
 * reinstall, onboarding started again in tester tools) is finished here:
 * - nobody onboarded: no reminders queued and the widgets back to their preview;
 * - proof files nothing points to (a photo taken and never sent when the app was closed) go, and
 *   so do the camera's and the resize's leftovers (core/proofs orphans; never on an empty record
 *   or one that couldn't be read).
 */
function cleanUpAfterLoad() {
  const s = useApp.getState();
  if (!s.settings.onboarded) {
    reschedule(NO_REMINDERS).catch(() => {});
    void resetWidgets();
  }
  const files = listProofFiles();
  const gone = orphans({
    files,
    record: s.record,
    snapshot: s.devSnapshot,
    waiting: s.pendingBefore?.photo.uri ?? null,
    now: Date.now(),
    readFailed: loadedOnDefaults(),
  });
  deleteProofFiles(gone);
  clearPhotoCaches(ORPHAN_GRACE_MS);
}

/** One-time startup work after the store has hydrated. */
export function useBootstrap() {
  const hydrated = useApp(s => s.hydrated);
  const done = useRef(false);
  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    const s = useApp.getState();

    // Reinstall: bring the record back from the Keychain. Backups wait until this read is over
    // (services/backup), so the empty record never goes over the one being restored.
    openBackups({
      read: dayCount(s.record) === 0 && !Object.keys(s.record.missions ?? {}).length,
      restore: b => {
        if (Object.keys(b.record.days ?? {}).length || Object.keys(b.record.missions ?? {}).length) {
          useApp.getState().restore(b.installSalt, b.record);
        }
      },
      current: () => ({ installSalt: useApp.getState().installSalt, record: useApp.getState().record }),
    })
      .then(cleanUpAfterLoad)
      .catch(() => {});
    // No one signed in here: a session token in the Keychain (it outlives the app) goes.
    if (!s.account.userId) clearSession().catch(() => {});

    // Fails closed: a membership unlocked in preview mode goes now, without waiting for RevenueCat.
    guardPremium();
    initPurchases(onPremiumChange)
      .then(applyPremium)
      .catch(() => {});
    applyConfig();
    prepareWidgetAssets().catch(() => {});
    ensureToday();
    expirePhotos();
    // Delete data on this phone: UNSETLD+ read again from the store, as at startup.
    const offDelete = afterLocalDelete(applyPremium);

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
      offDelete();
      clearTimeout(timer);
    };
  }, [hydrated]);
}

/**
 * Planned missions for today and every later day that already has a plan, as the reminders name
 * them: as Today does, with the user's goal filled in (core/titles).
 */
function reminderPlans(
  plans: Record<DayKey, DayPlan>,
  missions: Record<DayKey, Record<string, MissionDone>> | undefined,
  day: DayKey,
  days: number,
  who: Pick<Profile, 'goal' | 'skills'>,
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
      who,
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
  const minutes = useApp(s => s.profile.minutes);
  const goal = useApp(s => s.profile.goal);
  const skills = useApp(s => s.profile.skills);
  // What a mission's title fills its slot from ("Work on Your Clothing Brand for 30 Minutes").
  const who = useMemo(() => ({ goal, skills }), [goal, skills]);
  const salt = useApp(s => s.installSalt);
  const day = useApp(s => s.currentDay);
  const account = useApp(s => s.account.userId);
  const ent = useEntitlements();
  const perDay = slotsFor({ intensity, minutes }).length;
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
      plans: reminderPlans(plans, record.missions, day, days, who),
      perDay,
      streak,
      streaks,
      seed: salt,
    };
  }, [reminders.on, reminders.first, reminders.last, count, plans, record.missions, day, perDay, streak, active, salt, who]);

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
    updateWidgets({ today: day, premium, colorway, record, plans, perDay, profile: who });
  }, [hydrated, onboarded, day, premium, colorway, record, plans, perDay, who]);

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

  // Browser preview: a save that didn't fit even after the oldest photos made room.
  const saveFailed = useSaveFailed(s => s.failed);
  useEffect(() => {
    if (!saveFailed || toldOutOfSpace) return;
    toldOutOfSpace = true;
    showDialog(PLATFORM.outOfSpace.title, PLATFORM.outOfSpace.body);
  }, [saveFailed]);

  // Account holders: tell the server about today's day on record (a proven mission).
  const recordedToday = Boolean(record.days[day]);
  useEffect(() => {
    if (hydrated && account && recordedToday) syncCheckIn(day).catch(() => {});
  }, [hydrated, account, recordedToday, day]);

  // Drop alerts, opted into in You: a heads-up 24 hours before each drop opens. drops.json
  // is fetched on launch and every foreground while they're on; a failed fetch keeps the
  // alerts already scheduled. Turned off, every drop alert goes.
  const dropAlerts = useApp(s => s.settings.dropAlerts);
  useEffect(() => {
    if (!hydrated) return;
    if (!dropAlerts) {
      scheduleDropAlerts({ drops: [], optedIn: false }).catch(() => {});
      return;
    }
    let live = true;
    const run = () =>
      fetchDrops()
        .then(drops => {
          if (drops && live) return scheduleDropAlerts({ drops, optedIn: true });
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
  }, [hydrated, dropAlerts]);
}
