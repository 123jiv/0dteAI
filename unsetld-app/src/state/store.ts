import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { randomSalt } from '../core/random';
import { legacyBalance } from '../core/legacy';
import { completeMission as completeMissionCore } from '../core/complete';
import { FEATURES, hasFeature, planOpenToAll, type Feature, type FeatureMap } from '../core/features';
import { goalReach } from '../core/areaChoice';
import { asPlanned, customsIn, CUSTOM_KEEP, CUSTOM_PER_DAY, isCustomId, makeCustomMission, type CustomInput } from '../core/custom';
import { dayNumberOf } from '../core/history';
import {
  addSkip,
  DEFAULT_PROFILE,
  generatePlan,
  historyFrom,
  planAreas,
  prunePlans,
  meetsRequirements,
  replacementChoices,
  replaceWith,
  rerollMission as rerollCore,
  serves,
  type MissionHistory,
  type SlotPick,
} from '../core/missions';
import { focusFacts, onboardingFacts, planLeft, provenEvents, swapFacts } from '../core/metrics';
import { learnFrom, mondayOf } from '../core/personalize';
import { finishOf, planMomentKey, programMissions, programProgress, recordPlanFinish, startProgram as startProgramCore } from '../core/programs';
import { clearPhotos, oldestPhotos, photosToClear, photoUris } from '../core/proofs';
import { activeDays } from '../core/progress';
import { balance, effectiveStatus, parseRewards, parseStatus, redeem, statusFromMilestones } from '../core/rewards';
import { computeStreak } from '../core/streak';
import { missionTitle } from '../core/titles';
import { pauseTimer as pauseCore, resumeTimer as resumeCore, startTimer as startCore, type FocusTimer } from '../core/timer';
import { dayCount, emptyRecord, markLetterShown, type Letter } from '../core/record';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import { addDays, dayKeyOf, type DayKey } from '../core/time';
import type { ChapterId, Colorway, DayPlan, Mission, Profile, Program, ProgramState, ProofPhoto, RecordState, RewardTier, StatusTier, SwapReason, TrackId, Verification, WeeklyFocus } from '../core/types';
import { clearCustomMissions, COLORWAY_BY_ID, COLORWAYS, isApproved, MILESTONES, MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID, registerCustomMissions, RULES } from '../content';
import { getDayOffset, now, setDayOffset, today } from '../services/clock';
import { track, trackEach } from '../services/metrics';
import type { PlanKind } from '../services/purchases';
import { deletePhoto, webPhotoKeys } from '../services/proof';
import { cancelTimerDone } from '../services/timerNotify';
import { appStorage, setRoomMaker } from './storage';

export interface Settings {
  onboarded: boolean;
  colorway: string;
  reminders: { on: boolean; count: number; first: number; last: number };
  dropAlerts: boolean;
  /** Proof photos are cleared after this many days (0 = keep). The mission record stays. */
  proofRetentionDays: number;
  /** Tester tools: focus timers run this many times faster (preview and dev builds only). */
  timerSpeed: number;
  /**
   * 3.3 (store v8): the 13+ age gate. 'ok' once answered 13 or over; 'under13' blocks this
   * install for good; null = not asked yet (installs from before the gate are asked once).
   */
  ageCheck: AgeCheck;
  /**
   * 3.3 (store v8): share anonymous usage counts. null = never asked, which records and sends
   * nothing (only true does, and only where the remote switch allows it).
   */
  shareUsage: boolean | null;
}

/** The 13+ age gate's answer (Settings.ageCheck). */
export type AgeCheck = 'ok' | 'under13' | null;

/** One-time UI state. */
export interface Reading {
  /** The day-3 Access note on Home has been seen. */
  accessIntroShown: boolean;
  /** Active days when the Rewards road last showed; the walker walks only when it changes. */
  road: number;
  /**
   * 3.3 (store v8): the reminders offer on Today after the first proof. null = not offered
   * yet; a day = first shown that day (it shows again only that day); 'done' = answered, or
   * never needed (store v8 sets it for users onboarded before it existed).
   */
  remindersOffer: DayKey | 'done' | null;
}

