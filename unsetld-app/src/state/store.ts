import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppConfig } from '../config/app';
import { monthEnd, monthlyCode } from '../core/codes';
import {
  checkIn,
  claimStatus,
  completeMission,
  emptyProgress,
  migrateProgress,
  rankIndex,
  reconcile,
  recordClaim,
  resetKeepingHistory,
  setNonNegotiable,
  type RankEvent,
  type Result,
} from '../core/rank';
import { addDays } from '../core/time';
import { randomSalt } from '../core/random';
import type { CustomLine, LaneId, Progress, Tone } from '../core/types';
import { RANK_CONFIG, THEMES } from '../content';
import { getDayOffset, setDayOffset, today } from '../services/clock';
import type { PlanKind } from '../services/purchases';
import { appStorage } from './storage';

export interface Settings {
  onboarded: boolean;
  lanes: LaneId[];
  struggles: string[];
  tone: Tone;
  lockScreenClean: boolean;
  reminders: { enabled: boolean; perDay: number; startHour: number; endHour: number };
  dropAlerts: boolean;
  themeId: string;
  source: string | null;
  widgetGuideSeen: boolean;
}

export interface Premium {
  active: boolean;
  plan: PlanKind | null;
  mode: 'preview' | 'revenuecat' | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'xp' | 'info' | 'warn' | 'rank';
}

export interface ClaimedCode {
  code: string;
  percent: number;
  expires: string;
}

interface State {
  hydrated: boolean;
  settings: Settings;
  progress: Progress;
  favorites: string[];
  customLines: CustomLine[];
  premium: Premium;
  dayOffset: number;
  /** Real progress saved when tester time travel starts; restored on return. */
  devSnapshot: Progress | null;
  /** The calendar day the UI is showing; refreshed on foreground and at midnight. */
  currentDay: string;
  toasts: Toast[];

  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (patch: Partial<Settings>) => void;
  toggleFavorite: (lineId: string) => boolean;
  addCustomLine: (text: string) => void;
  updateCustomLine: (id: string, text: string) => void;
  removeCustomLine: (id: string) => void;
  setPremium: (p: Partial<Premium>) => void;
  dailyCheckIn: (verified: boolean) => void;
  reconcileNow: () => void;
  setNonNegotiable: (text: string) => void;
  completeMission: (missionId: string) => void;
  claimCode: (opts: { skipVerification: boolean }) => ClaimedCode | { error: string };
  markRankSeen: () => void;
  setDayOffset: (days: number) => void;
  backToRealToday: () => void;
  refreshDay: () => void;
  resetProgress: () => void;
  restoreProgress: (p: Progress) => void;
  pushToast: (text: string, kind?: Toast['kind']) => void;
  dropToast: (id: number) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  lanes: [],
  struggles: [],
  tone: 'clean',
  lockScreenClean: true,
  reminders: { enabled: true, perDay: 3, startHour: 8, endHour: 22 },
  dropAlerts: false,
  themeId: AppConfig.freeThemeId,
  source: null,
  widgetGuideSeen: false,
};

let toastSeq = 1;

function describe(events: RankEvent[]): { text: string; kind: Toast['kind'] }[] {
  const out: { text: string; kind: Toast['kind'] }[] = [];
  let xp = 0;
  let bonus = 0;
  for (const e of events) {
    if (e.type === 'xp') {
      xp += e.amount;
      bonus += e.bonus;
    }
  }
  if (xp > 0) out.push({ text: bonus > 0 ? `+${xp} XP · comeback x2` : `+${xp} XP`, kind: 'xp' });
  for (const e of events) {
    if (e.type === 'shields') out.push({ text: `Streak shield used (${e.used})`, kind: 'info' });
    if (e.type === 'streakBroken') out.push({ text: `Streak reset. ${e.was} days. Start again today.`, kind: 'warn' });
    if (e.type === 'decay') out.push({ text: `Rank decayed −${e.lost} XP.`, kind: 'warn' });
    if (e.type === 'comeback') out.push({ text: `Comeback: double XP until you win back ${e.remaining}.`, kind: 'info' });
    if (e.type === 'needsCheckIn') out.push({ text: "Open today's line first.", kind: 'info' });
    if (e.type === 'rankDown') out.push({ text: `Dropped to ${RANK_CONFIG.ranks[e.rank].name}.`, kind: 'warn' });
    if (e.type === 'milestone') out.push({ text: `${e.days}-day streak · +${e.xp} XP`, kind: 'rank' });
    if (e.type === 'fullWeek') out.push({ text: `Full week · +${e.xp} XP`, kind: 'rank' });
    if (e.type === 'clockBackwards') out.push({ text: "Your phone's clock went backwards. No XP until it's fixed.", kind: 'warn' });
  }
  return out;
}

