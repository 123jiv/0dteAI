import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
import { AppConfig } from '../config/app';
import { randomSalt } from '../core/random';
import { legacyBalance } from '../core/legacy';
import { completeMission as completeMissionCore } from '../core/complete';
import { addSkip, DEFAULT_PROFILE, generatePlan, historyFrom, prunePlans, rerollMission as rerollCore, type MissionHistory } from '../core/missions';
import { programMissions, programProgress, startProgram as startProgramCore } from '../core/programs';
import { clearPhotos, photosToClear } from '../core/proofs';
import { activeDays } from '../core/progress';
import { balance, redeem } from '../core/rewards';
import { computeStreak } from '../core/streak';
import { pauseTimer as pauseCore, resumeTimer as resumeCore, startTimer as startCore, type FocusTimer } from '../core/timer';
import { claimPatch, emptyRecord, markLetterShown, type Letter } from '../core/record';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import type { DayKey } from '../core/time';
import type { ChapterId, Colorway, DayPlan, Profile, ProgramState, ProofPhoto, RecordState, RewardTier, TrackId, Verification } from '../core/types';
import { COLORWAY_BY_ID, COLORWAYS, MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID, RULES } from '../content';
import { getDayOffset, now, setDayOffset, today } from '../services/clock';
import type { PlanKind } from '../services/purchases';
import { deletePhoto } from '../services/proof';
import { cancelTimerDone } from '../services/timerNotify';
import { appStorage } from './storage';

export interface Settings {
  onboarded: boolean;
  colorway: string;
  reminders: { on: boolean; count: number; first: number; last: number };
  dropAlerts: boolean;
  /** Proof photos are cleared after this many days (0 = keep). The mission record stays. */
  proofRetentionDays: number;
  /** Tester tools: focus timers run this many times faster (preview and dev builds only). */
  timerSpeed: number;
}

/** One-time UI state. */
export interface Reading {
  /** The day-3 Access note on Home has been seen. */
  accessIntroShown: boolean;
  /** Active days when the Rewards road last showed; the walker walks only when it changes. */
  road: number;
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
  /** Reward tiers from unsetld.com's config; null = use the defaults in content/rewards.json. */
  rewards?: RewardTier[] | null;
}

/** What proving a mission did, for the done screen. */
export interface MissionResult {
  points: number;
  bonus: number;
  balanceBefore: number;
  balanceAfter: number;
  streakBefore: number;
  streakAfter: number;
  /** Every mission in today's plan is proven. */
  perfect: boolean;
  accepted: boolean;
}

export type RerollResult = 'ok' | 'none' | 'limit';

/** A before photo waiting for its after (BEFORE_AFTER missions). */
export interface PendingBefore {
  missionId: string;
  day: DayKey;
  photo: ProofPhoto;
}

interface State {
  hydrated: boolean;
  installSalt: string;
  settings: Settings;
  reading: Reading;
  record: RecordState;
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

  // 3.0 missions
  profile: Profile;
  /** Each day's plan, once generated (kept six weeks). */
  plans: Record<DayKey, DayPlan>;
  skips: MissionHistory['skips'];
  timer: FocusTimer | null;
  pendingBefore: PendingBefore | null;
  program: ProgramState | null;
  /** Week start of the last weekly review the user closed. */
  reviewSeen: DayKey | null;
  /** Progress milestones whose moment was already shown (core/progress MilestoneKey). */
  momentsShown: string[];

  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (verified: boolean) => void;
  setPremium: (p: Partial<Premium>) => void;
  signIn: (a: Account) => void;
  signOut: () => void;
  setRemote: (r: Partial<Remote>) => void;
  letterShown: (l: Letter) => void;
  claimPatch: () => void;
  markAccessIntro: () => void;
  markRoad: (n: number) => void;
  setPreviewColorway: (id: string | null) => void;
  setDayOffset: (days: number) => void;
  backToRealToday: () => void;
  refreshDay: () => void;
  restore: (salt: string, record: RecordState) => void;
  setRecord: (record: RecordState) => void;