export interface Premium {
  active: boolean;
  plan: PlanKind | null;
  renews: string | null;
  mode: 'preview' | 'revenuecat' | null;
  /** 3.3 (store v8): ISO date a free trial ends, while in one that will renew. */
  trialEnds?: string | null;
  /** 3.3 (store v8): ISO date the membership ends, when it won't renew. */
  ends?: string | null;
  /** 3.3 (store v8): the store product id of the active membership. */
  productId?: string | null;
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
  /** 3.3 (store v8): unsetld.com's switch for anonymous usage counts. Absent = off (nothing is sent). */
  metrics?: boolean;
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
  /** 3.2: the day's place on the record ("Day 12"), once something is proven today. */
  dayNumber: number;
  /** 3.2: missions proven today and in today's plan, after this one ("1 / 3 today"). */
  provenToday: number;
  plannedToday: number;
  /** 3.2: this proof put today on the record (nothing else proven today before it). */
  firstToday: boolean;
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
  /** Real plans saved with it: the travelled days' plans would push them out (six weeks are kept). */
  devPlans: Record<DayKey, DayPlan> | null;
  /** The UNSETLD day the UI is showing; refreshed on foreground and at 4:00 AM. */
  currentDay: DayKey;
  /** Colorway shown while browsing the colorway sheet (not saved). */
  previewColorway: string | null;
  /**
   * The day turned over (4:00 AM) with an earlier day's timer or before photo still going: they
   * went (refreshDay), and Today says so once (takeDayEnded). Not saved.
   */
  dayEnded: boolean;

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
  /**
   * Full-screen moments already shown (core/moments): progress milestones (core/progress
   * MilestoneKey), Plan finishes (core/programs planMomentKey) and `day:<DayKey>` for a day that
   * already had its one moment or status letter.
   */
  momentsShown: string[];
  /** Week start (Monday) of the week the user said "Not this week" to the weekly focus question. */
  focusSkipped: DayKey | null;
  /** 3.2: missions of the user's own (core/custom), newest last. */
  customMissions: Mission[];

  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (verified: boolean) => void;
  setPremium: (p: Partial<Premium>) => void;
  signIn: (a: Account) => void;
  signOut: () => void;
  setRemote: (r: Partial<Remote>) => void;
  /** A status letter was seen: it, and every lower tier's letter in effect, won't come again. */
  letterShown: (l: Letter) => void;
  markAccessIntro: () => void;
  markRoad: (n: number) => void;
  setPreviewColorway: (id: string | null) => void;
  setDayOffset: (days: number) => void;
  backToRealToday: () => void;
  /**
   * The UNSETLD day as the clock says now. A timer or a before photo from an earlier day goes
   * (that day's plan is closed): the timer's notification is cancelled, the photo deleted, and
   * dayEnded set for Today to say so.
   */
  refreshDay: () => void;
  /** Whether a timer or before photo went at the rollover since this was last asked (it's asked once: the dialog). */
  takeDayEnded: () => boolean;
  /**
   * Delete data on this phone (services/wipe): the state a new install starts with, saved: a new
   * salt, today's day, not onboarded. The server config is kept, and the membership is inactive
   * until the store says otherwise (its mode kept). The user's own missions leave the lookup, the
   * clock's tester offset goes to 0, and the first build's saved state and the preview's photos go.
   */
  resetLocalData: () => void;
  restore: (salt: string, record: RecordState) => void;
  setRecord: (record: RecordState) => void;

  setProfile: (patch: Partial<Profile>) => void;
  /** Today's plan, generated the first time it's asked for. */
  ensurePlan: (day?: DayKey) => DayPlan;
  /** Rebuilds today's plan after the profile changes, if nothing in it was started, done or swapped yet. */
  replanToday: () => void;
  rerollMission: (index: number) => RerollResult;
  /**
   * 3.2: swaps the mission at `index` for `missionId` (one of `choicesFor`, or one of the user's
   * own), for the reason given. One swap, like rerollMission.
   */
  replaceMission: (index: number, missionId: string, reason: SwapReason) => RerollResult | 'invalid';
  /** 3.2: a mission of the user's own from "+ Create my own"; null when the input isn't valid. */
  createCustomMission: (input: CustomInput) => Mission | null;
  startTimer: (missionId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  setPendingBefore: (p: PendingBefore | null) => void;
  completeMission: (missionId: string, photos: ProofPhoto[], verification: Verification, opts: { verifiedClock: boolean; timerSeconds?: number }) => MissionResult;
  /**
   * Records a code taken (core/rewards redeem): its last day is the server's `expires` when it
   * sent one. `code: ''` marks a status tier taken whose code never reached this phone.
   */
  redeemReward: (tier: RewardTier, minted: { code: string; url: string; expires?: string }) => void;
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
  ageCheck: null,
  shareUsage: null,
};

const EMPTY_READING: Reading = {
  accessIntroShown: false,
  road: 0,
  remindersOffer: null,
};

/** No membership. The saved membership is kept whole (not merged); store v8 fills these into older ones. */
export const EMPTY_PREMIUM: Premium = { active: false, plan: null, renews: null, mode: null, trialEnds: null, ends: null, productId: null };

/**
 * The built-in status tiers (content/milestones.json), for the letters' lower tiers: the same
 * list as services/access STATUS_DEFAULTS, which imports this store.
 */
const STATUS_BUILT_IN = statusFromMilestones(MILESTONES);

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      installSalt: randomSalt(),
      settings: DEFAULT_SETTINGS,
      reading: EMPTY_READING,
      record: emptyRecord(),
      premium: EMPTY_PREMIUM,
      account: { userId: null, email: null },
      remote: { accessEnabled: null, collection: AppConfig.defaultCollection },
      dayOffset: 0,
      devSnapshot: null,
      devPlans: null,
      currentDay: today(),
      previewColorway: null,
      dayEnded: false,

      profile: DEFAULT_PROFILE,
      plans: {},
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
      reviewSeen: null,
      momentsShown: [],
      focusSkipped: null,
      customMissions: [],

      setProfile: patch =>
        set(s => {
          const profile = { ...s.profile, ...patch };
          // A program with missions the new answers rule out stops; the days already proven stay on
          // the record. None can today: the validator keeps missions with a requirement out of plans.
          const p = s.program && !s.program.finishedDay ? PROGRAM_BY_ID[s.program.id] : undefined;
          const fits = !p || p.plan.flat().every(id => meetsRequirements(MISSION_BY_ID[id]?.requires, profile, today()));
          return fits ? { profile } : { profile, program: null };
        }),

