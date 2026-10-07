// The rank engine: streaks, streak shields, XP, rank decay and comebacks.
// Pure functions over a Progress object so they can be unit-tested and so the
// same rules run in the app and (later) on the Rank Sync server.

import { addDays, diffDays, isSunday, monthKey, weekStart, type DayKey } from './time';
import type { CodeClaim, DayRecord, Progress, RankConfig, RankDef } from './types';

export type RankEvent =
  | { type: 'xp'; amount: number; reason: XPReason; bonus: number }
  | { type: 'rankUp'; rank: number }
  | { type: 'rankDown'; rank: number }
  | { type: 'decay'; lost: number; days: number }
  | { type: 'shields'; used: number }
  | { type: 'streakBroken'; was: number }
  | { type: 'milestone'; days: number; xp: number }
  | { type: 'fullWeek'; xp: number }
  | { type: 'clockBackwards' };

export type XPReason = 'line' | 'nonNegotiable' | 'mission' | 'milestone' | 'fullWeek' | 'customLine';

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
    shieldsMonth: null,
    shieldsUsed: 0,
    gap: null,
    lifetimeXP: 0,
    rankXP: 0,
    highestRank: 0,
    seenRank: 0,
    lastRankDrop: null,
    days: {},
    milestonesPaid: {},
    fullWeeksPaid: [],
    customLineWeek: null,
    comeback: null,
    lastComebackStart: null,
    claims: [],
  };
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

function clone(p: Progress): Progress {
  return {
    ...p,
    days: { ...p.days },
    milestonesPaid: { ...p.milestonesPaid },
    fullWeeksPaid: [...p.fullWeeksPaid],
    claims: [...p.claims],
    gap: p.gap ? { ...p.gap } : null,
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

/**
 * Applies missed days since the last check-in: streak shields first, then a
 * grace period, then rank decay. Safe to call repeatedly on the same day.
 */
export function reconcile(input: Progress, cfg: RankConfig, today: DayKey): Result {
  const events: RankEvent[] = [];
  if (!input.lastOpenDay || input.lastOpenDay === today) return { progress: input, events };
  const missed = diffDays(input.lastOpenDay, today) - 1;
  if (missed <= 0) return { progress: input, events };

  const p = clone(input);
  const month = monthKey(today);
  let shieldsUsed = p.shieldsMonth === month ? p.shieldsUsed : 0;
  const gap = p.gap ?? { covered: 0, decayDays: 0, broken: false };

  const available = Math.max(0, cfg.shieldsPerMonth - shieldsUsed);
  const covered = Math.min(missed, gap.covered + available);
  const newlyCovered = covered - gap.covered;
  shieldsUsed += newlyCovered;
  if (newlyCovered > 0) events.push({ type: 'shields', used: newlyCovered });

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
      } else if (canStartComeback) {
        p.comeback = { remaining: lost, startedOn: today };
        p.lastComebackStart = today;
      }
    }
    const afterRank = rankIndex(cfg, after);
    if (afterRank < curRank) {
      p.lastRankDrop = today;
      events.push({ type: 'rankDown', rank: afterRank });
    }
  }

  p.gap = { covered, decayDays: Math.max(gap.decayDays, decayTotal), broken };
  p.shieldsUsed = shieldsUsed;
  p.shieldsMonth = month;
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
  if (p.shieldsMonth !== monthKey(today)) {
    p.shieldsMonth = monthKey(today);
    p.shieldsUsed = 0;
  }

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

export function setNonNegotiable(input: Progress, cfg: RankConfig, today: DayKey, text: string): Result {
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
  if (input.days[today]?.mission) return { progress: input, events: [] };
  const p = clone(input);
  const events: RankEvent[] = [];
  dayRec(p, today).mission = missionId;
  award(p, cfg, today, cfg.xp.mission, 'mission', events);
  return { progress: p, events };
}

export function customLineWritten(input: Progress, cfg: RankConfig, today: DayKey): Result {
  const week = weekStart(today);
  if (input.customLineWeek === week) return { progress: input, events: [] };
  const p = clone(input);
  const events: RankEvent[] = [];
  p.customLineWeek = week;
  award(p, cfg, today, cfg.xp.customLine, 'customLine', events);
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
}

/** Days in the current streak that were verified against server time. */
export function verifiedStreakDays(p: Progress, today: DayKey): number {
  let n = 0;
  for (let i = 0; i < p.streak; i++) {
    const d = p.days[addDays(today, -i)];
    if (d?.line && !d.unverified) n++;
  }
  return n;
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
  const current = cfg.ranks[ri];
  const cooldown = current.cooldownDays || tier.cooldownDays;
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
      reason: 'Connect to the internet for a few days so we can verify your streak.',
      percent: tier.discountPercent,
    };
  }
  const yearClaims = p.claims.filter(c => diffDays(c.day, today) < 365);
  if (yearClaims.length >= cfg.claims.maxPerYear) {
    return { ok: false, reason: 'You hit the yearly code limit. Perks still apply.', percent: tier.discountPercent };
  }
  const last = p.claims[p.claims.length - 1];
  if (last && diffDays(last.day, today) < cooldown) {
    return {
      ok: false,
      reason: 'Next code unlocks after your cooldown.',
      percent: tier.discountPercent,
      nextDay: addDays(last.day, cooldown),
    };
  }
  return { ok: true, percent: tier.discountPercent, tier };
}

export function recordClaim(input: Progress, claim: CodeClaim): Progress {
  return { ...input, claims: [...input.claims, claim] };
}
