import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { rankOf } from '../core/rank';
import { LINES, RANK_CONFIG } from '../content';
import { backupProgress, readBackup } from '../services/backup';
import { today } from '../services/clock';
import { rescheduleReminders, scheduleDropAlerts } from '../services/notifications';
import { fetchPerksFeed } from '../services/perksFeed';
import { initPurchases, purchaseMode, refreshPremium, setAcquisitionSource } from '../services/purchases';
import { updateWidgets } from '../services/widgets';
import type { CustomLine } from '../core/types';
import { useApp, useEntitlements } from './store';

const NO_CUSTOM: CustomLine[] = [];

/** One-time startup work after the store has hydrated. */
export function useBootstrap() {
  const hydrated = useApp(s => s.hydrated);
  const done = useRef(false);
  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    const s = useApp.getState();

    // Reinstall: restore rank from the Keychain backup.
    if (!s.progress.lastOpenDay) {
      readBackup().then(b => {
        if (b && b.lastOpenDay) useApp.getState().restoreProgress(b);
      });
    }

    useApp.getState().setPremium({ mode: purchaseMode });
    initPurchases(active => useApp.getState().setPremium({ active }))
      .then(() => refreshPremium())
      .then(active => {
        if (active !== null) useApp.getState().setPremium({ active });
      })
      .catch(() => {});
    setAcquisitionSource(s.settings.source);

    useApp.getState().reconcileNow();
    syncDrops();

    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') {
        useApp.getState().reconcileNow();
        refreshPremium()
          .then(active => {
            if (active !== null) useApp.getState().setPremium({ active });
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [hydrated]);
}

async function syncDrops() {
  const feed = await fetchPerksFeed();
  await scheduleDropAlerts(feed?.drops ?? [], useApp.getState().settings.dropAlerts).catch(() => {});
}

/** Keeps widgets, reminders and the Keychain backup in step with app state. */
export function useSideEffects() {
  const hydrated = useApp(s => s.hydrated);
  const settings = useApp(s => s.settings);
  const custom = useApp(s => s.customLines);
  const progress = useApp(s => s.progress);
  const ent = useEntitlements();

  const rankName = rankOf(RANK_CONFIG, progress.rankXP).name;
  const customLines = ent.customLines ? custom : NO_CUSTOM;
  const lanesKey = ent.lanes.join(',');

  useEffect(() => {
    if (!hydrated || !settings.onboarded) return;
    updateWidgets({
      lines: LINES,
      lanes: ent.lanes,
      tone: settings.tone,
      lockScreenClean: settings.lockScreenClean,
      custom: customLines,
      salt: progress.installSalt,
      today: today(),
      streak: progress.streak,
      rankName,
      theme: ent.theme,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.onboarded, lanesKey, settings.tone, settings.lockScreenClean, customLines, progress.streak, rankName, ent.theme.id, progress.installSalt]);

  useEffect(() => {
    if (!hydrated || !settings.onboarded) return;
    const t = setTimeout(() => {
      rescheduleReminders({
        enabled: settings.reminders.enabled,
        perDay: ent.remindersPerDay,
        startHour: settings.reminders.startHour,
        endHour: settings.reminders.endHour,
        lanes: ent.lanes,
        lockScreenClean: settings.lockScreenClean,
        tone: settings.tone,
        custom: customLines,
        salt: progress.installSalt,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.onboarded, settings.reminders, ent.remindersPerDay, lanesKey, settings.lockScreenClean, settings.tone, customLines, progress.installSalt]);

  useEffect(() => {
    if (hydrated) backupProgress(progress);
  }, [hydrated, progress]);

  useEffect(() => {
    if (hydrated) syncDrops();
  }, [hydrated, settings.dropAlerts]);
}
