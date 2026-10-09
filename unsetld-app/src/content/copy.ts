// Shared strings: the wordmark, the first screen, letters, the account page and a few
// accessibility labels. Each 3.0 screen group keeps its own strings in copy/<group>.ts.
// Sentence case, no exclamation marks. Straight quotes here become typographic at display time.

export const COPY = {
  wordmark: 'unsetld',
  /** Top right of the first screen. */
  libraryLabel: (missions: number) => `${missions} MISSIONS`,

  o1: {
    figure: 'FIG. 01',
    defs: ['Not finished.', 'Not willing to settle for less.'],
    begin: 'Begin',
  },
  day: {
    done: 'Done',
  },
  reader: {
    a11y: {
      close: 'Close',
      back: 'Back',
    },
  },
  letter: {
    dayLabel: (d: number) => `DAY ${String(d).padStart(3, '0')}`,
    dayTitle: (d: number) => `Day ${d}.`,
    comebackSub: "You came back. That's the part that counts.",
    comebackBody: 'Early access is open again.',
    close: 'Close',
  },
  account: {
    title: 'Account',
    body: 'You only need an account to use reward codes and access: discount codes, early access and the patch. Your missions, proof photos and points stay on this phone.',
    legal: "By signing in you confirm you're 13 or over and live in the US. If you're under 18, check with a parent first.",
    signedIn: (email: string) => `Signed in as ${email}`,
    signedInApple: 'Signed in with Apple',
    signOut: 'Sign out',
    deleteAccount: 'Delete account',
    deleteTitle: 'Delete your account?',
    deleteBody: 'This removes your account and what unsetld.com holds for it: your days, proof counts and points. Your missions and proof photos stay on this phone.',
    deleteYes: 'Delete',
    deleteNo: 'Cancel',
    deleteError: "Couldn't delete your account. Try again in a moment.",
    deleteSignIn: 'Sign in again to delete your account.',
    error: "Couldn't sign in. Try again in a moment.",
    previewButton: 'Sign in with Apple',
    previewNote: 'Preview build: sign-in is simulated.',
  },
} as const;
