// The rank engine: streaks, streak shields, XP, rank decay and comebacks.
// Pure functions over a Progress object so they can be unit-tested and so the
// same rules run in the app and (later) on the Rank Sync server.

import { monthEnd } from './codes';
import { addDays, diffDays, isSunday, monthKey, weekStart, type DayKey } from './time';
import type { CodeClaim, DayRecord, Progress, RankConfig, RankDef } from './types';

export type RankEvent =
  | { type: 'xp'; amount: number; reason: XPReason; bonus: number }
  | { type: 'rankUp'; rank: number }
  | { type: 'rankDown'; rank: number }
  | { type: 'decay'; lost: number; days: number }
  | { type: 'comeback'; remaining: number }
  | { type: 'shields'; used: number }
  | { type: 'streakBroken'; was: number }
  | { type: 'milestone'; days: number; xp: number }
  | { type: 'fullWeek'; xp: number }
  | { type: 'needsCheckIn' }
  | { type: 'clockBackwards' };

export type XPReason = 'line' | 'nonNegotiable' | 'mission' | 'milestone' | 'fullWeek';

export interface Result {
  progress: Progress;
  events: RankEvent[];
}

const DAILY_ACTIONS: XPReason[] = ['line', 'nonNegotiable', 'mission'];

export function emptyProgress(installSalt: string): Progress {
  return {
    installSalt,
    lastOpenDay: null,
    streak: 0,
    bestStreak: 0,
    shieldsUsedByMonth: {},
    gap: null,
    lifetimeXP: 0,
    rankXP: 0,
    highestRank: 0,
    seenRank: 0,
    lastRankDrop: null,
    days: {},
    milestonesPaid: {},
    fullWeeksPaid: [],
    comeback: null,
    lastComebackStart: null,
    claims: [],
  };
}

/** Brings progress saved by an older build up to the current shape. */
export function migrateProgress(raw: unknown, salt: string): Progress {
  const base = emptyProgress(salt);
  if (!raw || typeof raw !== 'object') return base;
  const old = raw as Record<string, unknown> & Partial<Progress>;
  const p: Progress = { ...base, ...(old as Partial<Progress>) };
  if (!p.shieldsUsedByMonth || typeof p.shieldsUsedByMonth !== 'object') p.shieldsUsedByMonth = {};
  const legacyMonth = old.shieldsMonth as string | undefined;
  const legacyUsed = old.shieldsUsed as number | undefined;
  if (legacyMonth && legacyUsed) {
    p.shieldsUsedByMonth = { ...p.shieldsUsedByMonth, [legacyMonth]: Math.max(legacyUsed, p.shieldsUsedByMonth[legacyMonth] ?? 0) };
  }
  if (p.gap && !('usedByMonth' in p.gap)) p.gap = null;
  p.claims = (p.claims ?? []).map(c => ({ ...c, expires: c.expires ?? monthEnd(c.day) }));
  delete (p as unknown as Record<string, unknown>).shieldsMonth;
  delete (p as unknown as Record<string, unknown>).shieldsUsed;
  delete (p as unknown as Record<string, unknown>).customLineWeek;
  return p;
}

export function rankIndex(cfg: RankConfig, xp: number): number {
  let idx = 0;
  cfg.ranks.forEach((r, i) => {
    if (xp >= r.xp) idx = i;
  });
  return idx;
}

export function rankOf(cfg: RankConfig, xp: number): RankDef {
  return cfg.ranks[rankIndex(cfg, xp)];
}

/** Progress toward the next rank, 0..1, plus XP still needed. */
export function rankProgress(cfg: RankConfig, xp: number) {
  const i = rankIndex(cfg, xp);
  const cur = cfg.ranks[i];
  const next = cfg.ranks[i + 1];
  if (!next) return { fraction: 1, toNext: 0, next: null as RankDef | null };
  const fraction = (xp - cur.xp) / (next.xp - cur.xp);
  return { fraction: Math.max(0, Math.min(1, fraction)), toNext: next.xp - xp, next };
}

export function shieldsLeft(p: Progress, cfg: RankConfig, day: DayKey): number {
  return Math.max(0, cfg.shieldsPerMonth - (p.shieldsUsedByMonth[monthKey(day)] ?? 0));
}