export const useApp = create<State>()(
  persist(
    (set, get) => {
      const apply = (r: Result) => {
        set({ progress: r.progress });
        for (const t of describe(r.events)) get().pushToast(t.text, t.kind);
      };
      return {
        hydrated: false,
        settings: DEFAULT_SETTINGS,
        progress: emptyProgress(randomSalt()),
        favorites: [],
        customLines: [],
        premium: { active: false, plan: null, mode: null },
        dayOffset: 0,
        devSnapshot: null,
        currentDay: today(),
        toasts: [],

        updateSettings: patch => set(s => ({ settings: { ...s.settings, ...patch } })),
        completeOnboarding: patch => set(s => ({ settings: { ...s.settings, ...patch, onboarded: true } })),

        toggleFavorite: lineId => {
          const has = get().favorites.includes(lineId);
          set(s => ({ favorites: has ? s.favorites.filter(f => f !== lineId) : [lineId, ...s.favorites] }));
          return !has;
        },

        addCustomLine: text => {
          const line: CustomLine = { id: `custom-${Date.now().toString(36)}`, text: text.trim(), createdAt: Date.now() };
          set(s => ({ customLines: [line, ...s.customLines] }));
        },
        updateCustomLine: (id, text) =>
          set(s => ({ customLines: s.customLines.map(c => (c.id === id ? { ...c, text: text.trim() } : c)) })),
        removeCustomLine: id =>
          set(s => ({
            customLines: s.customLines.filter(c => c.id !== id),
            favorites: s.favorites.filter(f => f !== id),
          })),

        setPremium: p => set(s => ({ premium: { ...s.premium, ...p } })),

        dailyCheckIn: verified => apply(checkIn(get().progress, RANK_CONFIG, today(), { verified })),
        reconcileNow: () => apply(reconcile(get().progress, RANK_CONFIG, today())),
        setNonNegotiable: text => apply(setNonNegotiable(get().progress, RANK_CONFIG, today(), text)),
        completeMission: id => apply(completeMission(get().progress, RANK_CONFIG, today(), id)),

        claimCode: ({ skipVerification }) => {
          const day = today();
          const st = claimStatus(get().progress, RANK_CONFIG, day, {
            rankSync: AppConfig.rankSyncEnabled,
            skipVerification,
          });
          if (!st.ok) return { error: st.reason };
          const code = monthlyCode(AppConfig.codeSalt, st.percent, day);
          const rank = rankIndex(RANK_CONFIG, get().progress.rankXP);
          // Each monthly code stays valid into the next month, so every claim gets at least this long.
          const expires = addDays(monthEnd(day), RANK_CONFIG.claims.expiresDays);
          set({ progress: recordClaim(get().progress, { day, code, percent: st.percent, rank, expires }) });
          return { code, percent: st.percent, expires };
        },

        markRankSeen: () =>
          set(s => ({ progress: { ...s.progress, seenRank: rankIndex(RANK_CONFIG, s.progress.rankXP) } })),

        setDayOffset: days => {
          // First jump away from the real date: keep the real progress to come back to.
          if (getDayOffset() === 0 && days !== 0 && !get().devSnapshot) set({ devSnapshot: get().progress });
          setDayOffset(days);
          set({ dayOffset: days, currentDay: today() });
        },
        backToRealToday: () => {
          const snap = get().devSnapshot;
          setDayOffset(0);
          set({ dayOffset: 0, currentDay: today(), devSnapshot: null, ...(snap ? { progress: snap } : {}) });
        },
        refreshDay: () => {
          const d = today();
          if (d !== get().currentDay) set({ currentDay: d });
        },

        resetProgress: () =>
          set(s => ({ progress: resetKeepingHistory(s.progress, randomSalt()), favorites: [] })),
        restoreProgress: p => set({ progress: p }),

        pushToast: (text, kind = 'info') => {
          const id = toastSeq++;
          set(s => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
          setTimeout(() => get().dropToast(id), 2600);
        },
        dropToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
      };
    },
    {
      name: 'unsetld-state-v1',
      storage: createJSONStorage(() => appStorage),
      partialize: s => ({
        settings: s.settings,
        progress: s.progress,
        favorites: s.favorites,
        customLines: s.customLines,
        premium: s.premium,
        dayOffset: s.dayOffset,
        devSnapshot: s.devSnapshot,
      }),
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const prog = state.progress as { installSalt?: string } | undefined;
          state.progress = migrateProgress(prog, prog?.installSalt ?? randomSalt());
          state.devSnapshot = null;
        }
        return state as never;
      },
      onRehydrateStorage: () => state => {
        if (state) setDayOffset(state.dayOffset ?? 0);
      },
    },
  ),
);

// Storage can be synchronous (web), in which case hydration finishes while the
// store is still being created; mark it afterwards either way.
const markHydrated = () => useApp.setState({ hydrated: true, currentDay: today() });
if (useApp.persist.hasHydrated()) markHydrated();
else useApp.persist.onFinishHydration(markHydrated);

/** What the user actually gets, given Premium or not. */
export function useEntitlements() {
  const settings = useApp(s => s.settings);
  const premium = useApp(s => s.premium.active);
  const theme = THEMES.find(t => t.id === settings.themeId) ?? THEMES[0];
  return {
    premium,
    lanes: premium ? settings.lanes : settings.lanes.slice(0, AppConfig.freeLaneLimit),
    theme: premium || theme.free ? theme : THEMES.find(t => t.id === AppConfig.freeThemeId)!,
    remindersPerDay: Math.min(
      settings.reminders.perDay,
      premium ? AppConfig.premiumReminderLimit : AppConfig.freeReminderLimit,
    ),
    customLines: premium,
  };
}

export const selectRankIndex = (s: State) => rankIndex(RANK_CONFIG, s.progress.rankXP);
