import { describe, expect, it } from 'vitest';
import rankJson from '../../content/rank.json';
import { monthEnd, monthlyCode } from '../codes';
import { buildPool, dailyLine, feedFor } from '../lines';
import { perMonth, savingsPercent } from '../pricing';
import {
  checkIn,
  claimStatus,
  completeMission,
  activeClaim,
  emptyProgress,
  migrateProgress,
  rankIndex,
  reconcile,
  recordClaim,
  resetKeepingHistory,
  setNonNegotiable,
  shieldsLeft,
  verifiedStreakDays,
} from '../rank';
import { MAX_PENDING, planReminders } from '../reminders';
import { seededShuffle, shortCode } from '../random';
import { addDays, diffDays, weekStart } from '../time';
import type { Line, Progress, RankConfig } from '../types';

const cfg = rankJson as RankConfig;

const lines: Line[] = Array.from({ length: 30 }, (_, i) => ({
  id: `l${String(i).padStart(2, '0')}`,
  lane: i % 2 ? 'show-up' : 'gym-rat',
  text: `line ${i}`,
  tone: i % 3 === 0 ? 'unfiltered' : 'clean',
}));

/** Opens the app every day for `n` days starting at `start`. */
function grind(p: Progress, start: string, n: number, extras = false): Progress {
  let cur = p;
  for (let i = 0; i < n; i++) {
    const day = addDays(start, i);
    cur = checkIn(cur, cfg, day).progress;
    if (extras) {
      cur = setNonNegotiable(cur, cfg, day, 'train').progress;
      cur = completeMission(cur, cfg, day, 'm1').progress;
    }
  }
  return cur;
}

describe('time', () => {
  it('counts days across DST and months', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday -> Monday
  });
});

describe('lines', () => {
  it('filters by lane and tone', () => {
    const clean = buildPool(lines, { lanes: ['show-up'], tone: 'clean' });
    expect(clean.every(l => l.lane === 'show-up' && l.tone === 'clean')).toBe(true);
    const raw = buildPool(lines, { lanes: ['show-up'], tone: 'unfiltered' });
    expect(raw.length).toBeGreaterThan(clean.length);
    const forced = buildPool(lines, { lanes: ['show-up'], tone: 'unfiltered', cleanOnly: true });
    expect(forced).toEqual(clean);
  });

  it('does not repeat a line until the pool is exhausted', () => {
    const pool = buildPool(lines, { lanes: ['show-up', 'gym-rat'], tone: 'unfiltered' });
    const n = pool.length;
    // Start at a cycle boundary so one full cycle is covered.
    const base = addDays('2024-01-01', n * 10);
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) seen.add(dailyLine(pool, 'salt', addDays(base, i))!.id);
    expect(seen.size).toBe(n);
  });

  it('is stable for the same day and salt, and puts today first in the feed', () => {
    const pool = buildPool(lines, { lanes: ['show-up', 'gym-rat'], tone: 'clean' });
    const a = dailyLine(pool, 's', '2026-10-07');
    expect(dailyLine(pool, 's', '2026-10-07')).toEqual(a);
    const feed = feedFor(pool, 's', '2026-10-07', 10);
    expect(feed[0]).toEqual(a);
    expect(new Set(feed.map(l => l.id)).size).toBe(feed.length);
  });

  it('includes custom lines', () => {
    const pool = buildPool(lines, {
      lanes: ['show-up'],
      tone: 'clean',
      custom: [{ id: 'c1', text: 'mine', createdAt: 0 }],
    });
    expect(pool.some(l => l.id === 'c1' && l.lane === 'custom')).toBe(true);
  });

  it('shuffles deterministically', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 'x')).toEqual(seededShuffle([1, 2, 3, 4, 5], 'x'));
  });
});