      ensurePlan: day => {
        const d = day ?? today();
        const s = get();
        const have = s.plans[d];
        // Kept as it is only while every mission in it is an approved one or one of the user's own
        // (MISSION_BY_ID): a day planned before 3.3's library holds retired ids and is planned again.
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
          // proven or started keeps what's left while something in it is still open, with another
          // approved mission in each retired one's place (refilled); an untouched day, or one with
          // nothing left to prove, is planned again and keeps its swap count.
          // A retired mission proven that day stays on the record with its title either way.
          const kept = withAreas({ ...have, missions: have.missions.filter(p => MISSION_BY_ID[p.missionId]) }, s.profile);
          const open = kept.missions.some(p => s.record.missions?.[d]?.[p.missionId]?.verification?.status !== 'accepted');
          if (open && touched(s, kept, d)) plan = refilled(s, d, have);
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
        if (plan.rerolls >= entitlementsOf(s).maxSwaps) return 'limit';
        const old = plan.missions[index];
        if (!old || s.record.missions?.[d]?.[old.missionId]) return 'none';
        const rolled = rerollCore(plan, index, planInput(s, d));
        if (!rolled) return 'none';
        // Like replaceMission: a swap after the first earns at most what it replaces.
        const cap = swapCap(plan, index);
        const got = rolled.missions[index];
        const next =
          cap !== undefined && got && cap < (MISSION_BY_ID[got.missionId]?.points ?? 0)
            ? { ...rolled, missions: rolled.missions.map((p, i) => (i === index ? { ...p, points: cap } : p)) }
            : rolled;
        // A running timer or a waiting before photo for the swapped-out mission goes with it.
        const timer = s.timer?.missionId === old.missionId ? null : s.timer;
        const pendingBefore = s.pendingBefore?.missionId === old.missionId ? null : s.pendingBefore;
        if (s.timer && !timer) cancelTimerDone();
        if (s.pendingBefore && !pendingBefore) void deletePhoto(s.pendingBefore.photo.uri);
        set(st => ({ plans: { ...st.plans, [d]: next }, skips: addSkip(st.skips, old.missionId, d), timer, pendingBefore }));
        return 'ok';
      },

      replaceMission: (index, missionId, reason) => {
        const d = today();
        const s = get();
        const plan = s.plans[d] ?? get().ensurePlan(d);
        if (plan.rerolls >= entitlementsOf(s).maxSwaps) return 'limit';
        const old = plan.missions[index];
        if (!old || s.record.missions?.[d]?.[old.missionId]) return 'none';
        const mission = MISSION_BY_ID[missionId];
        if (!mission) return 'invalid';
        let area: TrackId;
        let points: number | undefined;
        if (isCustomId(missionId)) {
          // One of the user's own: one a day, and never worth more than what it replaces.
          if (!mission.custom || !s.customMissions.some(m => m.id === missionId)) return 'invalid';
          if (customsIn(plan) - (isCustomId(old.missionId) ? 1 : 0) >= CUSTOM_PER_DAY) return 'invalid';
          area = mission.track;
          const worth = typeof old.points === 'number' ? old.points : (MISSION_BY_ID[old.missionId]?.points ?? mission.points);
          points = Math.min(mission.points, worth);
        } else {
          // One of the choices offered; else any approved mission that could be planned today, in
          // one of the day's areas (core/missions planAreas: never one the user didn't choose).
          const pick = choicesFor(s, d, plan, index, reason, 6).find(p => p.mission.id === missionId);
          if (pick) area = pick.area;
          else {
            const usable = isApproved(missionId) && meetsRequirements(mission.requires, s.profile, d) && !plan.replaced.includes(missionId);
            const to = usable ? planAreas({ library: MISSIONS, profile: s.profile, day: d }).find(t => serves(mission, t)) : undefined;
            if (!to) return 'invalid';
            area = to;
          }
          // Swaps after the first earn at most what they replace: UNSETLD+ never earns more.
          const cap = swapCap(plan, index);
          if (cap !== undefined && cap < mission.points) points = cap;
        }
        const next = replaceWith(plan, index, mission, area, reason, Date.now(), points);
        if (!next) return 'invalid';
        const timer = s.timer?.missionId === old.missionId ? null : s.timer;
        const pendingBefore = s.pendingBefore?.missionId === old.missionId ? null : s.pendingBefore;
        if (s.timer && !timer) cancelTimerDone();
        if (s.pendingBefore && !pendingBefore) void deletePhoto(s.pendingBefore.photo.uri);
        // "Can't do this today" keeps nothing away beyond today (plan.replaced does that).
        const skips = reason === 'cant-today' ? s.skips : addSkip(s.skips, old.missionId, d);
        set(st => ({ plans: { ...st.plans, [d]: next }, skips, timer, pendingBefore }));
        track('mission_swapped', swapFacts(old.missionId, missionId, reason, next.rerolls, entitlementsOf(s).maxSwaps));
        return 'ok';
      },

