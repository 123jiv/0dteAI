import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppConfig } from '../config/app';
import { randomSalt } from '../core/random';
import {
  answerNight,
  claimPatch,
  emptyRecord,
  markLetterShown,
  recordDay,
  spendMemberPrice,
  type Letter,
} from '../core/record';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import type { DayKey } from '../core/time';
import type { ChapterId, Colorway, RecordState, YourLine } from '../core/types';
import { COLORWAY_BY_ID, COLORWAYS, STANDARD_RULES } from '../content';
import { getDayOffset, setDayOffset, today } from '../services/clock';
import type { PlanKind } from '../services/purchases';
import { appStorage } from './storage';

export interface Settings {
  onboarded: boolean;
  /** Chapters in the mix (Full Edition). Discipline is always in. */
  chapters: ChapterId[];
  /** Free tier: the one chapter besides Discipline. */
  freeChapter: ChapterId;
  colorway: string;
  strongLanguage: boolean;
  reminders: { on: boolean; count: number; first: number; last: number };
  night: { on: boolean; time: number };
  dropAlerts: boolean;
  /** The user's three rules. */
  standard: string[];
  /** A rule the user wrote, kept so the standard page can show it again. */
  ownRule: string | null;
  /** The day-1 "Swipe up for the next line." hint has done its job. */
  hintDone: boolean;
}

export interface Reading {
  /** Line no → last day seen. */
  seen: Record<number, DayKey>;
  lifetimeSeen: number;
  hidden: number[];
  /** Saved line numbers, most recent first. */
  saved: number[];
  /** Free tier: lines counted toward today's 10. */
  counted: { day: DayKey; nos: number[] };
  /** The running head showed "DAY N" for this day. */
  dayHeadShown: DayKey | null;
  accessIntroShown: boolean;
  volumesSeen: number[];
}

export interface Premium {
  active: boolean;
  plan: PlanKind | null;
  renews: string | null;
  mode: 'preview' | 'revenuecat' | null;
}

export interface Account {
  userId: string | null;
  email: string | null;
}

export interface Remote {
  /** null until unsetld.com has answered once. */
  accessEnabled: boolean | null;
  collection: string;
}

interface State {
  hydrated: boolean;
  installSalt: string;
  settings: Settings;
  reading: Reading;
  record: RecordState;
  yourLines: YourLine[];
  premium: Premium;
  account: Account;
  remote: Remote;
  dayOffset: number;
  /** Real record saved when tester time travel starts; restored on return. */
  devSnapshot: RecordState | null;
  /** The UNSETLD day the UI is showing; refreshed on foreground and at 4:00 AM. */
  currentDay: DayKey;
  /** Colorway shown while browsing the colorway sheet (not saved). */
  previewColorway: string | null;

  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (verified: boolean) => void;
  recordToday: (verified: boolean) => boolean;
  answerNight: (day: DayKey, held: boolean) => void;
  markSeen: (no: number) => void;
  countLine: (no: number) => void;
  toggleSave: (no: number) => boolean;
  hideLine: (no: number) => void;
  resetSeen: (nos: number[]) => void;
  addYourLine: (text: string) => void;
  updateYourLine: (id: string, text: string) => void;
  removeYourLine: (id: string) => void;
  setPremium: (p: Partial<Premium>) => void;
  signIn: (a: Account) => void;
  signOut: () => void;
  setRemote: (r: Partial<Remote>) => void;
  letterShown: (l: Letter) => void;
  spendMemberPrice: () => void;
  claimPatch: () => void;
  markDayHead: (day: DayKey) => void;
  markAccessIntro: () => void;
  markVolume: (v: number) => void;
  setPreviewColorway: (id: string | null) => void;
  setDayOffset: (days: number) => void;
  backToRealToday: () => void;
  refreshDay: () => void;
  restore: (salt: string, record: RecordState) => void;
  setRecord: (record: RecordState) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  chapters: ['discipline', 'focus', 'training'],
  freeChapter: 'focus',
  colorway: 'black',
  strongLanguage: true,
  reminders: { on: false, count: 3, first: 7 * 60, last: 22 * 60 },
  night: { on: true, time: 21 * 60 + 30 },
  dropAlerts: false,
  standard: STANDARD_RULES.slice(0, 3),
  ownRule: null,
  hintDone: false,
};