describe('streak + XP', () => {
  it('awards 10 XP once per day and builds a streak', () => {
    let p = emptyProgress('s');
    p = checkIn(p, cfg, '2026-10-01').progress;
    const again = checkIn(p, cfg, '2026-10-01');
    expect(again.events).toHaveLength(0);
    p = checkIn(p, cfg, '2026-10-02').progress;
    expect(p.streak).toBe(2);
    expect(p.lifetimeXP).toBe(20);
  });

  it('pays the 7-day milestone once and reaches HUNGRY in about a week', () => {
    const p = grind(emptyProgress('s'), '2026-09-28', 7, true); // Mon..Sun
    expect(p.streak).toBe(7);
    expect(p.milestonesPaid['7']).toBe('2026-10-04');
    // 7 * 35 daily + 50 milestone + 30 full week
    expect(p.lifetimeXP).toBe(7 * 35 + 50 + 30);
    expect(rankIndex(cfg, p.rankXP)).toBe(1); // HUNGRY at 300
  });

  it('reaches DIALED IN in about a month of daily work', () => {
    const p = grind(emptyProgress('s'), '2026-09-28', 30, true);
    expect(rankIndex(cfg, p.rankXP)).toBe(2);
  });

  it('uses shields for missed days and keeps the streak', () => {
    let p = grind(emptyProgress('s'), '2026-10-01', 5);
    const r = checkIn(p, cfg, '2026-10-08'); // missed 6th and 7th
    p = r.progress;
    expect(r.events.some(e => e.type === 'shields' && e.used === 2)).toBe(true);
    expect(p.streak).toBe(6);
    expect(p.shieldsUsedByMonth['2026-10']).toBe(2);
    expect(shieldsLeft(p, cfg, '2026-10-08')).toBe(0);
  });

  it('breaks the streak once shields run out, with no decay inside grace', () => {
    let p = grind(emptyProgress('s'), '2026-10-01', 5);
    p.shieldsUsedByMonth = { '2026-10': 2 };
    const xpBefore = p.rankXP;
    const r = checkIn(p, cfg, '2026-10-08'); // 2 uncovered days = grace
    expect(r.progress.streak).toBe(1);
    expect(r.events.some(e => e.type === 'streakBroken')).toBe(true);
    expect(r.events.some(e => e.type === 'decay')).toBe(false);
    expect(r.progress.rankXP).toBe(xpBefore + 10);
  });

  it('decays 2% per day after grace and starts a comeback', () => {
    let p = emptyProgress('s');
    p = { ...p, rankXP: 8000, lifetimeXP: 9000, lastOpenDay: '2026-10-01', streak: 40, shieldsUsedByMonth: { '2026-10': 2 } };
    // Away 10 days (missed 2..11), back on the 12th: 10 missed, 0 shields, 2 grace, 8 decay days.
    const r = reconcile(p, cfg, '2026-10-12');
    const expected = Math.floor(8000 * Math.pow(0.98, 8));
    expect(r.progress.rankXP).toBe(expected);
    expect(r.progress.comeback?.remaining).toBe(8000 - expected);
    expect(r.events.some(e => e.type === 'rankDown')).toBe(true);
    expect(r.progress.lifetimeXP).toBe(9000);
    // Reconciling again the same day changes nothing.
    const again = reconcile(r.progress, cfg, '2026-10-12');
    expect(again.progress.rankXP).toBe(expected);
    // Comeback doubles daily XP.
    const c = checkIn(r.progress, cfg, '2026-10-12');
    expect(c.progress.rankXP).toBe(expected + 20);
  });

  it('drops at most one rank per 30 days', () => {
    let p = emptyProgress('s');
    p = { ...p, rankXP: 8000, lastOpenDay: '2026-01-01', shieldsUsedByMonth: { '2026-01': 2 } };
    const r = reconcile(p, cfg, '2026-04-01'); // ~3 months away
    expect(rankIndex(cfg, r.progress.rankXP)).toBe(3); // RELENTLESS floor
    expect(r.progress.rankXP).toBe(3500);
  });

  it('applies decay incrementally across days without double counting', () => {
    let p = emptyProgress('s');
    p = { ...p, rankXP: 2000, lastOpenDay: '2026-10-01', shieldsUsedByMonth: { '2026-10': 2 } };
    const day6 = reconcile(p, cfg, '2026-10-06').progress; // 4 missed: 2 grace + 2 decay
    const day8 = reconcile(day6, cfg, '2026-10-08').progress; // 6 missed: 4 decay total
    const direct = reconcile(p, cfg, '2026-10-08').progress;
    expect(Math.abs(day8.rankXP - direct.rankXP)).toBeLessThanOrEqual(1);
  });

  it('ignores a clock that moved backwards', () => {
    const p = grind(emptyProgress('s'), '2026-10-01', 3);
    const r = checkIn(p, cfg, '2026-09-20');
    expect(r.events[0].type).toBe('clockBackwards');
    expect(r.progress).toBe(p);
  });

  it("charges a missed day to the shields of that day's month", () => {
    // October shields unused; miss Oct 31, come back Nov 1.
    let p = grind(emptyProgress('s'), '2026-10-20', 11); // Oct 20..30
    p = checkIn(p, cfg, '2026-11-01').progress;
    expect(p.shieldsUsedByMonth['2026-10']).toBe(1);
    expect(shieldsLeft(p, cfg, '2026-11-01')).toBe(2);
    expect(p.streak).toBe(12);
    // October shields already spent: Oct 31 is uncovered, the streak resets.
    let q = grind(emptyProgress('s'), '2026-10-20', 11);
    q.shieldsUsedByMonth = { '2026-10': 2 };
    q = checkIn(q, cfg, '2026-11-01').progress;
    expect(q.streak).toBe(1);
    expect(q.shieldsUsedByMonth['2026-11'] ?? 0).toBe(0);
  });

  it('only pays non-negotiable and mission XP after today\'s check-in', () => {
    let p = grind(emptyProgress('s'), '2026-10-01', 3);
    const xp = p.lifetimeXP;
    const r1 = setNonNegotiable(p, cfg, '2026-10-09', 'Train'); // phone date moved ahead
    expect(r1.events[0].type).toBe('needsCheckIn');
    const r2 = completeMission(p, cfg, '2026-10-09', 'm');
    expect(r2.progress.lifetimeXP).toBe(xp);
    p = setNonNegotiable(p, cfg, '2026-10-03', 'Train').progress;
    expect(p.lifetimeXP).toBe(xp + 10);
  });

  it('counts verified days across shield-covered gaps', () => {
    let p = grind(emptyProgress('s'), '2026-10-01', 5); // Oct 1-5
    p = checkIn(p, cfg, '2026-10-08').progress; // Oct 6-7 shielded
    p = checkIn(p, cfg, '2026-10-09').progress;
    expect(p.streak).toBe(7);
    expect(verifiedStreakDays(p, '2026-10-09')).toBe(7);
  });

  it('keeps claim history through a reset', () => {
    let p = grind(emptyProgress('s'), '2026-09-01', 35, true);
    p = recordClaim(p, { day: '2026-10-05', code: 'X', percent: 10, rank: 2, expires: '2026-11-14' });
    const reset = resetKeepingHistory(p, 'new');
    expect(reset.rankXP).toBe(0);
    expect(reset.claims).toHaveLength(1);
  });

  it('migrates progress saved by the first build', () => {
    const old = { ...emptyProgress('s'), shieldsMonth: '2026-10', shieldsUsed: 1, customLineWeek: '2026-10-05', claims: [{ day: '2026-10-05', code: 'X', percent: 10, rank: 2 }] };
    const m = migrateProgress(old, 's');
    expect(m.shieldsUsedByMonth).toEqual({ '2026-10': 1 });
    expect(m.claims[0].expires).toBe('2026-10-31');
    expect('shieldsMonth' in m).toBe(false);
  });
});

