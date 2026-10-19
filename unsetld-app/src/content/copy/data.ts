// Delete data on this phone (You › YOUR DATA): what it removes and what it leaves, the confirm,
// and the lines it adds to Account. Local only: no network call, so it works offline and signed
// out. Delete account (Account) is the server one; neither does the other.
// Sentence case, no exclamation marks. Straight quotes here become typographic at display time.

export const DATA = {
  /** The group in You, between ACCOUNT and HELP. */
  section: 'YOUR DATA',
  row: 'Delete data on this phone',
  rowDetail: 'Record, points, plans, settings and photos',

  title: 'Delete data on this phone',
  body: "UNSETLD goes back to its first screen, as if you'd just installed it. This can't be undone.",

  goesLabel: 'WHAT GOES',
  /** The brief's eight: record, points, plans, settings, missions you wrote, proof photos, sign-in, the Keychain copy. */
  goes: [
    'Your record: every day, proof and streak',
    "Points, and reward codes you've taken",
    "Plans, this week's focus and today's missions",
    'Your areas, goal, answers and settings',
    'Missions you wrote yourself',
    'Proof photos',
    'Sign-in on this phone',
    "The copy of your record in this iPhone's Keychain, so a reinstall starts fresh too",
  ],

  staysLabel: 'WHAT STAYS',
  stays: [
    "UNSETLD+. It belongs to your Apple ID. If it doesn't show, use Restore purchases.",
    'Share cards you saved, and anything already in an iPhone backup.',
    'Camera and notification access, in iOS Settings.',
  ],
  /** Only during a free trial: its reminder is kept, so the charge never comes as a surprise. */
  staysTrial: 'The reminder before your free trial ends.',

  /** A code taken with points that still works would be lost with the record. */
  liveCodes: (n: number) =>
    n === 1 ? 'You have 1 code that still works. Copy it from Reward history first.' : `You have ${n} codes that still work. Copy them from Reward history first.`,
  rewardHistory: 'Reward history',

  signedIn: "You're signed in. This signs you out here. Your account on unsetld.com stays until you delete it.",
  deleteAccountFirst: 'Delete account first',

  button: 'Delete data on this phone',
  working: 'Deleting',
  error: "Couldn't delete everything. Try again in a moment.",

  confirm: {
    title: 'Delete everything on this phone?',
    body: (signedIn: boolean) =>
      `Your record, points, plans, settings and proof photos are removed from this iPhone. This can't be undone.${signedIn ? " Your unsetld.com account isn't deleted." : ''}`,
    yes: 'Delete',
    no: 'Cancel',
  },

  /** Said by VoiceOver once onboarding's first screen is back. */
  done: 'Data deleted.',

  /** Account: Delete account keeps what's on this phone, and says where to clear it. */
  account: {
    clearToo: 'To clear them too, use Delete data on this phone in You.',
    deleted: 'Account deleted.',
  },
};
