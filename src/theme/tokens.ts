import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Smart Money Tracker design tokens.
 *
 * The app is intentionally light-first. Deep forest green is the primary brand
 * colour; green indicates income and red indicates expenses/negative values.
 */
export const colors = {
  primary: '#1B4332',
  primaryPressed: '#143528',
  primarySoft: '#E6F0E9',
  primaryMuted: '#B7D0C1',

  background: '#F4F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1EC',

  border: '#E2E8E2',
  borderStrong: '#C8D3CA',

  text: '#14261C',
  textSecondary: '#53655A',
  textMuted: '#85948A',
  textInverse: '#FFFFFF',

  income: '#1C7C4A',
  incomeSoft: '#E3F3EA',

  expense: '#C24132',
  expenseSoft: '#FBEAE7',

  warning: '#A56A15',
  warningSoft: '#FBF0DC',

  overlay: 'rgba(10, 24, 16, 0.48)',
  disabled: '#B8C3BA',
} as const;

export type ColorName = keyof typeof colors;

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const textStyles = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  h1: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
  },
  h3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  amount: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  amountSmall: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;

export const shadows = {
  card: {
    shadowColor: '#0B1F14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#0B1F14',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  screenPadding: spacing.xl,
  maxContentWidth: 720,
  webTabBarInset: 72,
} as const;