const EMPTY_READING: Reading = {
  seen: {},
  lifetimeSeen: 0,
  hidden: [],
  saved: [],
  counted: { day: '', nos: [] },
  dayHeadShown: null,
  accessIntroShown: false,
  volumesSeen: [1],
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      installSalt: randomSalt(),
      settings: DEFAULT_SETTINGS,
      reading: EMPTY_READING,
      record: emptyRecord(),
      yourLines: [],
      premium: { active: false, plan: null, renews: null, mode: null },
      account: { userId: null, email: null },
      remote: { accessEnabled: null, collection: AppConfig.defaultCollection },
      dayOffset: 0,
      devSnapshot: null,
      currentDay: today(),
      previewColorway: null,

      updateSettings: patch => set(s => ({ settings: { ...s.settings, ...patch } })),

      completeOnboarding: verified => {
        const s = get();
        // Free tier keeps Discipline plus the first other chapter chosen.
        const extra = s.settings.chapters.find(c => c !== 'discipline') ?? 'focus';
        set({
          settings: { ...s.settings, onboarded: true, freeChapter: extra },
          record: recordDay(s.record, today(), verified),
        });
      },

      recordToday: verified => {
        const before = get().record;
        const after = recordDay(before, today(), verified);
        if (after !== before) set({ record: after });
        return Boolean(after.days[today()]) && !before.days[today()];
      },

      answerNight: (day, held) => set(s => ({ record: answerNight(s.record, day, held) })),

      markSeen: no =>
        set(s => {
          const d = today();
          if (s.reading.seen[no] === d) return s;
          return { reading: { ...s.reading, seen: { ...s.reading.seen, [no]: d }, lifetimeSeen: s.reading.lifetimeSeen + 1 } };
        }),

      countLine: no =>
        set(s => {
          const d = today();
          const cur = s.reading.counted.day === d ? s.reading.counted.nos : [];
          if (cur.includes(no)) return s;
          return { reading: { ...s.reading, counted: { day: d, nos: [...cur, no] } } };
        }),

      toggleSave: no => {
        const has = get().reading.saved.includes(no);
        set(s => ({
          reading: { ...s.reading, saved: has ? s.reading.saved.filter(n => n !== no) : [no, ...s.reading.saved] },
        }));
        return !has;
      },

      hideLine: no =>
        set(s => ({ reading: { ...s.reading, hidden: s.reading.hidden.includes(no) ? s.reading.hidden : [...s.reading.hidden, no] } })),

      resetSeen: nos =>
        set(s => {
          const seen = { ...s.reading.seen };
          for (const n of nos) delete seen[n];
          return { reading: { ...s.reading, seen } };
        }),

      addYourLine: text =>
        set(s => ({
          yourLines: [{ id: `y${Date.now().toString(36)}`, text: text.trim(), createdAt: Date.now() }, ...s.yourLines],
        })),
      updateYourLine: (id, text) =>
        set(s => ({ yourLines: s.yourLines.map(y => (y.id === id ? { ...y, text: text.trim() } : y)) })),
      removeYourLine: id => set(s => ({ yourLines: s.yourLines.filter(y => y.id !== id) })),

      setPremium: p => set(s => ({ premium: { ...s.premium, ...p } })),
      signIn: a => set({ account: a }),
      signOut: () => set({ account: { userId: null, email: null } }),
      setRemote: r => set(s => ({ remote: { ...s.remote, ...r } })),

      letterShown: l => set(s => ({ record: markLetterShown(s.record, l) })),
      spendMemberPrice: () => set(s => ({ record: spendMemberPrice(s.record, s.remote.collection, today()) })),
      claimPatch: () => set(s => ({ record: claimPatch(s.record, today()) })),

      markDayHead: day => set(s => ({ reading: { ...s.reading, dayHeadShown: day } })),
      markAccessIntro: () => set(s => ({ reading: { ...s.reading, accessIntroShown: true } })),
      markVolume: v =>
        set(s => ({ reading: { ...s.reading, volumesSeen: [...new Set([...s.reading.volumesSeen, v])] } })),
      setPreviewColorway: id => set({ previewColorway: id }),

      setDayOffset: days => {
        // First jump away from the real date: keep the real record to come back to.
        if (getDayOffset() === 0 && days !== 0 && !get().devSnapshot) set({ devSnapshot: get().record });
        setDayOffset(days);
        set({ dayOffset: days, currentDay: today() });
      },
      backToRealToday: () => {
        const snap = get().devSnapshot;
        setDayOffset(0);
        set({ dayOffset: 0, currentDay: today(), devSnapshot: null, ...(snap ? { record: snap } : {}) });
      },
      refreshDay: () => {
        const d = today();
        if (d !== get().currentDay) set({ currentDay: d });
      },
      restore: (salt, record) => set({ installSalt: salt, record }),
      setRecord: record => set({ record }),
    }),
    {
      name: 'unsetld-v2',
      storage: createJSONStorage(() => appStorage),
      partialize: s => ({
        installSalt: s.installSalt,
        settings: s.settings,
        reading: s.reading,
        record: s.record,
        yourLines: s.yourLines,
        premium: s.premium,
        account: s.account,
        remote: s.remote,
        dayOffset: s.dayOffset,
        devSnapshot: s.devSnapshot,
      }),
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
          reading: { ...EMPTY_READING, ...p.reading },
          record: { ...emptyRecord(), ...p.record },
        };
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

export interface Entitlements {
  premium: boolean;
  /** Chapters actually in the mix. */
  mix: ChapterId[];
  colorway: Colorway;
  maxReminders: number;
  yourLines: boolean;
}

export function entitlementsOf(s: Pick<State, 'settings' | 'premium'>): Entitlements {
  const premium = s.premium.active;
  const chosen = COLORWAY_BY_ID[s.settings.colorway] ?? COLORWAYS[0];
  const mix: ChapterId[] = premium
    ? ['discipline', ...s.settings.chapters.filter(c => c !== 'discipline')]
    : ['discipline', s.settings.freeChapter];
  return {
    premium,
    mix,
    colorway: premium || chosen.free ? chosen : COLORWAYS[0],
    maxReminders: premium ? FULL_MAX_REMINDERS : FREE_MAX_REMINDERS,
    yourLines: premium,
  };
}

/** What the user actually gets, Full Edition or not. */
export function useEntitlements(): Entitlements {
  const settings = useApp(s => s.settings);
  const premium = useApp(s => s.premium);
  // Recomputed per render; cheap and keeps references simple.
  return entitlementsOf({ settings, premium });
}

/** The colorway the reader shows right now (a live preview wins). */
export function useReaderColorway(): Colorway {
  const ent = useEntitlements();
  const preview = useApp(s => s.previewColorway);
  return preview ? COLORWAY_BY_ID[preview] ?? ent.colorway : ent.colorway;
}

export function useAccessEnabled(): boolean {
  const remote = useApp(s => s.remote.accessEnabled);
  return remote ?? AppConfig.accessDefault;
}