  setProfile: (patch: Partial<Profile>) => void;
  /** Today's plan, generated the first time it's asked for. */
  ensurePlan: (day?: DayKey) => DayPlan;
  /** Rebuilds today's plan after the profile changes, if nothing in it was done or swapped yet. */
  replanToday: () => void;
  rerollMission: (index: number) => RerollResult;
  startTimer: (missionId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  setPendingBefore: (p: PendingBefore | null) => void;
  completeMission: (missionId: string, photos: ProofPhoto[], verification: Verification, opts: { verifiedClock: boolean; timerSeconds?: number }) => MissionResult;
  redeemReward: (tier: RewardTier, minted: { code: string; url: string }) => void;
  startProgram: (id: string) => void;
  leaveProgram: () => void;
  markReviewSeen: (weekStart: DayKey) => void;
  markMomentShown: (key: string) => void;
  /** Clears proof photos older than the retention setting. Returns the files to delete. */
  expireProofPhotos: () => string[];
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  colorway: 'black',
  reminders: { on: false, count: 3, first: 7 * 60, last: 22 * 60 },
  dropAlerts: false,
  proofRetentionDays: RULES.proofRetentionDays,
  timerSpeed: 1,
};

const EMPTY_READING: Reading = {
  accessIntroShown: false,
  road: 0,
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      installSalt: randomSalt(),
      settings: DEFAULT_SETTINGS,
      reading: EMPTY_READING,
      record: emptyRecord(),
      premium: { active: false, plan: null, renews: null, mode: null },
      account: { userId: null, email: null },
      remote: { accessEnabled: null, collection: AppConfig.defaultCollection },
      dayOffset: 0,
      devSnapshot: null,
      currentDay: today(),
      previewColorway: null,

      profile: DEFAULT_PROFILE,
      plans: {},
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
      reviewSeen: null,
      momentsShown: [],

      setProfile: patch => set(s => ({ profile: { ...s.profile, ...patch } })),

      ensurePlan: day => {
        const d = day ?? today();
        const s = get();
        const have = s.plans[d];
        if (have && have.missions.every(p => MISSION_BY_ID[p.missionId])) return have;
        let plan: DayPlan;
        if (!have) plan = buildPlan(s, d);
        else {
          // A library update removed a planned mission: rebuild an untouched day, otherwise drop it.
          const touched = have.rerolls > 0 || Object.keys(s.record.missions?.[d] ?? {}).length > 0;
          plan = touched ? { ...have, missions: have.missions.filter(p => MISSION_BY_ID[p.missionId]) } : buildPlan(s, d);
        }
        set(st => ({ plans: { ...prunePlans(st.plans, d), [d]: plan } }));
        return plan;
      },

      replanToday: () => {
        const d = today();
        const s = get();
        const cur = s.plans[d];
        const touched = cur && (cur.rerolls > 0 || Object.keys(s.record.missions?.[d] ?? {}).length > 0);
        if (touched) return;
        set(st => ({ plans: { ...st.plans, [d]: buildPlan(st, d) } }));
      },

      rerollMission: index => {
        const d = today();
        const s = get();
        const plan = s.plans[d] ?? get().ensurePlan(d);
        const limit = s.premium.active ? RULES.rerolls.full : RULES.rerolls.free;
        if (plan.rerolls >= limit) return 'limit';
        const old = plan.missions[index];
        if (!old || s.record.missions?.[d]?.[old.missionId]) return 'none';
        const next = rerollCore(plan, index, planInput(s, d));
        if (!next) return 'none';
        // A running timer or a waiting before photo for the swapped-out mission goes with it.
        const timer = s.timer?.missionId === old.missionId ? null : s.timer;
        const pendingBefore = s.pendingBefore?.missionId === old.missionId ? null : s.pendingBefore;
        if (s.timer && !timer) cancelTimerDone();
        if (s.pendingBefore && !pendingBefore) void deletePhoto(s.pendingBefore.photo.uri);
        set(st => ({ plans: { ...st.plans, [d]: next }, skips: addSkip(st.skips, old.missionId, d), timer, pendingBefore }));
        return 'ok';
      },

      startTimer: missionId => {
        const m = MISSION_BY_ID[missionId];
        if (!m?.timerMinutes) return;
        set(s => ({ timer: startCore(missionId, today(), m.timerMinutes!, Date.now(), Math.max(1, s.settings.timerSpeed || 1)) }));
      },
      pauseTimer: () => set(s => (s.timer ? { timer: pauseCore(s.timer, Date.now()) } : {})),
      resumeTimer: () => set(s => (s.timer ? { timer: resumeCore(s.timer, Date.now()) } : {})),
      cancelTimer: () => set({ timer: null }),
      setPendingBefore: p => set({ pendingBefore: p }),

      completeMission: (missionId, photos, verification, opts) => {
        const d = today();
        const s = get();
        const mission = MISSION_BY_ID[missionId];
        const plan = s.plans[d] ?? null;
        const before = { balance: balance(s.record), streak: computeStreak(activeDays(s.record), d).current };
        if (!mission) {
          return { points: 0, bonus: 0, balanceBefore: before.balance, balanceAfter: before.balance, streakBefore: before.streak, streakAfter: before.streak, perfect: false, accepted: false };
        }
        const programId = plan?.missions.find(p => p.missionId === missionId)?.programId;
        const c = completeMissionCore(s.record, d, plan, mission, photos, verification, {
          at: Date.now(),
          verifiedClock: opts.verifiedClock,
          timerSeconds: opts.timerSeconds,
          programId,
        });
        const accepted = verification.status === 'accepted';
        let program = s.program;
        const prog = program ? PROGRAM_BY_ID[program.id] : null;
        if (accepted && program && prog && programId === program.id) program = programProgress(prog, program, d);
        set({
          record: c.record,
          program,
          timer: s.timer?.missionId === missionId ? null : s.timer,
          pendingBefore: s.pendingBefore?.missionId === missionId ? null : s.pendingBefore,
        });
        const after = { balance: balance(c.record), streak: computeStreak(activeDays(c.record), d).current };
        const perfect = !!plan && plan.missions.every(p => c.record.missions[d]?.[p.missionId]?.verification?.status === 'accepted');
        return { points: c.points, bonus: c.bonus, balanceBefore: before.balance, balanceAfter: after.balance, streakBefore: before.streak, streakAfter: after.streak, perfect, accepted };
      },

      redeemReward: (tier, minted) => set(s => ({ record: redeem(s.record, tier, s.remote.collection, today(), minted) })),

      startProgram: id => {
        if (!PROGRAM_BY_ID[id]) return;
        const d = today();
        set({ program: startProgramCore(id, d) });
        // Put the program's first day in today's plan if today hasn't been touched yet.
        get().replanToday();
      },
      leaveProgram: () => set({ program: null }),
      markReviewSeen: weekStart => set({ reviewSeen: weekStart }),
      markMomentShown: key => set(s => (s.momentsShown.includes(key) ? {} : { momentsShown: [...s.momentsShown, key] })),

      expireProofPhotos: () => {
        const s = get();
        const clear = photosToClear(s.record, s.settings.proofRetentionDays, today());
        if (clear.length) set({ record: clearPhotos(s.record, clear) });
        return clear.map(c => c.uri);
      },

      updateSettings: patch => set(s => ({ settings: { ...s.settings, ...patch } })),

      completeOnboarding: verified => {
        // A day goes on record when a mission is proven, not when onboarding ends.
        void verified;
        set(s => ({ settings: { ...s.settings, onboarded: true } }));
        get().ensurePlan(today());
      },

      setPremium: p => set(s => ({ premium: { ...s.premium, ...p } })),
      signIn: a => set({ account: a }),
      signOut: () => set({ account: { userId: null, email: null } }),
      setRemote: r => set(s => ({ remote: { ...s.remote, ...r } })),

      letterShown: l => set(s => ({ record: markLetterShown(s.record, l) })),
      claimPatch: () => set(s => ({ record: claimPatch(s.record, today()) })),
      markAccessIntro: () => set(s => ({ reading: { ...s.reading, accessIntroShown: true } })),
      markRoad: n => {
        if (get().reading.road !== n) set(s => ({ reading: { ...s.reading, road: n } }));
      },
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
      storage: readable(createJSONStorage(() => appStorage)),
      partialize: s => ({
        installSalt: s.installSalt,
        settings: s.settings,
        reading: s.reading,
        record: s.record,
        premium: s.premium,
        account: s.account,
        remote: s.remote,
        dayOffset: s.dayOffset,
        devSnapshot: s.devSnapshot,
        profile: s.profile,
        plans: s.plans,
        skips: s.skips,
        timer: s.timer,
        pendingBefore: s.pendingBefore,
        program: s.program,
        reviewSeen: s.reviewSeen,
        momentsShown: s.momentsShown,
      }),
      version: 4,
      migrate: (persisted, version) => migrateState(persisted as Partial<State>, version),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: known(DEFAULT_SETTINGS, p.settings),
          reading: known(EMPTY_READING, p.reading),
          record: { ...emptyRecord(), ...p.record },
          profile: { ...DEFAULT_PROFILE, ...p.profile },
        };
      },
      onRehydrateStorage: () => (state, error) => {
        // Hydration that fails never finishes, which would leave a blank screen: see readFailed.
        // Deferred, since with synchronous storage this runs while the store is still being created.
        if (error) Promise.resolve().then(readFailed);
        else if (state) setDayOffset(state.dayOffset ?? 0);
      },
    },
  ),
);

