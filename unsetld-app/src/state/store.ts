import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
import { AppConfig } from '../config/app';
import { randomSalt } from '../core/random';
import { legacyBalance } from '../core/legacy';
import { completeMission as completeMissionCore } from '../core/complete';
import { addSkip, DEFAULT_PROFILE, generatePlan, historyFrom, prunePlans, meetsRequirements, rerollMission as rerollCore, serves, type MissionHistory } from '../core/missions';
import { learnFrom, mondayOf } from '../core/personalize';
import { programMissions, programProgress, startProgram as startProgramCore } from '../core/programs';
import { clearPhotos, photosToClear } from '../core/proofs';
import { activeDays } from '../core/progress';
import { balance, redeem } from '../core/rewards';
import { computeStreak } from '../core/streak';
import { pauseTimer as pauseCore, resumeTimer as resumeCore, startTimer as startCore, type FocusTimer } from '../core/timer';
import { claimPatch, emptyRecord, markLetterShown, type Letter } from '../core/record';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import type { DayKey } from '../core/time';
import type { ChapterId, Colorway, DayPlan, Profile, ProgramState, ProofPhoto, RecordState, RewardTier, StatusTier, TrackId, Verification, WeeklyFocus } from '../core/types';
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
  /** Status (consistency) tiers from unsetld.com's config; null = the defaults in content/milestones.json. */
  status?: StatusTier[] | null;
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
  /** Week start (Monday) of the week the user said "Not this week" to the weekly focus question. */
  focusSkipped: DayKey | null;

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
  /** Rebuilds today's plan after the profile changes, if nothing in it was started, done or swapped yet. */
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
  /**
   * "What matters most this week?": sets or clears the focus for `week` (default: the focus's
   * own week, else this week). This week's replans today if nothing in it was started yet; a
   * later week's (Sunday's review) is kept aside until its Monday and leaves today alone.
   */
  setFocus: (focus: WeeklyFocus | null, week?: DayKey) => void;
  /** "Not this week": the question stays away until next Monday. */
  skipFocus: (week: DayKey) => void;
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
      focusSkipped: null,

      setProfile: patch =>
        set(s => {
          const profile = { ...s.profile, ...patch };
          // A program with missions the new answers rule out (School Reset after "not in school") stops;
          // the days already proven stay on the record.
          const p = s.program && !s.program.finishedDay ? PROGRAM_BY_ID[s.program.id] : undefined;
          const fits = !p || p.plan.flat().every(id => meetsRequirements(MISSION_BY_ID[id]?.requires, profile));
          return fits ? { profile } : { profile, program: null };
        }),

      ensurePlan: day => {
        const d = day ?? today();
        const s = get();
        const have = s.plans[d];
        if (have?.missions.length && have.missions.every(p => MISSION_BY_ID[p.missionId])) {
          if (have.missions.every(p => p.area)) return have;
          // A plan from an earlier build: record each mission's area once, as its row shows it.
          const plan = withAreas(have, s.profile);
          set(st => ({ plans: { ...st.plans, [d]: plan } }));
          return plan;
        }
        let plan: DayPlan;
        if (!have) plan = buildPlan(s, d);
        else {
          // A library update removed a planned mission, or the day has none: a day that was swapped,
          // proven or started keeps what's left while something in it is still open; an untouched
          // day, or one with nothing left to prove, is planned again and keeps its swap count.
          const kept = withAreas({ ...have, missions: have.missions.filter(p => MISSION_BY_ID[p.missionId]) }, s.profile);
          const open = kept.missions.some(p => s.record.missions?.[d]?.[p.missionId]?.verification?.status !== 'accepted');
          if (open && touched(s, kept, d)) plan = kept;
          else {
            plan = { ...buildPlan(s, d), rerolls: have.rerolls, replaced: have.replaced };
            // Still nothing fits: keep the stored day rather than saving it again on every call.
            if (!plan.missions.length && !have.missions.length) return have;
          }
        }
        const left = stranded(s, plan);
        set(st => ({ plans: { ...prunePlans(st.plans, d), [d]: plan }, ...left }));
        return plan;
      },

      replanToday: () => {
        const d = today();
        const s = get();
        if (touched(s, s.plans[d], d)) return;
        const plan = buildPlan(s, d);
        const left = stranded(s, plan);
        set(st => ({ plans: { ...st.plans, [d]: plan }, ...left }));
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
      setFocus: (focus, week) => {
        const now = mondayOf(get().currentDay);
        const target = week ?? focus?.week ?? now;
        if (target > now) {
          set(s => ({ profile: { ...s.profile, nextFocus: focus } }));
          return;
        }
        // This week's: a focus picked ahead for this week (now come round) is spent.
        set(s => ({ profile: { ...s.profile, focus, nextFocus: s.profile.nextFocus?.week === target ? null : s.profile.nextFocus } }));
        get().replanToday();
      },
      skipFocus: week => set({ focusSkipped: week }),
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
        // A snapshot kept by an earlier build can hold 3.0 preview area ids or a 2.x record: normalised like a backup.
        set({ dayOffset: 0, currentDay: today(), devSnapshot: null, ...(snap ? { record: fromBackup(snap) } : {}) });
      },
      refreshDay: () => {
        const d = today();
        if (d !== get().currentDay) set({ currentDay: d });
      },
      restore: (salt, record) => set({ installSalt: salt, record: fromBackup(record) }),
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
        focusSkipped: s.focusSkipped,
      }),
      version: 6,
      migrate: (persisted, version) => migrateState(persisted as Partial<State>, version),
      merge: (persisted, current) => {
        const p = withoutUnknownMissions((persisted ?? {}) as Partial<State>);
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
    hour: day === today() ? now().getHours() : undefined,
    program: prog && ids.length ? { id: prog.id, missionIds: ids } : null,
    // What the last four weeks say: swapped and ignored missions, preferred length, consistent areas.
    adapt: learnFrom(s.plans, s.record.missions, MISSION_BY_ID, day),
  };
}

