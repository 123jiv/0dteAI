// Design tokens from docs/DESIGN_SPEC.md section 2. UI chrome is always on ink;
// colorways apply only to the reader pages, share cards and widgets.
import { Easing, StyleSheet } from 'react-native';

export const color = {
  ink: '#0A0A0A',
  raise: '#141414',
  rule: '#2A2825',
  ruleStrong: '#3A3633',
  bone: '#EDE9E3',
  stone: '#8F8A83',
  muted: '#B3AEA7',
  ash: '#57534E',
  greyLetter: '#45423E',
  /** Today only: the barcode bar and the week square. Never a fill, button, badge, border or text. */
  signal: '#C41E1E',
  notification: '#1F1E1C',
  /** A card on ink: a quiet raised surface instead of a rule around it. */
  card: '#151413',
  /** A pressed card. */
  cardPressed: '#1C1B19',
  /** The empty part of a meter (progress bar). */
  track: '#2A2825',
} as const;

export const font = {
  serifRegular: 'CormorantGaramond_400Regular',
  serif: 'CormorantGaramond_500Medium',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
} as const;

/** Side margin on every screen. */
export const MARGIN = 28;
export const hairline = StyleSheet.hairlineWidth;

export const radius = { button: 2, sheet: 14, card: 12, meter: 2 } as const;

/** Space between blocks on a page (cards, sections). Generous: spacing, not rules, separates things. */
export const GAP = { tight: 8, card: 12, block: 28, section: 40 } as const;

export const ease = {
  out: Easing.bezier(0.2, 0, 0, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
};

export type TextVariant =
  | 'title.xl'
  | 'title.l'
  | 'title.m'
  | 'headword'
  | 'letter.day'
  | 'letter.sub'
  | 'list'
  | 'saved'
  | 'italic'
  | 'numeral'
  | 'price'
  | 'row'
  | 'body'
  | 'small'
  | 'note'
  | 'fine'
  | 'label'
  | 'button'
  | 'mono'
  | 'mono.s'
  | 'mono.l'
  | 'meta'
  | 'kicker'
  | 'stat';

interface Spec {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  uppercase?: boolean;
  serif?: boolean;
  tabular?: boolean;
}

export const TYPE: Record<TextVariant, Spec> = {
  'title.xl': { fontFamily: font.serif, fontSize: 44, lineHeight: 46, letterSpacing: -0.6, serif: true },
  'title.l': { fontFamily: font.serif, fontSize: 40, lineHeight: 43, letterSpacing: -0.5, serif: true },
  'title.m': { fontFamily: font.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.3, serif: true },
  headword: { fontFamily: font.serif, fontSize: 64, lineHeight: 66, letterSpacing: -1, serif: true },
  'letter.day': { fontFamily: font.serif, fontSize: 56, lineHeight: 58, letterSpacing: -0.8, serif: true },
  'letter.sub': { fontFamily: font.serif, fontSize: 28, lineHeight: 32, letterSpacing: 0, serif: true },
  list: { fontFamily: font.serif, fontSize: 23, lineHeight: 27, letterSpacing: 0, serif: true },
  saved: { fontFamily: font.serif, fontSize: 20, lineHeight: 24, letterSpacing: 0, serif: true },
  italic: { fontFamily: font.serifItalic, fontSize: 24, lineHeight: 28, letterSpacing: 0, serif: true },
  numeral: { fontFamily: font.serifRegular, fontSize: 112, lineHeight: 100, letterSpacing: -3, serif: true, tabular: true },
  price: { fontFamily: font.sansSemi, fontSize: 17, lineHeight: 22, tabular: true },
  row: { fontFamily: font.sansMedium, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.sans, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  note: { fontFamily: font.sans, fontSize: 13, lineHeight: 18 },
  fine: { fontFamily: font.sans, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: font.sansMedium, fontSize: 10.5, lineHeight: 14, letterSpacing: 2.6, uppercase: true },
  button: { fontFamily: font.sansSemi, fontSize: 12.5, lineHeight: 16, letterSpacing: 2.5, uppercase: true },
  mono: { fontFamily: font.mono, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, tabular: true },
  'mono.s': { fontFamily: font.mono, fontSize: 10, lineHeight: 13, letterSpacing: 0.4, tabular: true },
  'mono.l': { fontFamily: font.mono, fontSize: 17, lineHeight: 22, letterSpacing: 0.2, tabular: true },
  /** Utility line: time, proof type, points ("30 min · Timer + photo · +15 pts"). Sentence case. */
  meta: { fontFamily: font.sans, fontSize: 13, lineHeight: 18, tabular: true },
  /** A small category label ("SCHOOL"). Spaced uppercase, used sparingly: one per card or section. */
  kicker: { fontFamily: font.sansMedium, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, uppercase: true },
  /** An important number on a card (streak, points, level). Serif. */
  stat: { fontFamily: font.serif, fontSize: 34, lineHeight: 36, letterSpacing: -0.5, serif: true, tabular: true },
};