/** Everything the mission generator needs for a day. */
function planInput(s: Pick<State, 'profile' | 'installSalt' | 'record' | 'plans' | 'skips' | 'program'>, day: DayKey) {
  const prog = s.program ? PROGRAM_BY_ID[s.program.id] : null;
  const ids = prog && s.program ? programMissions(prog, s.program, day) : [];
  return {
    library: MISSIONS,
    profile: s.profile,
    day,
    salt: s.installSalt,
    history: historyFrom(s.record.missions ?? {}, s.plans, s.skips, day),
    // Morning missions only go into a plan made in the morning.
    hour: day === today() ? now().getHours() : 0,
    program: prog && ids.length ? { id: prog.id, missionIds: ids } : null,
  };
}

function buildPlan(s: Pick<State, 'profile' | 'installSalt' | 'record' | 'plans' | 'skips' | 'program'>, day: DayKey): DayPlan {
  return generatePlan(planInput(s, day));
}

const CHAPTER_TO_TRACK: Record<ChapterId, TrackId> = {
  discipline: 'discipline',
  focus: 'school',
  training: 'fitness',
  money: 'money',
  confidence: 'discipline',
  vices: 'discipline',
  stoic: 'discipline',
};

/** 3.0 preview builds had other goal areas; they map onto today's. */
const OLD_TRACK: Record<string, TrackId> = { focus: 'discipline', reset: 'organization', mindset: 'discipline' };
const KNOWN_TRACK = new Set<string>(['discipline', 'school', 'fitness', 'money', 'career', 'business', 'skills', 'projects', 'organization']);
const toTrack = (t: string): TrackId | null => (KNOWN_TRACK.has(t) ? (t as TrackId) : OLD_TRACK[t] ?? null);