describe('codes and claims', () => {
  it('needs DIALED IN and a live 7-day streak', () => {
    let p = grind(emptyProgress('s'), '2026-09-28', 6, true);
    expect(claimStatus(p, cfg, '2026-10-03').ok).toBe(false);
    p = grind(emptyProgress('s'), '2026-09-01', 35, true);
    const today = addDays('2026-09-01', 34);
    const st = claimStatus(p, cfg, today);
    expect(st.ok).toBe(true);
    expect(st.percent).toBe(10);
    p = recordClaim(p, { day: today, code: 'X', percent: 10, rank: 2, expires: addDays(today, 20) });
    const cool = claimStatus(p, cfg, today);
    expect(cool.ok).toBe(false);
    expect(activeClaim(p, addDays(today, 20))?.code).toBe('X');
    expect(activeClaim(p, addDays(today, 21))).toBeNull();
  });

  it('keeps 15% and 20% behind Rank Sync in v1', () => {
    let p = grind(emptyProgress('s'), '2026-01-01', 200, true);
    const today = addDays('2026-01-01', 199);
    expect(rankIndex(cfg, p.rankXP)).toBe(4);
    expect(claimStatus(p, cfg, today).percent).toBe(10);
    expect(claimStatus(p, cfg, today, { rankSync: true }).percent).toBe(20);
    // v1 hands out the 10% tier, so its 90-day cooldown applies even at the top rank.
    p = recordClaim(p, { day: today, code: 'X', percent: 10, rank: 4, expires: today });
    expect(claimStatus(p, cfg, addDays(today, 61)).ok).toBe(false);
  });

  it('requires verified days unless verification is skipped', () => {
    let p = emptyProgress('s');
    for (let i = 0; i < 40; i++) {
      const d = addDays('2026-09-01', i);
      p = checkIn(p, cfg, d, { verified: false }).progress;
      p = setNonNegotiable(p, cfg, d, 'x').progress;
      p = completeMission(p, cfg, d, 'm').progress;
    }
    const today = addDays('2026-09-01', 39);
    expect(claimStatus(p, cfg, today).ok).toBe(false);
    expect(claimStatus(p, cfg, today, { skipVerification: true }).ok).toBe(true);
  });

  it('makes stable monthly codes', () => {
    expect(monthlyCode('k', 10, '2026-10-01')).toBe(monthlyCode('k', 10, '2026-10-31'));
    expect(monthlyCode('k', 10, '2026-10-01')).not.toBe(monthlyCode('k', 10, '2026-11-01'));
    expect(monthlyCode('k', 10, '2026-10-01')).toMatch(/^UNSETLD10-[A-Z2-9]{6}$/);
    expect(monthEnd('2026-02-10')).toBe('2026-02-28');
    expect(shortCode('a')).toHaveLength(6);
  });
});