function buildPlan(s: Pick<State, 'profile' | 'installSalt' | 'record' | 'plans' | 'skips' | 'program'>, day: DayKey): DayPlan {
  return generatePlan(planInput(s, day));
}

/**
 * Gives each planned mission without one the area its row shows (state/missions plannedArea):
 * the first of the user's areas it serves, else its own. Plans from earlier builds have none.
 */
function withAreas(plan: DayPlan, profile: Profile): DayPlan {
  if (plan.missions.every(p => p.area)) return plan;
  return {
    ...plan,
    missions: plan.missions.map(p => {
      const m = MISSION_BY_ID[p.missionId];
      return p.area || !m ? p : { ...p, area: profile.tracks.find(t => serves(m, t)) ?? m.track };
    }),
  };
}

/** A running timer or a waiting before photo, for one mission on one day. */
type Started = { missionId: string; day: DayKey } | null | undefined;

const inPlan = (x: Started, plan: DayPlan) => Boolean(x && x.day === plan.day && plan.missions.some(p => p.missionId === x.missionId));

/** Swapped, proven or started (a timer or a before photo for one of its missions): the day's plan stays. */
function touched(s: Pick<State, 'record' | 'timer' | 'pendingBefore'>, plan: DayPlan | undefined, day: DayKey): boolean {
  if (!plan) return false;
  return plan.rerolls > 0 || Object.keys(s.record.missions?.[day] ?? {}).length > 0 || inPlan(s.timer, plan) || inPlan(s.pendingBefore, plan);
}

/**
 * A new plan for a day takes along a timer or a before photo for a mission it no longer holds
 * (Home has no row for it, so it could never be proven): the notification and the photo go too.
 */
function stranded(s: Pick<State, 'timer' | 'pendingBefore'>, plan: DayPlan): Pick<State, 'timer' | 'pendingBefore'> {
  const keep = (x: Started) => !x || x.day !== plan.day || inPlan(x, plan);
  const timer = keep(s.timer) ? s.timer : null;
  const pendingBefore = keep(s.pendingBefore) ? s.pendingBefore : null;
  if (s.timer && !timer) void cancelTimerDone();
  if (s.pendingBefore && !pendingBefore) deletePhoto(s.pendingBefore.photo.uri);
  return { timer, pendingBefore };
}

/**
 * A saved timer or before photo for a mission removed from the library (3.0 preview builds had
 * other missions; retired missions are still known) can't be shown or proven: it goes on load,
 * with its notification and its photo.
 */
