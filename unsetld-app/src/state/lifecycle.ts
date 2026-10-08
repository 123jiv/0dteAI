import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { dayCount, sortedDays } from '../core/record';
import { daysAhead } from '../core/reminders';
import { addDays, nextDayStart } from '../core/time';
import { backupRecord, readBackup } from '../services/backup';
import { fetchConfig, fetchDrops, syncCheckIn } from '../services/access';
import { now } from '../services/clock';
import { reschedule, scheduleDropAlerts, type ScheduleInput } from '../services/notifications';
import { initPurchases, purchaseMode, refreshPremium } from '../services/purchases';
import { prepareWidgetAssets, updateWidgets } from '../services/widgets';
import { parseUrl, useIntent } from './intents';
import { useApp, useEntitlements } from './store';
import { workFor } from './work';

const NO_HIDDEN: number[] = [];

function applyPremium() {
  refreshPremium()
    .then(r => {
      if (r) useApp.getState().setPremium({ active: r.active, plan: r.info.plan, renews: r.info.renews });
    })
    .catch(() => {});
}

function applyConfig() {
  fetchConfig().then(c => {
    if (c) useApp.getState().setRemote({ accessEnabled: c.accessEnabled, collection: c.collection });
  });
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
    if (dayCount(s.record) === 0) {
      readBackup().then(b => {
        if (b && Object.keys(b.record.days).length) useApp.getState().restore(b.installSalt, b.record);
      });
    }

    useApp.getState().setPremium({ mode: purchaseMode });
    initPurchases((active, info) => useApp.getState().setPremium({ active, plan: info.plan, renews: info.renews }))
      .then(applyPremium)
      .catch(() => {});
    applyConfig();
    prepareWidgetAssets().catch(() => {});
    useApp.getState().refreshDay();

    // Roll the day over at 4:00 AM even if the app stays open.
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        useApp.getState().refreshDay();
        arm();
      }, Math.max(1000, nextDayStart(now()).getTime() - now().getTime() + 500));
    };
    arm();

    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') {
        useApp.getState().refreshDay();
        applyPremium();
        applyConfig();
      }
    });

    // Deep links from widgets and other apps.
    if (Platform.OS !== 'web') {
      Linking.getInitialURL().then(url => {
        const i = url ? parseUrl(url) : null;
        if (i) useIntent.getState().push(i);
      });
    }
    const linkSub = Platform.OS !== 'web' ? Linking.addEventListener('url', ({ url }) => {
      const i = parseUrl(url);
      if (i) useIntent.getState().push(i);
    }) : null;

    return () => {
      sub.remove();
      linkSub?.remove();
      clearTimeout(timer);
    };
  }, [hydrated]);
}

/** Keeps notifications, widgets, the Keychain backup and drop alerts in step with app state. */
export function useSideEffects() {
  const hydrated = useApp(s => s.hydrated);
  const onboarded = useApp(s => s.settings.onboarded);
  const settings = useApp(s => s.settings);
  const record = useApp(s => s.record);
  const salt = useApp(s => s.installSalt);
  const day = useApp(s => s.currentDay);
  const account = useApp(s => s.account.userId);
  const yourLines = useApp(s => s.yourLines);
  const ent = useEntitlements();
  const mixKey = ent.mix.join(',');
  const nightsKey = Object.keys(record.nights).sort().slice(-3).join(',');
  const workKey = `${settings.standard.join('|')}#${settings.ownTasks.map(t => t.text).join('|')}#${ent.maxOwnTasks}`;
  const doneTodayKey = Object.keys(record.work[day] ?? {}).sort().join(',');

  const schedule: ScheduleInput = useMemo(
    () => ({
      remindersOn: settings.reminders.on,
      count: Math.min(settings.reminders.count, ent.maxReminders),
      first: settings.reminders.first,
      last: settings.reminders.last,
      night: settings.night,
      answered: new Set(Object.keys(record.nights)),
      mix: ent.mix,
      hidden: NO_HIDDEN,
      // Open work for each day the plan covers; today's leaves out what's done.
      work: Array.from({ length: daysAhead(settings.reminders.on ? Math.min(settings.reminders.count, ent.maxReminders) : 0, settings.night.on) }, (_, i) => {
        const d = addDays(day, i);
        const done = useApp.getState().record.work[d] ?? {};
        return { day: d, open: workFor(d, settings, ent, salt).filter(w => !done[w.key]).map(w => ({ text: w.text, chapter: w.chapter })) };
      }),
      seed: salt,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.reminders, settings.night, ent.maxReminders, mixKey, nightsKey, salt, day, workKey, doneTodayKey],
  );

  // Notifications: after settings change, on a new day, and on every foreground
  // (so allowing notifications in iOS Settings mid-day takes effect at once).
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
  }, [hydrated, onboarded, schedule, day]);

  // Widgets: same plan, plus the record, colorway and standard.
  const standardKey = settings.standard.join('|');
  const yoursKey = ent.yourLines ? yourLines.map(y => y.text).join('|') : '';
  const recordKey = `${dayCount(record)}:${sortedDays(record).slice(-7).join(',')}`;
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    updateWidgets({
      today: day,
      premium: ent.premium,
      colorway: ent.colorway,
      mix: ent.mix,
      record: useApp.getState().record,
      standard: settings.standard,
      hidden: NO_HIDDEN,
      yourLines: ent.yourLines ? yourLines.map(y => y.text) : [],
      schedule,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded, day, ent.premium, ent.colorway.id, mixKey, recordKey, standardKey, yoursKey, schedule]);

  // Keychain backup of the record.
  useEffect(() => {
    if (hydrated) backupRecord({ installSalt: salt, record });
  }, [hydrated, salt, record]);

  // Account holders: tell the server about today's day on record.
  const recordedToday = Boolean(record.days[day]);
  useEffect(() => {
    if (hydrated && account && recordedToday) syncCheckIn(day).catch(() => {});
  }, [hydrated, account, recordedToday, day]);

  // Drop alerts (opt-in).
  const early = dayCount(record) >= 7;
  useEffect(() => {
    if (!hydrated) return;
    fetchDrops()
      .then(drops => scheduleDropAlerts(drops, settings.dropAlerts, early))
      .catch(() => {});
  }, [hydrated, settings.dropAlerts, early]);
}