      createCustomMission: input => {
        const id = `custom-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
        const m = makeCustomMission(input, id);
        if (!m) return null;
        registerCustomMissions([m]);
        set(s => {
          // The oldest go past CUSTOM_KEEP, unless a kept plan, a timer or a before photo still uses one.
          // The real plans kept aside during tester time travel count too (they come back).
          const plans = [...Object.values(s.plans), ...Object.values(s.devPlans ?? {})];
          const used = new Set([...plans.flatMap(p => p.missions.map(x => x.missionId)), s.timer?.missionId, s.pendingBefore?.missionId]);
          const all = [...s.customMissions.filter(c => c.title.toLowerCase() !== m.title.toLowerCase() || used.has(c.id)), m];
          const extra = all.length - CUSTOM_KEEP;
          const keep = extra > 0 ? all.filter((c, i) => i >= extra || used.has(c.id)) : all;
          return { customMissions: keep };
        });
        return m;
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
          const n = activeDays(s.record);
        return {
          points: 0,
          bonus: 0,
          balanceBefore: before.balance,
          balanceAfter: before.balance,
          streakBefore: before.streak,
          streakAfter: before.streak,
          perfect: false,
          accepted: false,
          dayNumber: n.size + (n.has(d) ? 0 : 1),
          provenToday: 0,
          plannedToday: plan?.missions.length ?? 0,
          firstToday: false,
        };
        }
        const programId = plan?.missions.find(p => p.missionId === missionId)?.programId;
        const c = completeMissionCore(s.record, d, plan, mission, photos, verification, {
          at: Date.now(),
          verifiedClock: opts.verifiedClock,
          timerSeconds: opts.timerSeconds,
          programId,
          // The title as the user saw it ("Work on Your Clothing Brand for 30 Minutes"), kept next to P1.
          title: missionTitle(mission, s.profile),
        });
        const accepted = verification.status === 'accepted';
        let program = s.program;
        const prog = program ? PROGRAM_BY_ID[program.id] : null;
        if (accepted && program && prog && programId === program.id) program = programProgress(prog, program, d);
        // The proof that finishes a Plan puts it on the record (plansFinished, backed up with it):
        // leaving, clearing or starting another Plan never takes it off.
        const finished = program?.finishedDay && !s.program?.finishedDay ? program.finishedDay : null;
        set({
          record: program && finished ? recordPlanFinish(c.record, program.id, finished) : c.record,
          program,
          timer: s.timer?.missionId === missionId ? null : s.timer,
          pendingBefore: s.pendingBefore?.missionId === missionId ? null : s.pendingBefore,
        });
        const after = { balance: balance(c.record), streak: computeStreak(activeDays(c.record), d).current };
        const perfect = !!plan && plan.missions.every(p => c.record.missions[d]?.[p.missionId]?.verification?.status === 'accepted');
        const isAccepted = (m: { verification?: { status?: string } } | undefined) => m?.verification?.status === 'accepted';
        const firstToday = accepted && !Object.values(s.record.missions?.[d] ?? {}).some(isAccepted);
        const provenToday = plan ? plan.missions.filter(p => isAccepted(c.record.missions[d]?.[p.missionId])).length : Object.values(c.record.missions[d] ?? {}).filter(isAccepted).length;
        const shownUp = activeDays(c.record);
        if (accepted) trackEach(provenEvents({ before: s.record, after: c.record, day: d, plan, mission, streak: after.streak, clock: opts.verifiedClock, hour: now().getHours(), minutes: s.profile.minutes, finished: program && prog && finished ? { id: program.id, startedDay: program.startedDay, days: prog.days, finishedDay: finished } : null }));
        return {
          points: c.points,
          bonus: c.bonus,
          balanceBefore: before.balance,
          balanceAfter: after.balance,
          streakBefore: before.streak,
          streakAfter: after.streak,
          perfect,
          accepted,
          dayNumber: dayNumberOf(c.record, d) ?? shownUp.size + 1,
          provenToday,
          plannedToday: plan?.missions.length ?? provenToday,
          firstToday,
        };
      },

      redeemReward: (tier, minted) => set(s => ({ record: redeem(s.record, tier, s.remote.collection, today(), minted) })),

      startProgram: id => {
        if (!PROGRAM_BY_ID[id]) return;
        const d = today();
        if (get().program?.id !== id) track('plan_left', planLeft(get().program, p => Boolean(PROGRAM_BY_ID[p]), 'switched'));
        set({ program: startProgramCore(id, d) });
        track('plan_started', { plan: id, free: PROGRAM_BY_ID[id].free });
        // Put the program's first day in today's plan if today hasn't been touched yet.
        get().replanToday();
      },
      leaveProgram: () => {
        track('plan_left', planLeft(get().program, p => Boolean(PROGRAM_BY_ID[p]), 'left'));
        set({ program: null });
      },
      markReviewSeen: weekStart => set({ reviewSeen: weekStart }),
      setFocus: (focus, week) => {
        const now = mondayOf(get().currentDay);
        const target = week ?? focus?.week ?? now;
        track('weekly_focus_set', focusFacts(focus, target > now));
        if (target > now) {
          set(s => ({ profile: { ...s.profile, nextFocus: focus } }));
          return;
        }
        // This week's: a focus picked ahead for this week (now come round) is spent.
        set(s => ({ profile: { ...s.profile, focus, nextFocus: s.profile.nextFocus?.week === target ? null : s.profile.nextFocus } }));
        get().replanToday();
      },
      skipFocus: week => {
        track('weekly_focus_set', focusFacts('skip', week > mondayOf(get().currentDay)));
        set({ focusSkipped: week });
      },
      markMomentShown: key => set(s => (s.momentsShown.includes(key) ? {} : { momentsShown: [...s.momentsShown, key] })),

      expireProofPhotos: () => {
        const s = get();
        const clear = photosToClear(s.record, s.settings.proofRetentionDays, today());
        if (clear.length) set({ record: clearPhotos(s.record, clear) });
        // Tester time travel: the real record kept aside still shows these, so their files stay.
        const real = s.devSnapshot ? photoUris(s.devSnapshot) : null;
        return clear.map(c => c.uri).filter(uri => !real?.has(uri));
      },

      updateSettings: patch => set(s => ({ settings: { ...s.settings, ...patch } })),

      completeOnboarding: verified => {
        // A day goes on record when a mission is proven, not when onboarding ends.
        void verified;
        set(s => ({ settings: { ...s.settings, onboarded: true } }));
        get().ensurePlan(today());
        track('onboarding_completed', onboardingFacts(get().profile, goalReach(MISSIONS, get().profile, get().profile.goal, today()), dayCount(get().record) > 0));
      },

      setPremium: p => set(s => ({ premium: { ...s.premium, ...p } })),
      signIn: a => set({ account: a }),
      signOut: () => set({ account: { userId: null, email: null } }),
      setRemote: r => set(s => ({ remote: { ...s.remote, ...r } })),

      letterShown: l => set(s => ({ record: markLetterShown(s.record, l, effectiveStatus(STATUS_BUILT_IN, s.remote.status)) })),
      markAccessIntro: () => set(s => ({ reading: { ...s.reading, accessIntroShown: true } })),
      markRoad: n => {
        if (get().reading.road !== n) set(s => ({ reading: { ...s.reading, road: n } }));
      },
      setPreviewColorway: id => set({ previewColorway: id }),

      setDayOffset: days => {
        // First jump away from the real date: keep the real record and plans to come back to.
        if (getDayOffset() === 0 && days !== 0 && !get().devSnapshot) set({ devSnapshot: get().record, devPlans: get().plans });
        setDayOffset(days);
        set({ dayOffset: days, currentDay: today() });
      },
      backToRealToday: () => {
        const { devSnapshot: snap, devPlans } = get();
        setDayOffset(0);
        // A snapshot kept by an earlier build can hold 3.0 preview area ids or a 2.x record: normalised like a backup.
        // One kept before plans were kept with it leaves the plans as they are.
        set({
          dayOffset: 0,
          currentDay: today(),
          devSnapshot: null,
          devPlans: null,
          ...(snap ? { record: fromBackup(snap) } : {}),
          ...(snap && devPlans ? { plans: devPlans } : {}),
        });
      },
      refreshDay: () => {
        const d = today();
        const s = get();
        const left = endedEarlier(s, d);
        if (d === s.currentDay && !left) return;
        set({ currentDay: d, ...(left ? { ...left, dayEnded: true } : {}) });
      },
      takeDayEnded: () => {
        if (!get().dayEnded) return false;
        set({ dayEnded: false });
        return true;
      },
      resetLocalData: () => {
        const s = get();
        clearCustomMissions();
        setDayOffset(0);
        useApp.persist.clearStorage();
        // A new install's state (actions included), saved as this version's defaults. An
        // under-13 block stays: it is for good on this install, and the age gate saves it before
        // its delete starts.
        const initial = useApp.getInitialState();
        useApp.setState(
          {
            ...initial,
            ...(s.settings.ageCheck === 'under13' ? { settings: { ...initial.settings, ageCheck: 'under13' as const } } : {}),
            hydrated: true,
            installSalt: randomSalt(),
            currentDay: today(),
            remote: s.remote,
            premium: { ...EMPTY_PREMIUM, mode: s.premium.mode },
          },
          true,
        );
        removeLegacyState();
        for (const key of webPhotoKeys()) deletePhoto(key);
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
        devPlans: s.devPlans,
        profile: s.profile,
        plans: s.plans,
        skips: s.skips,
        timer: s.timer,
        pendingBefore: s.pendingBefore,
        program: s.program,
        reviewSeen: s.reviewSeen,
        momentsShown: s.momentsShown,
        focusSkipped: s.focusSkipped,
        customMissions: s.customMissions,
      }),
      version: 8,
      migrate: (persisted, version) => migrateState(persisted as Partial<State>, version),
      merge: (persisted, current) => {
        // The user's own missions first: a plan, a timer or a proof may name one. One saved before
        // 3.3 is marked USER_CREATED here, as registerCustomMissions marks it in the lookup.
        const saved = (persisted ?? {}) as Partial<State>;
        const customMissions = (Array.isArray(saved.customMissions) ? saved.customMissions.filter(m => m && isCustomId(String(m.id)) && m.custom) : []).map(m =>
          m.source === 'USER_CREATED' ? m : { ...m, source: 'USER_CREATED' as const },
        );
        registerCustomMissions(customMissions);
        const loaded = withoutUnknownMissions({ ...saved, customMissions });
        // A dev build updated to a release one (same bundle id) leaves tester state behind; a
        // release build has no tester tools to undo it.
        const p = IS_PREVIEW ? loaded : withoutTesterState(loaded);
        return {
          ...current,
          ...p,
          settings: known(DEFAULT_SETTINGS, p.settings),
          reading: known(EMPTY_READING, p.reading),
          // A status list saved by an earlier build (early access, the patch) isn't a list of
          // discount codes, and a saved reward list may hold a tier that isn't a discount: read
          // both again like a new config, so what's left over falls back to the built-in tiers.
          remote: { ...current.remote, ...p.remote, rewards: parseRewards(p.remote?.rewards), status: parseStatus(p.remote?.status) },
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
    // Plans from before a library update hold retired missions; they aren't this user's week with these ones.
    history: historyFrom(s.record.missions ?? {}, s.plans, s.skips, day, id => id in MISSION_BY_ID),
    // Morning missions only go into a plan made in the morning.
    hour: day === today() ? now().getHours() : undefined,
    // An UNSETLD+ Plan's day earns no more than the same day without it (core/missions capForPlan).
    program: prog && ids.length ? { id: prog.id, missionIds: ids, membersOnly: !planOpenToAll(prog) } : null,
    // What the last four weeks say: swapped and ignored missions, preferred length, consistent areas.
    adapt: learnFrom(s.plans, s.record.missions, MISSION_BY_ID, day),
  };
}

function buildPlan(s: Pick<State, 'profile' | 'installSalt' | 'record' | 'plans' | 'skips' | 'program'>, day: DayKey): DayPlan {
  return generatePlan(planInput(s, day));
}

type PlanState = Pick<State, 'profile' | 'installSalt' | 'record' | 'plans' | 'skips' | 'program'>;

/**
 * A kept day whose plan holds retired missions (saved before 3.3): each one's slot gets another
 * approved mission from its area, the way the swap button picks one, without using up a swap. The
 * day keeps its size, so one mission of the user's own isn't the whole day (and a free perfect day).
 */
function refilled(s: PlanState, day: DayKey, have: DayPlan): DayPlan {
  const input = planInput(s, day);
  let plan = withAreas(have, s.profile);
  for (let i = 0; i < plan.missions.length; i++) {
    if (MISSION_BY_ID[plan.missions[i].missionId]) continue;
    const next = rerollCore(plan, i, input);
    if (next) plan = { ...next, rerolls: plan.rerolls, replaced: plan.replaced };
  }
  return { ...plan, missions: plan.missions.filter(p => MISSION_BY_ID[p.missionId]) };
}

/**
 * The most a swap's mission may earn: nothing past the usual for the day's first swap (the one
 * everyone has); for every swap after it, what the mission it replaces was worth. So UNSETLD+'s
 * extra swaps never raise what a day can earn: a free day and a member's day have the same
 * ceiling. A mission of an UNSETLD+ Plan capped to keep the day's points (core/missions
 * capForPlan) keeps its cap through every swap, the first too. undefined = no cap. Proof credits
 * the planned value (core/complete).
 */
export function swapCap(plan: DayPlan, index: number, freeSwaps: number = RULES.rerolls.free): number | undefined {
  const old = plan.missions[index];
  if (!old) return undefined;
  if (plan.rerolls < freeSwaps && !(old.programId && typeof old.points === 'number')) return undefined;
  return typeof old.points === 'number' ? old.points : MISSION_BY_ID[old.missionId]?.points;
}

/**
 * "RECOMMENDED FOR YOU" for the mission at `index` of `plan` (core/missions replacementChoices),
 * each showing what it would earn here (swapCap), as its card on Today will.
 */
function choicesFor(s: PlanState, day: DayKey, plan: DayPlan, index: number, reason: SwapReason, count = 3): SlotPick[] {
  const picks = replacementChoices(plan, index, planInput(s, day), reason, count);
  const cap = swapCap(plan, index);
  return cap === undefined ? picks : picks.map(p => ({ ...p, mission: asPlanned(p.mission, { points: cap }) }));
}

/** The replacements the swap sheet offers for today's mission at `index`, for the reason picked. */
export function replacementsFor(index: number, reason: SwapReason, count = 3): SlotPick[] {
  const s = useApp.getState();
  const d = today();
  const plan = s.plans[d];
  if (!plan) return [];
  return choicesFor(s, d, plan, index, reason, count);
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
 * 4:00 AM: a timer or a before photo from a day before `day` can't count any more (that day's
 * plan is closed). They go, with the timer's notification and the photo; null when there were none.
 */
function endedEarlier(s: Pick<State, 'timer' | 'pendingBefore'>, day: DayKey): Pick<State, 'timer' | 'pendingBefore'> | null {
  const timer = s.timer && s.timer.day < day ? null : s.timer;
  const pendingBefore = s.pendingBefore && s.pendingBefore.day < day ? null : s.pendingBefore;
  if (timer === s.timer && pendingBefore === s.pendingBefore) return null;
  if (s.timer && !timer) void cancelTimerDone();
  if (s.pendingBefore && !pendingBefore) deletePhoto(s.pendingBefore.photo.uri);
  return { timer, pendingBefore };
}

/**
 * Release builds: tester state saved by a dev build on this phone goes as it loads. Time travel
 * comes back to the real date (the real record and plans kept aside, as Back to real today
 * brings them), timers run at normal speed, and a timer or before photo from a travelled day
 * after the real one goes with its notification and photo.
 */
export function withoutTesterState(p: Partial<State>): Partial<State> {
  const out: Partial<State> = { ...p, dayOffset: 0, devSnapshot: null, devPlans: null };
  if (p.devSnapshot) out.record = fromBackup(p.devSnapshot);
  if (p.devSnapshot && p.devPlans) out.plans = p.devPlans;
  if (p.settings && p.settings.timerSpeed !== 1) out.settings = { ...p.settings, timerSpeed: 1 };
  const real = dayKeyOf(new Date());
  const ahead = (x: Started) => Boolean(p.dayOffset && x && x.day > real);
  // A timer from a travelled day goes, and so does one running at tester speed on a real day:
  // at 60x it would count as done after a real minute (and its "done" alert is queued early).
  const timer = ahead(p.timer) || Boolean(p.timer && (p.timer.speed ?? 1) !== 1);
  const before = ahead(p.pendingBefore) ? p.pendingBefore : null;
  if (timer) out.timer = null;
  if (before) out.pendingBefore = null;
  // Afterwards: with synchronous storage this runs while the store is still being created.
  if (timer || before) {
    Promise.resolve().then(() => {
      if (timer) void cancelTimerDone();
      if (before) deletePhoto(before.photo.uri);
    });
  }
  return out;
}

/** The first build's saved state (git 96f8ec8), never read since. */
const LEGACY_STATE_KEY = 'unsetld-state-v1';

function removeLegacyState() {
  try {
    void Promise.resolve(appStorage.removeItem(LEGACY_STATE_KEY)).catch(() => {});
  } catch {
    // Nothing there.
  }
}

/**
 * A saved timer or before photo for a mission that isn't approved or the user's own (3.0 preview
 * builds had other missions, and 3.3 retired every mission outside the approved library) can't
 * be shown or proven: it goes on load, with its notification and its photo. A retired mission
 * already proven stays on the record.
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

/** Goal areas that are gone, mapped onto today's: 3.0 preview builds' ids, and Business (folded into Projects in 3.3). */
const OLD_TRACK: Record<string, TrackId> = { focus: 'discipline', reset: 'organization', mindset: 'discipline', business: 'projects' };
const KNOWN_TRACK = new Set<string>(['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization']);
const toTrack = (t: string): TrackId | null => (KNOWN_TRACK.has(t) ? (t as TrackId) : OLD_TRACK[t] ?? null);

/**
 * The area stored on each proven mission, with gone area ids (3.0 preview builds', Business)
 * mapped onto today's. Used for the saved record, the tester snapshot and the Keychain backup;
 * a current record comes back unchanged.
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
  // A state saved by this build or a newer one loads as it is (a newer build only adds keys).
  if (version >= 8) return p;
  return toV8(version >= 7 ? p : toV7(version >= 6 ? p : toV6(version >= 5 ? p : toV5(version >= 4 ? p : toV4(p, version)))));
}

/** Each planned mission's area and each swap's, with gone area ids mapped onto today's. */
function migratePlanTracks(plans: Record<DayKey, DayPlan> | null | undefined): Record<DayKey, DayPlan> | null | undefined {
  if (!plans) return plans;
  const area = (t: TrackId | undefined) => (t ? (toTrack(t) ?? t) : t);
  return Object.fromEntries(
    Object.entries(plans).map(([d, plan]) => [
      d,
      plan && {
        ...plan,
        missions: Array.isArray(plan.missions) ? plan.missions.map(m => (m?.area ? { ...m, area: area(m.area) } : m)) : plan.missions,
        ...(Array.isArray(plan.swaps) ? { swaps: plan.swaps.map(w => (w?.area ? { ...w, area: area(w.area) } : w)) } : {}),
      },
    ]),
  );
}

/** What `toV8` adds to `momentsShown` for a Plan finished before yesterday: the "First plan" achievement's moment. */
const FIRST_PLAN_MOMENT = 'plan-1';

/**
 * 7 → 8 (3.3 launch pass). The settings, the one-time UI state, the profile, the weekly focus and
 * the remote config gain keys that need nothing here (merge fills each one's default: null or
 * absent, so the age gate asks once and nothing is shared). This fills the rest:
 * - the reminders offer on Today: 'done' for someone already onboarded (onboarding asked them before 3.3);
 * - the membership, saved whole, gets every field (trial end, end, product id) as null;
 * - a Plan already finished goes on the record (`plansFinished`), from the saved program's
 *   finish day (or its last day proven); finished before yesterday, its moment and the
 *   "First plan" achievement's are marked shown, so the update brings no surprise moment.
 * Only the real record: one kept aside by tester time travel comes back without it.
 */
function toV8(p: Partial<State>): Partial<State> {
  const out: Partial<State> = { ...p };
  const offered = p.reading?.remindersOffer;
  out.reading = { ...p.reading, remindersOffer: offered !== undefined ? offered : p.settings?.onboarded ? 'done' : null } as Reading;
  out.premium = { ...EMPTY_PREMIUM, ...p.premium };
  const program = p.program;
  const finished = program && typeof program.id === 'string' ? finishOf(PROGRAM_BY_ID[program.id], program) : null;
  if (program && finished) {
    const record = recordPlanFinish({ ...emptyRecord(), ...p.record }, program.id, finished);
    out.record = record;
    const before = addDays(today(), -1);
    const first = record.plansFinished?.[0];
    const seen = [
      ...(finished < before ? [planMomentKey(program.id, finished)] : []),
      ...(first && first.finished < before ? [FIRST_PLAN_MOMENT] : []),
    ];
    const shown = Array.isArray(p.momentsShown) ? p.momentsShown : [];
    out.momentsShown = [...shown, ...seen.filter(k => !shown.includes(k))];
  }
  return out;
}

/**
 * 6 → 7 (3.3): Business folded into Projects. The areas picked (in order, once each, four at
 * most), the plans' areas and swaps (and the real plans kept aside during tester time travel),
 * the user's own missions, the record and its tester snapshot all say Projects now. The weekly
 * focus "Make progress on my business" keeps its id; it leans Projects.
 */
function toV7(p: Partial<State>): Partial<State> {
  const out: Partial<State> = { ...p };
  if (p.profile) {
    const tracks = [...new Set((p.profile.tracks ?? []).map(t => toTrack(t)).filter((t): t is TrackId => Boolean(t)))].slice(0, 4);
    const priority = p.profile.priority ? toTrack(p.profile.priority) : null;
    out.profile = { ...p.profile, tracks: tracks.length ? tracks : DEFAULT_PROFILE.tracks, priority };
  }
  if (p.plans) out.plans = migratePlanTracks(p.plans) as Record<DayKey, DayPlan>;
  if (p.devPlans) out.devPlans = migratePlanTracks(p.devPlans) ?? null;
  if (Array.isArray(p.customMissions)) out.customMissions = p.customMissions.map(m => (m?.track ? { ...m, track: toTrack(m.track) ?? m.track } : m));
  if (p.record) out.record = migrateRecordTracks(p.record);
  if (p.devSnapshot) out.devSnapshot = migrateRecordTracks(p.devSnapshot);
  return out;
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

let evicted: string[] = [];

/**
 * Browser preview: local storage holds about 5 MB, which photos kept a year (or for good) fill
 * in about two months. When the state or a new photo doesn't fit, the oldest day's photos go
 * and the record shows them as cleared, so proofs, points and the streak are still saved.
 * Today's photos and a before photo waiting for its after stay.
 */
function makeRoomForState(): boolean {
  const s = useApp.getState();
  // Never a file already given up in this save (should removing it have failed).
  const keep = new Set([...evicted, ...(s.pendingBefore ? [s.pendingBefore.photo.uri] : [])]);
  const free = oldestPhotos(webPhotoKeys(), keep, today());
  if (!free.length) return false;
  for (const uri of free) deletePhoto(uri);
  // Afterwards, once: this runs while the store is saving.
  if (!evicted.length) {
    Promise.resolve().then(() => {
      const gone = evicted.map(uri => ({ uri }));
      evicted = [];
      useApp.setState(st => ({ record: clearPhotos(st.record, gone), devSnapshot: st.devSnapshot && clearPhotos(st.devSnapshot, gone) }));
    });
  }
  evicted.push(...free);
  return true;
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  setRoomMaker(makeRoomForState);
  // The preview open in two tabs: a save in the other tab is read here, so this tab's next save
  // doesn't put back what it had. The event fires only in the other tabs, and reading doesn't save.
  window.addEventListener?.('storage', e => {
    if (e.key === useApp.persist.getOptions().name && e.newValue) void useApp.persist.rehydrate();
  });
}

let readFails = 0;
let onDefaults = false;

/**
 * The state came from defaults because storage couldn't be read (readFailed): what it holds isn't
 * known, so startup's sweep of proof files deletes nothing.
 */
export function loadedOnDefaults(): boolean {
  return onDefaults;
}

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
    else {
      onDefaults = true;
      markHydrated();
    }
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
  /** The colorways marked free in colorways.json, and the rest when colorways are open. */
  canUseColorway: (c: Pick<Colorway, 'free'>) => boolean;
  /** The plans marked free in programs.json (basic plans), and every plan when all plans are open. */
  canStartPlan: (p: Pick<Program, 'free'>) => boolean;
}

/**
 * The one gate for what's free and what UNSETLD+ adds: each answer comes from core/features
 * (FEATURES through hasFeature), so moving a feature there moves it here. `features` is for tests.
 */
export function entitlementsOf(s: Pick<State, 'settings' | 'premium'>, features: FeatureMap = FEATURES): Entitlements {
  const premium = s.premium.active;
  const has = (f: Feature) => hasFeature(f, premium, features);
  const canUseColorway = (c: Pick<Colorway, 'free'>) => c.free || has('colorways');
  const chosen = COLORWAY_BY_ID[s.settings.colorway] ?? COLORWAYS[0];
  return {
    premium,
    colorway: canUseColorway(chosen) ? chosen : COLORWAYS[0],
    maxReminders: has('extraReminders') ? FULL_MAX_REMINDERS : FREE_MAX_REMINDERS,
    maxSwaps: has('extraSwaps') ? RULES.rerolls.full : has('swaps') ? RULES.rerolls.free : 0,
    canUseColorway,
    canStartPlan: p => has('allPlans') || (p.free && has('basicPlans')),
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
