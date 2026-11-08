import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Smart Money Tracker design tokens.
 *
 * Neutral surfaces, quiet typography, and a single forest-green accent.
 * Semantic colours are reserved for financial direction and warnings.
 */
const FOREST_GREEN = '#123D30';
const MINT_GREEN = '#B7D1C4';
const PALE_MINT = '#EFF4F1';
const WHITE = '#FFFFFF';

const lightColors = {
  forestGreen: FOREST_GREEN,
  mintGreen: MINT_GREEN,
  paleMint: PALE_MINT,
  white: WHITE,

  primary: FOREST_GREEN,
  primaryButton: FOREST_GREEN,
  primaryPressed: '#0D3025',
  primarySoft: PALE_MINT,
  primaryMuted: MINT_GREEN,

  background: WHITE,
  surface: WHITE,
  surfaceAlt: '#F5F6F5',

  border: '#E7E9E7',
  borderStrong: '#C8CFCA',

  text: '#19201C',
  textSecondary: '#626B65',
  textMuted: '#6B736D',
  textInverse: WHITE,

  income: FOREST_GREEN,
  incomeSoft: PALE_MINT,

  expense: '#B94242',
  expenseSoft: '#FCEEEE',

  warning: '#A56A15',
  warningSoft: '#FBF0DC',

  overlay: 'rgba(14, 18, 16, 0.36)',
  disabled: '#B8C3BA',
} as const;

export const colors = lightColors;

export type ColorName = keyof typeof lightColors;

export const darkColors: Record<ColorName, string> = {
  forestGreen: '#123D30',
  mintGreen: '#8CE0B0',
  paleMint: '#D4E9DD',
  white: '#FFFFFF',

  primary: '#B7D1C4',
  primaryButton: '#1F6049',
  primaryPressed: '#A5EAC1',
  primarySoft: '#24352C',
  primaryMuted: '#8CE0B0',

  background: '#101312',
  surface: '#171B19',
  surfaceAlt: '#202522',

  border: '#2C332F',
  borderStrong: '#465149',

  text: '#E9F1EC',
  textSecondary: '#B0C0B6',
  textMuted: '#92A59A',
  textInverse: '#FFFFFF',

  income: '#B7D1C4',
  incomeSoft: '#1C392D',

  expense: '#FF8585',
  expenseSoft: '#3C2525',

  warning: '#E9B65F',
  warningSoft: '#3B301E',

  overlay: 'rgba(0, 0, 0, 0.68)',
  disabled: '#53665B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const textStyles = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  h1: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
  },
  h3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  captionStrong: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
  amount: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  amountSmall: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;

export const shadows = {
  card: {
    shadowColor: FOREST_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
  },
  sheet: {
    shadowColor: FOREST_GREEN,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 12,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  screenPadding: spacing.xl,
  maxContentWidth: 720,
  webTabBarInset: 72,
} as const;