function clone(p: Progress): Progress {
  return {
    ...p,
    days: { ...p.days },
    milestonesPaid: { ...p.milestonesPaid },
    fullWeeksPaid: [...p.fullWeeksPaid],
    claims: [...p.claims],
    shieldsUsedByMonth: { ...p.shieldsUsedByMonth },
    gap: p.gap ? { ...p.gap, usedByMonth: { ...p.gap.usedByMonth } } : null,
    comeback: p.comeback ? { ...p.comeback } : null,
  };
}

function dayRec(p: Progress, day: DayKey): DayRecord {
  const rec = p.days[day] ? { ...p.days[day] } : { xp: 0 };
  p.days[day] = rec;
  return rec;
}

function award(
  p: Progress,
  cfg: RankConfig,
  day: DayKey,
  amount: number,
  reason: XPReason,
  events: RankEvent[],
) {
  let bonus = 0;
  if (p.comeback && p.comeback.remaining > 0 && DAILY_ACTIONS.includes(reason)) {
    bonus = Math.min(amount, p.comeback.remaining);
    const remaining = p.comeback.remaining - bonus;
    p.comeback = remaining > 0 ? { ...p.comeback, remaining } : null;
  }
  const total = amount + bonus;
  const before = rankIndex(cfg, p.rankXP);
  p.lifetimeXP += total;
  p.rankXP += total;
  dayRec(p, day).xp += total;
  events.push({ type: 'xp', amount: total, reason, bonus });
  const after = rankIndex(cfg, p.rankXP);
  if (after > before) events.push({ type: 'rankUp', rank: after });
  if (after > p.highestRank) p.highestRank = after;
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

/**
 * Applies missed days since the last check-in: streak shields first (each
 * missed day uses a shield from its own month), then a grace period, then rank
 * decay. Safe to call repeatedly: it recomputes the whole gap each time.
 */
export function reconcile(input: Progress, cfg: RankConfig, today: DayKey): Result {
  const events: RankEvent[] = [];
  if (!input.lastOpenDay || input.lastOpenDay === today) return { progress: input, events };
  const missed = diffDays(input.lastOpenDay, today) - 1;
  if (missed <= 0) return { progress: input, events };

  const p = clone(input);
  const gap = p.gap ?? { usedByMonth: {}, decayDays: 0, broken: false };

  // Shield use by everything except this gap, so the allocation below is idempotent.
  const base: Record<string, number> = { ...p.shieldsUsedByMonth };
  for (const [m, n] of Object.entries(gap.usedByMonth)) base[m] = Math.max(0, (base[m] ?? 0) - n);
  const alloc: Record<string, number> = {};
  let covered = 0;
  for (let i = 1; i <= missed; i++) {
    const m = monthKey(addDays(input.lastOpenDay, i));
    if ((base[m] ?? 0) + (alloc[m] ?? 0) < cfg.shieldsPerMonth) {
      alloc[m] = (alloc[m] ?? 0) + 1;
      covered++;
    }
  }
  const newlyCovered = covered - sum(gap.usedByMonth);
  if (newlyCovered > 0) events.push({ type: 'shields', used: newlyCovered });
  const usedByMonth: Record<string, number> = { ...base };
  for (const [m, n] of Object.entries(alloc)) usedByMonth[m] = (usedByMonth[m] ?? 0) + n;
  p.shieldsUsedByMonth = usedByMonth;

  const uncovered = missed - covered;
  const broken = uncovered > 0;
  if (broken && !gap.broken && p.streak > 0) events.push({ type: 'streakBroken', was: p.streak });

  const decayTotal = Math.max(0, uncovered - cfg.graceDays);
  const newDecayDays = decayTotal - gap.decayDays;
  if (newDecayDays > 0 && p.rankXP > 0) {
    const before = p.rankXP;
    const curRank = rankIndex(cfg, before);
    let after = before * Math.pow(1 - cfg.decayPerDay, newDecayDays);
    const recentlyDropped =
      p.lastRankDrop !== null && diffDays(p.lastRankDrop, today) < cfg.rankDropFloorDays;
    const minRank = recentlyDropped ? curRank : Math.max(0, curRank - 1);
    if (rankIndex(cfg, after) < minRank) after = cfg.ranks[minRank].xp;
    after = Math.floor(after);
    const lost = before - after;
    p.rankXP = after;
    if (lost > 0) {
      events.push({ type: 'decay', lost, days: newDecayDays });
      const canStartComeback =
        !p.lastComebackStart || diffDays(p.lastComebackStart, today) >= cfg.comebackCooldownDays;
      if (p.comeback) {
        p.comeback = { ...p.comeback, remaining: p.comeback.remaining + lost };
        events.push({ type: 'comeback', remaining: p.comeback.remaining });
      } else if (canStartComeback) {
        p.comeback = { remaining: lost, startedOn: today };
        p.lastComebackStart = today;
        events.push({ type: 'comeback', remaining: lost });
      }
    }
    const afterRank = rankIndex(cfg, after);
    if (afterRank < curRank) {
      p.lastRankDrop = today;
      events.push({ type: 'rankDown', rank: afterRank });
    }
  }

  p.gap = { usedByMonth: alloc, decayDays: Math.max(gap.decayDays, decayTotal), broken };
  return { progress: p, events };
}

export interface CheckInOptions {
  /** False when the day couldn't be confirmed against server time. */
  verified?: boolean;
}

/** Opening today's line: the daily check-in that drives the streak. */
export function checkIn(
  input: Progress,
  cfg: RankConfig,
  today: DayKey,
  opts: CheckInOptions = {},
): Result {
  if (input.lastOpenDay && diffDays(input.lastOpenDay, today) < 0) {
    return { progress: input, events: [{ type: 'clockBackwards' }] };
  }
  const r = reconcile(input, cfg, today);
  if (r.progress.days[today]?.line) return r;
  const p = r.progress === input ? clone(input) : r.progress;
  const events = r.events;

  const continues = p.lastOpenDay !== null && !(p.gap?.broken ?? false);
  p.streak = continues ? p.streak + 1 : 1;
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  p.lastOpenDay = today;
  p.gap = null;

  const rec = dayRec(p, today);
  rec.line = true;
  if (opts.verified === false) rec.unverified = true;
  award(p, cfg, today, cfg.xp.line, 'line', events);

  const milestoneXP = cfg.xp.milestones[String(p.streak)];
  if (milestoneXP) {
    const paid = p.milestonesPaid[String(p.streak)];
    if (!paid || diffDays(paid, today) >= 365) {
      p.milestonesPaid[String(p.streak)] = today;
      award(p, cfg, today, milestoneXP, 'milestone', events);
      events.push({ type: 'milestone', days: p.streak, xp: milestoneXP });
    }
  }
  maybeFullWeek(p, cfg, today, events);
  prune(p, today);
  return { progress: p, events };
}

/** Daily actions only count after today's check-in, so a changed phone date can't farm them. */
function checkedInToday(p: Progress, today: DayKey) {
  return p.lastOpenDay === today && Boolean(p.days[today]?.line);
}

export function setNonNegotiable(input: Progress, cfg: RankConfig, today: DayKey, text: string): Result {
  if (!checkedInToday(input, today)) return { progress: input, events: [{ type: 'needsCheckIn' }] };
  const p = clone(input);
  const events: RankEvent[] = [];
  const rec = dayRec(p, today);
  const first = !rec.nonNegotiable;
  rec.nonNegotiable = text.trim();
  if (first && rec.nonNegotiable) {
    award(p, cfg, today, cfg.xp.nonNegotiable, 'nonNegotiable', events);
    maybeFullWeek(p, cfg, today, events);
  }
  return { progress: p, events };
}

export function completeMission(input: Progress, cfg: RankConfig, today: DayKey, missionId: string): Result {
  if (!checkedInToday(input, today)) return { progress: input, events: [{ type: 'needsCheckIn' }] };
  if (input.days[today]?.mission) return { progress: input, events: [] };
  const p = clone(input);
  const events: RankEvent[] = [];
  dayRec(p, today).mission = missionId;
  award(p, cfg, today, cfg.xp.mission, 'mission', events);
  return { progress: p, events };
}

function maybeFullWeek(p: Progress, cfg: RankConfig, today: DayKey, events: RankEvent[]) {
  if (!isSunday(today)) return;
  const ws = weekStart(today);
  if (p.fullWeeksPaid.includes(ws)) return;
  for (let i = 0; i < 7; i++) {
    const d = p.days[addDays(ws, i)];
    if (!d?.line || !d?.nonNegotiable) return;
  }
  p.fullWeeksPaid.push(ws);
  award(p, cfg, today, cfg.xp.fullWeek, 'fullWeek', events);
  events.push({ type: 'fullWeek', xp: cfg.xp.fullWeek });
}

function prune(p: Progress, today: DayKey) {
  for (const k of Object.keys(p.days)) {
    if (diffDays(k, today) > 120) delete p.days[k];
  }
  p.fullWeeksPaid = p.fullWeeksPaid.filter(w => diffDays(w, today) <= 400);
  const oldest = monthKey(addDays(today, -62));
  for (const m of Object.keys(p.shieldsUsedByMonth)) {
    if (m < oldest) delete p.shieldsUsedByMonth[m];
  }
}

/**
 * Verified check-ins in the current streak. Walks back past shield-covered
 * days (which have no record) until the streak's check-ins are counted.
 */
export function verifiedStreakDays(p: Progress, today: DayKey): number {
  let seen = 0;
  let verified = 0;
  for (let i = 0; seen < p.streak && i < p.streak + 70; i++) {
    const d = p.days[addDays(today, -i)];
    if (d?.line) {
      seen++;
      if (!d.unverified) verified++;
    }
  }
  return verified;
}

/** The last code, if it can still be used. */
export function activeClaim(p: Progress, today: DayKey): CodeClaim | null {
  const last = p.claims[p.claims.length - 1];
  return last && diffDays(today, last.expires) >= 0 ? last : null;
}

export type ClaimStatus =
  | { ok: true; percent: number; tier: RankDef }
  | { ok: false; reason: string; percent: number; nextDay?: DayKey };

/**
 * Whether a discount code can be claimed right now. In v1 (no Rank Sync)
 * only tiers that don't need server verification are available.
 */
export function claimStatus(
  p: Progress,
  cfg: RankConfig,
  today: DayKey,
  opts: { rankSync?: boolean; skipVerification?: boolean } = {},
): ClaimStatus {
  const ri = rankIndex(cfg, p.rankXP);
  let tier: RankDef | null = null;
  for (let i = ri; i >= 0; i--) {
    const r = cfg.ranks[i];
    if (r.discountPercent > 0 && (!r.needsRankSync || opts.rankSync)) {
      tier = r;
      break;
    }
  }
  if (!tier) {
    const first = cfg.ranks.find(r => r.discountPercent > 0);
    return { ok: false, reason: `Reach ${first?.name ?? 'a higher rank'} to unlock codes.`, percent: 0 };
  }
  if (p.streak < cfg.claims.minStreak || p.lastOpenDay !== today) {
    return {
      ok: false,
      reason: `Codes need a live ${cfg.claims.minStreak}-day streak. You're on ${p.lastOpenDay === today ? p.streak : 0}.`,
      percent: tier.discountPercent,
    };
  }
  if (!opts.skipVerification && verifiedStreakDays(p, today) < cfg.claims.minStreak) {
    return {
      ok: false,
      reason: 'Open the app online for a few more days so your streak can be verified.',
      percent: tier.discountPercent,
    };
  }
  const yearClaims = p.claims.filter(c => diffDays(c.day, today) < 365);
  if (yearClaims.length >= cfg.claims.maxPerYear) {
    return { ok: false, reason: 'Yearly code limit reached. Your other perks still apply.', percent: tier.discountPercent };
  }
  // The cooldown belongs to the tier actually being claimed.
  const last = p.claims[p.claims.length - 1];
  if (last && diffDays(last.day, today) < tier.cooldownDays) {
    return {
      ok: false,
      reason: 'Your next code unlocks after the cooldown.',
      percent: tier.discountPercent,
      nextDay: addDays(last.day, tier.cooldownDays),
    };
  }
  return { ok: true, percent: tier.discountPercent, tier };
}

export function recordClaim(input: Progress, claim: CodeClaim): Progress {
  return { ...input, claims: [...input.claims, claim] };
}

/**
 * Start over at the lowest rank. Claim history, paid milestones and comeback
 * timing are kept so a reset can't be used to dodge code cooldowns.
 */
export function resetKeepingHistory(p: Progress, newSalt: string): Progress {
  return {
    ...emptyProgress(newSalt),
    claims: p.claims,
    milestonesPaid: p.milestonesPaid,
    lastComebackStart: p.lastComebackStart,
  };
}
