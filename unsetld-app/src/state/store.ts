import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppConfig } from '../config/app';
import { monthEnd, monthlyCode } from '../core/codes';
import {
  checkIn,
  claimStatus,
  completeMission,
  customLineWritten,
  emptyProgress,
  rankIndex,
  reconcile,
  recordClaim,
  setNonNegotiable,
  type RankEvent,
  type Result,
} from '../core/rank';
import { randomSalt } from '../core/random';
import type { CustomLine, LaneId, Progress, Tone } from '../core/types';
import { RANK_CONFIG, THEMES } from '../content';
import { setDayOffset, today } from '../services/clock';
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
    if (e.type === 'decay') out.push({ text: `Rank decayed −${e.lost} XP. Comeback: double XP until it's back.`, kind: 'warn' });
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
          apply(customLineWritten(get().progress, RANK_CONFIG, today()));
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
          set({ progress: recordClaim(get().progress, { day, code, percent: st.percent, rank }) });
          return { code, percent: st.percent, expires: monthEnd(day) };
        },

        markRankSeen: () =>
          set(s => ({ progress: { ...s.progress, seenRank: rankIndex(RANK_CONFIG, s.progress.rankXP) } })),

        setDayOffset: days => {
          setDayOffset(days);
          set({ dayOffset: days });
        },

        resetProgress: () => set({ progress: emptyProgress(randomSalt()), favorites: [] }),
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
      }),
      onRehydrateStorage: () => state => {
        if (state) setDayOffset(state.dayOffset ?? 0);
      },
    },
  ),
);

// Storage can be synchronous (web), in which case hydration finishes while the
// store is still being created; mark it afterwards either way.
const markHydrated = () => useApp.setState({ hydrated: true });
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
