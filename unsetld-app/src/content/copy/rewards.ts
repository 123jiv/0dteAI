// Rewards (docs/UX_REDESIGN.md section 9): the Rewards tab, All rewards, Reward history,
// How points work, UNSETLD status, a status tier's page, the status letter and the code sheet.
// Every reward is a discount code: points buy the points rewards, days proven earn the status
// ones. Sentence case, no exclamation marks. Straight quotes become typographic at display time.
// Thresholds, prices and limits are never written here: they come from the reward and
// status tiers (content/rewards.json, content/milestones.json or unsetld.com's config).
import type { RewardTier, StatusTier } from '../../core/types';

const pts = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${pts(n)} ${many}`);
/** Dollars as the store shows them: $25, $49.50. */
const money = (n: number) => (Number.isInteger(n) ? `$${pts(n)}` : `$${n.toFixed(2)}`);
/** core/time shortDate ('8 NOV') with the month in sentence case ('8 Nov'). */
const date = (d: string) => d.replace(/[A-Z]{2,}/g, m => m[0] + m.slice(1).toLowerCase());
/** Status counts days proven: days with at least one proven mission. "1 day proven", "29 days proven". */
const proven = (n: number) => plural(n, 'day proven', 'days proven');
/** A status tier's cap, from its maxOff: "Up to $25 off", or "One order at unsetld.com" with no cap. */
const cap = (t: Pick<StatusTier, 'maxOff'>) => (typeof t.maxOff === 'number' ? `Up to ${money(t.maxOff)} off` : 'One order at unsetld.com');

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
  /** Rewards switched off (accessEnabled false). Promises nothing: says what points do now. */
  off: "Rewards aren't open. Points still count toward your area levels on your Record.",

  // Next reward
  next: 'NEXT REWARD',
  progress: (have: number, need: number) => `${pts(Math.min(have, need))} / ${pts(need)} · ${plural(Math.max(0, need - have), 'point', 'points')} left`,
  /** Nothing earned yet: no "0 / 300". */
  progressFirst: (need: number) => `${pts(need)} points to your first reward`,
  ready: 'Ready',
  getCode: 'Get the code',
  /** `first`: nothing earned yet, said as the card shows it (no "0 of 300"). */
  nextA11y: (title: string, have: number, need: number, first = false) =>
    have >= need
      ? `Next reward: ${title}, ready`
      : first
        ? `Next reward: ${title}. ${pts(need)} points to your first reward`
        : `Next reward: ${title}. ${pts(have)} of ${pts(need)} points, ${plural(need - have, 'point', 'points')} left`,
  /** What a ready reward gives, under its meter: "600 points · Up to $25 off · Code works 30 days". */
  readyLine: (t: RewardTier) => [`${pts(t.points)} points`, ...rules(t)].slice(0, 3).join(' · '),
  allTaken: "You've taken every reward open this collection. More open with the next one.",
  /** Every open reward is cooling down; `d` is when the first one opens again. */
  coolingNext: (d: string) => `Your next reward opens again ${date(d)}.`,
  /** No tier is switched on, in its dates or out of its cooldown. Promises nothing. */
  noneOpen: "No rewards are open. Your points don't expire.",
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
    /** A tier reached whose code isn't taken yet: "10% off is ready". */
    ready: (title: string) => `${title} is ready`,
    readyLine: (day: number) => `Earned with ${proven(day)}.`,
    /** The tier still ahead: "Next: 15% off at 30 days". */
    next: (title: string, day: number) => `Next: ${title} at ${plural(day, 'day', 'days')}`,
    /** Under the meter: "29 / 30 days proven". Nothing proven yet: no "0 / 7". */
    progress: (n: number, day: number) => (n === 0 ? 'Starts with your first proven mission.' : `${pts(Math.min(n, day))} / ${pts(day)} days proven`),
    allTaken: 'Every status reward earned',
    allTakenLine: (n: number) => `${proven(n)}.`,
    a11yReady: (title: string, day: number) => `UNSETLD status. ${title} is ready, earned with ${proven(day)}.`,
    /** No day proven yet: no "You have 0". */
    a11y: (title: string, n: number, day: number) => `UNSETLD status. Next: ${title} at ${proven(day)}.${n > 0 ? ` You have ${proven(n)}.` : ''}`,
    a11yAll: (n: number) => `UNSETLD status. Every status reward earned. ${proven(n)}.`,
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
    /** A status code: "10% off · 7 days proven". */
    statusTitle: (title: string, day: number) => `${title} · ${proven(day)}`,
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
     * pointsFor: up to 10 min +5, up to 20 +10, up to 45 +15 or +20). The approved missions
     * run 5 to 45 minutes, so nothing earns more. `said` is what VoiceOver reads for the points.
     */
    rows: [
      { title: 'Up to 10 minutes', value: '+5', said: '5 points' },
      { title: '15–20 minutes', value: '+10', said: '10 points' },
      { title: '25–45 minutes', value: '+15 to +20', said: '15 to 20 points' },
    ],
    perfect: 'Perfect day',
    perfectNote: 'Every mission in the day proven. On top of the missions.',
    plus: (n: number) => `+${n}`,
    plusSaid: (n: number) => plural(n, 'point', 'points'),
    earnedOnly: "Points come only from proven missions. They don't expire, and UNSETLD+ doesn't change them.",
    /** Shown whether rewards are on or off: what points do besides rewards. */
    levels: "Each mission's points also count toward its area's level on your Record.",
    codes: 'CODES',
    codesBody: [
      'When a reward is ready, trade its points for a code. The points are spent when you take it.',
      'A code is for one order at unsetld.com. Each reward shows how long its code works and its limits.',
      'Most rewards can be taken once each collection. A new collection opens them again.',
    ],
    status: 'UNSETLD STATUS',
    statusBody: "Status isn't bought with points. It comes with days proven, the days you prove at least one mission, and each tier gives one discount code, once.",
    limits: 'LIMITS',
    limitsBody: ["One code per order. Codes don't combine with other codes.", "No cash value. Points and codes can't be sold, bought or transferred."],
  },

  // UNSETLD status: one discount code for each tier of days proven
  status: {
    title: 'UNSETLD status',
    intro: "Earned with days you prove a mission. It can't be bought.",
    /** The count at the top: "29" and "days proven". */
    daysUnit: (n: number) => (n === 1 ? 'day proven' : 'days proven'),
    daysA11y: proven,
    /** No day proven yet: no zero. */
    first: "Prove a mission today and it's your first day proven.",
    road: (n: number, last: number) => `${proven(n)}, on the road to ${pts(last)}`,
    /** Beside a tier's serif day number. */
    tierUnit: (day: number) => (day === 1 ? 'day proven' : 'days proven'),
    cap,
    state: {
      ready: 'Ready',
      taken: 'Taken',
      left: (n: number) => (n === 1 ? '1 day to go' : `${pts(n)} days to go`),
    },
    /** A tier taken before whose code never reached this phone (unsetld.com said it was taken but didn't send it). */
    takenElsewhere: "Taken before, maybe on another phone. There's one per person.",
    /** Under a code taken: when it runs out. `d` as shortDate gives it ('8 NOV'). */
    codeLine: (d: string, expired: boolean) => (expired ? `Ran out ${date(d)}` : `Works until ${date(d)}`),
    /** The next tier's meter: "29 / 30 days proven". */
    progress: (have: number, need: number) => `${pts(Math.min(have, need))} / ${pts(need)} days proven`,
    progressA11y: (have: number, need: number) => `${pts(Math.min(have, need))} of ${proven(need)}`,
    tierA11y: (t: Pick<StatusTier, 'day' | 'title' | 'maxOff'>, state: string) => `${t.title}, at ${proven(t.day)}. ${cap(t)}. ${state}`,
    codeA11y: (code: string, line: string) => `Code ${code}. ${line}`,

    // Taking the code (screens/rewards/redeem useRedeem, for a status tier)
    confirmTitle: (title: string) => `Get your ${title} code?`,
    /** From the tier as a reward (core/rewards statusReward): "One order at unsetld.com, up to $25 off. …" */
    confirmBody: (t: RewardTier) =>
      `One order at unsetld.com${typeof t.maxOff === 'number' ? `, up to ${money(t.maxOff)} off` : ''}. The code works for ${plural(t.codeValidDays, 'day', 'days')} from today, and there's one per person.`,
    errors: {
      used: "You've already taken this code. There's one per person.",
      cooldown: "This code isn't available right now.",
      short: "unsetld.com hasn't counted all your days yet. Try again in a moment.",
      unavailable: "This code isn't available right now.",
      network: "Couldn't reach unsetld.com. Try again in a moment.",
    },
  },

  // A status tier's page (route Milestone)
  milestone: {
    /** Under the code taken, while it still works. */
    oneOrder: 'One order at unsetld.com.',
  },

  // The status letter: a tier reached
  letter: {
    kicker: (day: number) => `${pts(day)} ${day === 1 ? 'DAY' : 'DAYS'} PROVEN.`,
    kickerA11y: (day: number) => `${proven(day)}.`,
    title: (title: string) => `${title} is yours.`,
    /** One line under the title, from the tier's fields. */
    line: (t: Pick<StatusTier, 'maxOff' | 'codeValidDays'>) =>
      `One order at unsetld.com${typeof t.maxOff === 'number' ? `, up to ${money(t.maxOff)} off` : ''}. The code works ${plural(t.codeValidDays, 'day', 'days')} from when you take it.`,
    primary: 'Get the code',
    secondary: 'Not now',
    close: 'Close',
  },
} as const;