/**
 * 2.x → 3.0: chapters become tracks, and the points earned from 2.x tasks (minus
 * codes already taken) carry over as a starting balance.
 */
export function migrateState(p: Partial<State>, version: number): Partial<State> {
  if (version >= 4) return p;
  // 3 → 4: the goal areas were renamed (focus → discipline, reset → organization; mindset folded into discipline).
  if (version >= 2) {
    const profile = (p.profile ?? DEFAULT_PROFILE) as Profile;
    const tracks = [...new Set((profile.tracks ?? []).map(t => toTrack(t)).filter((t): t is TrackId => Boolean(t)))].slice(0, 4);
    const record = p.record ? { ...emptyRecord(), ...p.record } : undefined;
    if (record?.missions) {
      record.missions = Object.fromEntries(
        Object.entries(record.missions).map(([d, byId]) => [
          d,
          Object.fromEntries(Object.entries(byId ?? {}).map(([id, m]) => [id, m ? { ...m, track: toTrack(m.track) ?? m.track } : m])),
        ]),
      );
    }
    const priority = profile.priority ? toTrack(profile.priority) : null;
    return { ...p, profile: { ...DEFAULT_PROFILE, ...profile, tracks: tracks.length ? tracks : DEFAULT_PROFILE.tracks, priority }, ...(record ? { record } : {}) };
  }
  const settings = (p.settings ?? {}) as { chapters?: ChapterId[]; freeChapter?: ChapterId };
  const chapters = [...(settings.chapters ?? []), settings.freeChapter].filter(Boolean) as ChapterId[];
  const tracks = [...new Set(chapters.map(c => CHAPTER_TO_TRACK[c]))].slice(0, 3);
  const record = { ...emptyRecord(), ...p.record } as RecordState;
  return {
    ...p,
    profile: { ...DEFAULT_PROFILE, tracks: tracks.length ? tracks : DEFAULT_PROFILE.tracks },
    record: { ...record, legacyPoints: record.legacyPoints || legacyBalance(record) },
  };
}

