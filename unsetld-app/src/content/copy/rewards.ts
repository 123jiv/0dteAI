// Rewards (MISSIONS_SPEC section 10), Access and the milestone pages.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.

const pts = (n: number) => n.toLocaleString('en-US');

export const REWARDS_COPY = {
  title: 'Rewards',

  // Balance
  balanceUnit: (n: number) => (n === 1 ? 'POINT' : 'POINTS'),
  balanceA11y: (n: number) => (n === 1 ? '1 point' : `${pts(n)} points`),
  earnedOnly: "Points come only from proven missions. Full Edition doesn't change them.",
  number: pts,

  // Next reward
  next: 'NEXT REWARD',
  have: (have: number, need: number) => `${pts(have)} / ${pts(need)}`,
  left: (n: number) => (n === 1 ? '1 POINT LEFT' : `${pts(n)} POINTS LEFT`),
  isReady: (title: string) => `${title.toUpperCase()} IS READY`,
  nextA11y: (title: string, left: number) => (left > 0 ? `${title}: ${pts(left)} points left` : `${title} is ready`),
  allTaken: "You've taken every reward open this collection. More come with the next one.",
  /** No tier is switched on or in its dates. */
  noneOpen: 'No rewards are open right now. Your points keep counting.',

  // Tiers
  tiers: 'ALL REWARDS',
  tierPoints: pts,
  status: {
    ready: 'READY',
    short: (n: number) => `${pts(n)} TO GO`,
    used: 'USED THIS COLLECTION',
    unavailable: 'NOT AVAILABLE',
  },
  tierA11y: (title: string, points: number, detail: string, status: string) => `${title}, ${pts(points)} points. ${detail} ${status}`,
  signInNote: 'Codes need a free account, so unsetld.com can hold your place. It takes one tap.',
  signIn: 'Sign in',
  /** A code whose reward is no longer in the list. */
  unknownReward: 'Reward',

  // Redeem
  confirmTitle: (points: number) => `Trade ${pts(points)} points?`,
  confirmBody: (title: string, detail: string, days: number) => `${title}. ${detail} The code works for ${days} days.`.replace(/\s+/g, ' '),
  confirmYes: 'Get the code',
  confirmNo: 'Cancel',
  working: 'Getting your code…',
  errors: {
    used: 'You took this one this collection. It opens again with the next collection.',
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
  /** `date` as shortDate gives it ('8 NOV'); the month reads in sentence case here. */
  worksUntil: (date: string) => `Works until ${date.replace(/[A-Z]{2,}/g, m => m[0] + m.slice(1).toLowerCase())}. One order.`,
  previewCode: 'Preview build: this code is not real.',
  done: 'Done',
  never: 'Never settle for less.',

  // Your codes
  codes: 'YOUR CODES',
  legacyTitle: (percent: number) => `${percent}% off`,
  untilShort: (date: string) => `UNTIL ${date}`,
  expired: 'EXPIRED',
  codeA11y: (title: string, code: string, until: string) => `${title}. Code ${code}. ${until}`,
  codeHint: 'Copy it or use it at unsetld.com',
  sheetA11y: 'Your new code',

  // How points are earned (shown with Access on or off)
  earning: 'HOW POINTS ARE EARNED',
  earningRows: {
    quick: 'Quick win',
    progress: 'Progress',
    challenge: 'Challenge',
    perfect: 'Perfect day',
  },
  plus: (n: number) => `+${n}`,
  perfectNote: 'Every mission in the day proven. On top of the missions.',

  // Access (moved here from Record). Day counts are active days.
  access: 'Access',
  accessNote: "Earned with days you prove a mission. It can't be bought.",
  road: (n: number) => (n === 1 ? '1 day proven, on the road to 365' : `${n} days proven, on the road to 365`),
  /** `left`: days with a proven mission still needed to reopen it. */
  pausedNote: (left: number) => `Early access is paused. Prove a mission on ${left === 1 ? '1 more day' : `${left} more days`} to open it again.`,
  milestoneStatus: {
    open: 'OPEN',
    used: 'USED',
    paused: 'PAUSED',
    left: (n: number) => (n === 1 ? '1 DAY' : `${n} DAYS`),
  },
  milestoneA11y: (day: number, title: string, short: string, status: string) => `Day ${day}, ${title}. ${short} ${status}`,
  terms: 'Rewards and access terms',

  // Milestone page
  milestone: {
    termsLink: 'Rewards and access terms',
    signInNote: 'Sign in to use access. It takes one tap.',
    networkError: "Couldn't reach unsetld.com. Try again in a moment.",
    pausedError: 'Access is paused. Prove a mission on 7 more days to open it again.',
    openDrop: (c: string) => `Open Collection ${c}`,
    notificationsOff: 'Notifications are off for unsetld.',
    openSettings: 'Open Settings',
    progress: (have: number, need: number) => `${have} / ${need} DAYS PROVEN`,
    progressA11y: (have: number, need: number) => `${have} of ${need} days proven`,
  },
} as const;