describe('pricing', () => {
  it('computes Save 58% for $24.99/yr vs $4.99/mo', () => {
    expect(savingsPercent(24.99, 4.99)).toBe(58);
    expect(perMonth(24.99)).toBe(2.08);
    expect(savingsPercent(0, 4.99)).toBeNull();
    expect(savingsPercent(70, 4.99)).toBeNull();
  });
});

describe('reminders', () => {
  it('spreads reminders inside the window and stays under the iOS limit', () => {
    const now = new Date(2026, 9, 7, 6, 0);
    const slots = planReminders({ now, today: '2026-10-07', perDay: 5, startHour: 8, endHour: 22, seed: 's' });
    expect(slots.length).toBeLessThanOrEqual(MAX_PENDING);
    for (const s of slots) {
      const h = s.date.getHours() + s.date.getMinutes() / 60;
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThan(22);
    }
    const big = planReminders({ now, today: '2026-10-07', perDay: 12, startHour: 6, endHour: 23, seed: 's' });
    expect(big.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(big.length).toBe(60);
  });

  it('skips times already passed today', () => {
    const now = new Date(2026, 9, 7, 21, 0);
    const slots = planReminders({ now, today: '2026-10-07', perDay: 3, startHour: 8, endHour: 22, seed: 's', days: 1 });
    expect(slots.every(s => s.date.getTime() > now.getTime())).toBe(true);
  });
});

describe('shopify code script', () => {
  it('prints the same codes the app shows', async () => {
    const { execFileSync } = await import('node:child_process');
    const { AppConfig } = await import('../../config/app');
    const out = execFileSync('node', ['scripts/shopify-codes.mjs'], { encoding: 'utf8' });
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    expect(out).toContain(monthlyCode(AppConfig.codeSalt, 10, day));
  });
});