/** Only the keys the current version knows, so retired 2.x settings aren't saved again. */
function known<T extends object>(defaults: T, saved: Partial<T> | undefined): T {
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof T)[]) if (saved && saved[k] !== undefined) out[k] = saved[k] as T[keyof T];
  return out;
}

/**
 * An entry that won't parse is treated as empty, so hydration still finishes
 * (and its listeners run) on defaults. useBootstrap brings the record back
 * from the Keychain. A read that fails is different: see readFailed.
 */
function readable<S>(json: PersistStorage<S> | undefined): PersistStorage<S> | undefined {
  if (!json) return json;
  const corrupt = (e: unknown) => {
    if (e instanceof SyntaxError) return null;
    throw e;
  };
  return {
    ...json,
    getItem: name => {
      try {
        const v = json.getItem(name);
        return v instanceof Promise ? v.catch(corrupt) : v;
      } catch (e) {
        return corrupt(e);
      }
    },
  };
}

// Storage can be synchronous (web), in which case hydration finishes while the
// store is still being created; mark it afterwards either way.
const markHydrated = () => useApp.setState({ hydrated: true, currentDay: today() });
if (useApp.persist.hasHydrated()) markHydrated();
else useApp.persist.onFinishHydration(markHydrated);

let readFails = 0;

/**
 * Storage couldn't be read. A notification tap (timer done, a drop alert) can launch the app in the
 * background while the phone is still locked after a restart, when its files
 * can't be read yet. Defaults then would stay in memory, show onboarding on the
 * next open and be saved over the real record. So it reads again in the
 * foreground, and only if that fails too does it open on defaults rather than a
 * blank screen (useBootstrap brings the record back from the Keychain).
 */
function readFailed() {
  readFails += 1;
  if (AppState.currentState === 'active') {
    if (readFails < 2) useApp.persist.rehydrate();
    else markHydrated();
    return;
  }
  const sub = AppState.addEventListener('change', st => {
    if (st !== 'active') return;
    sub.remove();
    useApp.persist.rehydrate();
  });
}

const onAppState = (cb: () => void) => {
  const sub = AppState.addEventListener('change', cb);
  return () => sub.remove();
};
const isActive = () => AppState.currentState === 'active';

/** The app is in the foreground. A notification action can launch it in the background, where nothing should count. */
export function useAppActive(): boolean {
  return useSyncExternalStore(onAppState, isActive);
}

export interface Entitlements {
  premium: boolean;
  colorway: Colorway;
  maxReminders: number;
  /** Swaps a day. */
  maxSwaps: number;
}

export function entitlementsOf(s: Pick<State, 'settings' | 'premium'>): Entitlements {
  const premium = s.premium.active;
  const chosen = COLORWAY_BY_ID[s.settings.colorway] ?? COLORWAYS[0];
  return {
    premium,
    colorway: premium || chosen.free ? chosen : COLORWAYS[0],
    maxReminders: premium ? FULL_MAX_REMINDERS : FREE_MAX_REMINDERS,
    maxSwaps: premium ? RULES.rerolls.full : RULES.rerolls.free,
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