function withoutUnknownMissions(p: Partial<State>): Partial<State> {
  const gone = (x: Started) => Boolean(x && !MISSION_BY_ID[x.missionId]);
  const timer = gone(p.timer);
  const before = gone(p.pendingBefore) ? p.pendingBefore : null;
  if (!timer && !before) return p;
  // Afterwards: with synchronous storage this runs while the store is still being created.
  Promise.resolve().then(() => {
    if (timer) void cancelTimerDone();
    if (before) deletePhoto(before.photo.uri);
  });
  return { ...p, ...(timer ? { timer: null } : {}), ...(before ? { pendingBefore: null } : {}) };
}

/** A record from the Keychain backup, which an older build may have written. */
function fromBackup(r: RecordState): RecordState {
  const record = { ...emptyRecord(), ...r };
  return migrateRecordTracks({ ...record, legacyPoints: record.legacyPoints || legacyBalance(record) });
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
 * The area stored on each proven mission, with 3.0 preview builds' ids mapped onto today's.
 * Used for the saved record, the tester snapshot and the Keychain backup; a current record comes back unchanged.
 */
export function migrateRecordTracks(r: RecordState): RecordState {
  if (!r.missions) return r;
  const missions = Object.fromEntries(
    Object.entries(r.missions).map(([d, byId]) => [
      d,
      Object.fromEntries(Object.entries(byId ?? {}).map(([id, m]) => [id, m ? { ...m, track: toTrack(m.track) ?? m.track } : m])),
    ]),
  );
  return { ...r, missions };
}

/**
 * 2.x → 3.0: chapters become tracks, and the points earned from 2.x tasks (minus
 * codes already taken) carry over as a starting balance.
 */
export function migrateState(p: Partial<State>, version: number): Partial<State> {
  if (version >= 6) return p;
  return toV6(version >= 5 ? p : toV5(version >= 4 ? p : toV4(p, version)));
}

/** 5 → 6: the 3.0 weekly priority is retired (the weekly focus replaced it), so a lean nobody can see or clear goes. */
function toV6(p: Partial<State>): Partial<State> {
  if (!p.profile?.priority) return p;
  return { ...p, profile: { ...p.profile, priority: null } };
}

/** 4 → 5: the daily time choices became 15 / 30 / 45 / 60+ minutes (30–60 → 45, 60+ → 60). */
function toV5(p: Partial<State>): Partial<State> {
  const old = p.profile?.minutes as number | undefined;
  if (!p.profile || (old !== 60 && old !== 90)) return p;
  return { ...p, profile: { ...p.profile, minutes: old === 90 ? 60 : 45 } };
}

function toV4(p: Partial<State>, version: number): Partial<State> {
  // 3 → 4: the goal areas were renamed (focus → discipline, reset → organization; mindset folded into discipline).
  if (version >= 2) {
    const profile = (p.profile ?? DEFAULT_PROFILE) as Profile;
    const tracks = [...new Set((profile.tracks ?? []).map(t => toTrack(t)).filter((t): t is TrackId => Boolean(t)))].slice(0, 4);
    const record = p.record ? migrateRecordTracks({ ...emptyRecord(), ...p.record }) : undefined;
    // Tester time travel keeps the real record aside; it comes back with "Back to real today".
    const devSnapshot = p.devSnapshot ? migrateRecordTracks(p.devSnapshot) : undefined;
    const priority = profile.priority ? toTrack(profile.priority) : null;
    return {
      ...p,
      profile: { ...DEFAULT_PROFILE, ...profile, tracks: tracks.length ? tracks : DEFAULT_PROFILE.tracks, priority },
      ...(record ? { record } : {}),
      ...(devSnapshot ? { devSnapshot } : {}),
    };
  }
  const settings = (p.settings ?? {}) as { chapters?: ChapterId[]; freeChapter?: ChapterId };
  const chapters = [...(settings.chapters ?? []), settings.freeChapter].filter(Boolean) as ChapterId[];
  const tracks = [...new Set(chapters.map(c => CHAPTER_TO_TRACK[c]))].slice(0, 3);
  const record = { ...emptyRecord(), ...p.record } as RecordState;
  return {
    ...p,
    profile: { ...DEFAULT_PROFILE, tracks: tracks.length ? tracks : DEFAULT_PROFILE.tracks },
    record: { ...record, legacyPoints: record.legacyPoints || legacyBalance(record) },
    // A tester mid time travel keeps the real 2.x record aside, with its balance.
    ...(p.devSnapshot ? { devSnapshot: fromBackup(p.devSnapshot as RecordState) } : {}),
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

/** What the user actually gets, UNSETLD+ or not. */
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
