// Rewards (docs/UX_REDESIGN.md section 9): the Rewards tab, All rewards, Reward history,
// How points work, UNSETLD status, the milestone pages and the code sheet.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.
// Thresholds, prices and limits are never written here: they come from the reward and
// status tiers (content/rewards.json, content/milestones.json or unsetld.com's config).
import type { RewardTier } from '../../core/types';

const pts = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${pts(n)} ${many}`);
/** Dollars as the store shows them: $25, $49.50. */
const money = (n: number) => (Number.isInteger(n) ? `$${pts(n)}` : `$${n.toFixed(2)}`);
/** core/time shortDate ('8 NOV') with the month in sentence case ('8 Nov'). */
const date = (d: string) => d.replace(/[A-Z]{2,}/g, m => m[0] + m.slice(1).toLowerCase());

/**
 * A tier's limits, from its fields: "Up to $25 off", "Orders of $50 or more", "Code works 30
 * days", "One each collection" or "Once only", "Then 14 days before the next".
 */
function rules(t: RewardTier): string[] {
  const out: string[] = [];
  if (typeof t.maxOff === 'number') out.push(`Up to ${money(t.maxOff)} off`);
  if (typeof t.minimumPurchase === 'number' && t.minimumPurchase > 0) out.push(`Orders of ${money(t.minimumPurchase)} or more`);
  out.push(`Code works ${plural(t.codeValidDays, 'day', 'days')}`);
  if (t.oneTimeOnly) out.push('Once only');
  else out.push(t.perCollection === 1 ? 'One each collection' : `Up to ${pts(t.perCollection)} each collection`);
  if (!t.oneTimeOnly && typeof t.redemptionCooldownDays === 'number' && t.redemptionCooldownDays > 0) {
    out.push(`Then ${plural(t.redemptionCooldownDays, 'day', 'days')} before the next`);
  }
  return out;
}

export const REWARDS_COPY = {
  title: 'Rewards',
  number: pts,
  date,

  // Balance
  pointsUnit: (n: number) => (n === 1 ? 'point' : 'points'),
  balanceA11y: (n: number) => plural(n, 'point', 'points'),
  /** Nothing earned yet (Day 1): no zero, the way to the first points. */
  firstPoints: 'Your first proven mission earns your first points.',
  /** Rewards switched off (accessEnabled false): the page stays calm, points keep counting. */
  off: "Rewards aren't open right now. Your points keep counting.",

  // Next reward
  next: 'NEXT REWARD',
  progress: (have: number, need: number) => `${pts(Math.min(have, need))} / ${pts(need)} · ${plural(Math.max(0, need - have), 'point', 'points')} left`,
  /** Nothing earned yet: no "0 / 300". */
  progressFirst: (need: number) => `${pts(need)} points to your first reward`,
  ready: 'Ready',
  getCode: 'Get the code',
  nextA11y: (title: string, have: number, need: number) =>
    have >= need ? `Next reward: ${title}, ready` : `Next reward: ${title}. ${pts(have)} of ${pts(need)} points, ${plural(need - have, 'point', 'points')} left`,
  /** What a ready reward gives, under its meter: "600 points · Up to $25 off · Code works 30 days". */
  readyLine: (t: RewardTier) => [`${pts(t.points)} points`, ...rules(t)].slice(0, 3).join(' · '),
  allTaken: "You've taken every reward open this collection. More open with the next one.",
  /** Every open reward is cooling down; `d` is when the first one opens again. */
  coolingNext: (d: string) => `Your next reward opens again ${date(d)}.`,
  /** No tier is switched on, in its dates or out of its cooldown. */
  noneOpen: 'No rewards are open right now. Your points keep counting.',
  signInNote: 'Codes need a free account. It takes one tap.',

  // Up next
  upNext: 'UP NEXT',
  upNextA11y: (title: string, points: number) => `${title}, ${plural(points, 'point', 'points')}`,

  // Links
  links: {
    all: 'All rewards',
    history: 'Reward history',
    /** How many codes taken, beside Reward history. */
    historyValue: (n: number) => plural(n, 'code', 'codes'),
    how: 'How points work',
  },

  // The status card on the Rewards tab
  statusCard: {
    kicker: 'UNSETLD STATUS',
    /** The tier still ahead, so it doesn't read as one already held. */
    next: (title: string) => `Next: ${title}`,
    /** `n` active days of the next tier's `day`. */
    progress: (n: number, day: number) => (n === 0 ? `At ${plural(day, 'active day', 'active days')}` : `${pts(n)} / ${pts(day)} active days · ${pts(day - n)} to go`),
    allReached: (n: number) => `${plural(n, 'active day', 'active days')}. Every tier is open to you.`,
    allReachedTitle: 'Every tier reached',
    paused: 'Early access is paused.',
    a11y: (title: string, n: number, day: number) => `UNSETLD status. Next: ${title} at ${plural(day, 'active day', 'active days')}. You have ${pts(n)}.`,
    a11yAll: (n: number) => `UNSETLD status. ${plural(n, 'active day', 'active days')}. Every tier reached.`,
  },

  // All rewards
  all: {
    title: 'All rewards',
    intro: 'Trade points for a code at unsetld.com.',
    pointsKicker: (n: number) => `${pts(n)} POINTS`,
    status: {
      ready: 'Ready',
      short: (n: number) => `${pts(n)} to go`,
      used: 'Used this collection',
      usedOnce: 'Used',
      cooldown: 'Cooling down',
      unavailable: 'Not available',
    },
    /** Under a tier that can't be taken yet. */
    usedLine: 'Opens again with the next collection.',
    cooldownLine: (d: string) => `Opens again ${date(d)}.`,
    rules,
    /** The tier's line and its limits as short sentences: "One order at unsetld.com. Up to $25 off. Code works 30 days." */
    terms: (t: RewardTier) => [t.detail.trim().replace(/\.?$/, '.'), ...rules(t).map(x => `${x}.`)].filter(x => x !== '.').join(' '),
    tierA11y: (t: RewardTier, status: string) => `${t.title}, ${plural(t.points, 'point', 'points')}. ${status}. ${[t.detail, ...rules(t)].filter(Boolean).join('. ')}`,
  },

  // Redeem
  confirmTitle: (points: number) => `Trade ${pts(points)} points?`,
  confirmBody: (t: RewardTier) => {
    const limits = [typeof t.maxOff === 'number' ? `Up to ${money(t.maxOff)} off` : '', typeof t.minimumPurchase === 'number' && t.minimumPurchase > 0 ? `on orders of ${money(t.minimumPurchase)} or more` : '']
      .filter(Boolean)
      .join(', ');
    return [`${t.title}.`, t.detail, limits ? `${limits[0].toUpperCase()}${limits.slice(1)}.` : '', `The code works for ${plural(t.codeValidDays, 'day', 'days')}.`]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ');
  },
  confirmYes: 'Get the code',
  confirmNo: 'Cancel',
  working: 'Getting your code…',
  errors: {
    used: "You've taken this one. It opens again with the next collection.",
    cooldown: "You took this one recently. It opens again once its wait is over.",
    short: "unsetld.com hasn't counted all your points yet. Try again in a moment.",
    unavailable: "This reward isn't available right now.",
    network: "Couldn't reach unsetld.com. Try again in a moment.",
  },

  // The code, right after redeeming
  codeLabel: 'YOUR CODE',
  copy: 'Copy',
  copied: 'Copied',
  copyA11y: (code: string) => `Copy code ${code}`,
  copyCode: 'Copy code',
  cancel: 'Cancel',
  use: 'Use it at unsetld.com',
  /** `d` as shortDate gives it ('8 NOV'). */
  worksUntil: (d: string) => `Works until ${date(d)}. One order.`,
  previewCode: 'Preview build: this code is not real.',
  done: 'Done',
  never: 'Never settle for less.',
  sheetA11y: 'Your new code',

  // Reward history
  history: {
    title: 'Reward history',
    emptyTitle: 'No codes yet.',
    emptyBody: 'Codes you take show up here, with the day each one runs out.',
    /** A 2.x code. */
    legacyTitle: (percent: number) => `${percent}% off`,
    /** A code whose reward is no longer in the list. */
    unknownReward: 'Reward',
    /** Rewards that were taken out of the list, so codes already taken keep their name. */
    retiredRewards: { 'free-shipping': 'Free shipping' } as Record<string, string>,
    line: (taken: string, until: string, expired: boolean) => `Taken ${date(taken)} · ${expired ? `Ran out ${date(until)}` : `Works until ${date(until)}`}`,
    a11y: (title: string, code: string, line: string) => `${title}. Code ${code}. ${line}`,
    hint: 'Copy it or use it at unsetld.com',
  },

  // How points work
  how: {
    title: 'How points work',
    intro: 'Every mission you prove in the app earns its points, once.',
    earning: 'EARNING',
    earningNote: 'The longer a mission takes, the more it’s worth.',
    /**
     * By how long a mission takes, matching the library's rule (scripts/validate-content.mjs
     * pointsFor: up to 5 min +5, up to 20 +10, up to 35 +15 or +20, under 60 +20, an hour +25).
     * `said` is what VoiceOver reads for the points.
     */
    rows: [
      { title: 'A few minutes', value: '+5', said: '5 points' },
      { title: '10–20 minutes', value: '+10', said: '10 points' },
      { title: '25–45 minutes', value: '+15 to +20', said: '15 to 20 points' },
      { title: 'An hour', value: '+25', said: '25 points' },
    ],
    perfect: 'Perfect day',
    perfectNote: 'Every mission in the day proven. On top of the missions.',
    plus: (n: number) => `+${n}`,
    plusSaid: (n: number) => plural(n, 'point', 'points'),
    earnedOnly: "Points come only from proven missions. They don't expire, and UNSETLD+ doesn't change them.",
    codes: 'CODES',
    codesBody: [
      'When a reward is ready, trade its points for a code. The points are spent when you take it.',
      'A code is for one order at unsetld.com. Each reward shows how long its code works and its limits.',
      'Most rewards can be taken once each collection. A new collection opens them again.',
    ],
    status: 'UNSETLD STATUS',
    statusBody: "Status isn't bought with points. It comes with active days: days you prove at least one mission.",
    limits: 'LIMITS',
    limitsBody: ["One code per order. Codes don't combine with other codes.", "No cash value. Points and codes can't be sold, bought or transferred."],
  },

  // UNSETLD status
  status: {
    title: 'Status',
    intro: "Earned with days you prove a mission. It can't be bought.",
    daysUnit: (n: number) => (n === 1 ? 'active day' : 'active days'),
    daysA11y: (n: number) => plural(n, 'active day', 'active days'),
    /** No active day yet: no zero. */
    first: "Prove a mission today and it's your first active day.",
    road: (n: number, last: number) => `${plural(n, 'active day', 'active days')}, on the road to ${pts(last)}`,
    tierKicker: (day: number) => `${pts(day)} ${day === 1 ? 'ACTIVE DAY' : 'ACTIVE DAYS'}`,
    /** `left`: active days still needed to reopen it. */
    pausedNote: (left: number) => `Early access is paused. Prove a mission on ${left === 1 ? '1 more day' : `${left} more days`} to open it again.`,
    state: {
      open: 'Open',
      /** A display-only tier (from the config) once reached. */
      reached: 'Reached',
      used: 'Used',
      paused: 'Paused',
      left: (n: number) => `${pts(n)} to go`,
    },
    tierA11y: (day: number, title: string, short: string, state: string) => `${title}, at ${plural(day, 'active day', 'active days')}. ${short} ${state}`,
  },

  // Milestone page (one status tier)
  milestone: {
    signInNote: 'Sign in to use it. It takes one tap.',
    networkError: "Couldn't reach unsetld.com. Try again in a moment.",
    /** unsetld.com says it's paused; `left` as this phone counts it. */
    pausedError: (left: number) => `Early access is paused. Prove a mission on ${left === 1 ? '1 more day' : `${left} more days`} to open it again.`,
    openDrop: (c: string) => `Open Collection ${c}`,
    notificationsOff: 'Notifications are off for UNSETLD.',
    openSettings: 'Open Settings',
    progress: (have: number, need: number) => `${pts(Math.min(have, need))} / ${pts(need)} active days`,
    progressA11y: (have: number, need: number) => `${pts(Math.min(have, need))} of ${pts(need)} active days`,
  },
} as const;
