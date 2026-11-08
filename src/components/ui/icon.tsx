import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { type ColorName, useThemeColors } from '@/theme';

/**
 * Semantic icon registry. Each entry maps to an SF Symbol on iOS and a Material
 * Symbol on Android/web, keeping icons consistent across the app.
 */
export const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  transactions: { ios: 'list.bullet.rectangle', android: 'receipt_long' },
  add: { ios: 'plus.circle.fill', android: 'add_circle' },
  budgets: { ios: 'chart.pie.fill', android: 'donut_large' },
  profile: { ios: 'person.crop.circle.fill', android: 'person' },
  profileCircle: { ios: 'person.crop.circle', android: 'account_circle' },
  profileBadge: { ios: 'person.text.rectangle.fill', android: 'badge' },
  profileOutline: { ios: 'person.crop.square', android: 'person_outline' },
  avatarSmile: { ios: 'face.smiling.fill', android: 'sentiment_satisfied' },
  avatarPaw: { ios: 'pawprint.fill', android: 'pets' },
  avatarRabbit: { ios: 'hare.fill', android: 'cruelty_free' },
  avatarLeaf: { ios: 'leaf.fill', android: 'eco' },
  avatarFlower: { ios: 'camera.macro', android: 'local_florist' },
  avatarStar: { ios: 'star.fill', android: 'star' },
  avatarHeart: { ios: 'heart.fill', android: 'favorite' },
  avatarMountain: { ios: 'mountain.2.fill', android: 'landscape' },
  avatarTravel: { ios: 'airplane', android: 'flight' },
  avatarMusic: { ios: 'music.note', android: 'music_note' },
  search: { ios: 'magnifyingglass', android: 'search' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list' },
  sort: { ios: 'arrow.up.arrow.down', android: 'sort' },
  income: { ios: 'arrow.down.left', android: 'arrow_downward' },
  expense: { ios: 'arrow.up.right', android: 'arrow_upward' },
  transfer: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  close: { ios: 'xmark', android: 'close' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  wallet: { ios: 'wallet.bifold', android: 'wallet' },
  account: { ios: 'building.columns.fill', android: 'account_balance' },
  cash: { ios: 'banknote.fill', android: 'payments' },
  mobileMoney: { ios: 'iphone', android: 'smartphone' },
  target: { ios: 'target', android: 'target' },
  info: { ios: 'info.circle', android: 'info' },
  reset: { ios: 'arrow.clockwise', android: 'refresh' },
  shield: { ios: 'shield.fill', android: 'shield' },
  delete: { ios: 'trash.fill', android: 'delete' },
  calculator: { ios: 'square.grid.2x2.fill', android: 'calculate' },
  lightMode: { ios: 'sun.max.fill', android: 'light_mode' },
  darkMode: { ios: 'moon.fill', android: 'dark_mode' },

  // Expense categories
  food: { ios: 'fork.knife', android: 'restaurant' },
  transport: { ios: 'bus.fill', android: 'directions_bus' },
  accommodation: { ios: 'house.fill', android: 'home_work' },
  airtime: { ios: 'iphone', android: 'smartphone' },
  education: { ios: 'graduationcap.fill', android: 'school' },
  entertainment: { ios: 'film.fill', android: 'movie' },
  shopping: { ios: 'bag.fill', android: 'shopping_bag' },
  healthcare: { ios: 'cross.case.fill', android: 'medical_services' },
  personalCare: { ios: 'sparkles', android: 'spa' },
  utilities: { ios: 'bolt.fill', android: 'bolt' },
  otherExpenses: { ios: 'square.grid.2x2.fill', android: 'more_horiz' },

  // Income categories
  allowance: { ios: 'banknote.fill', android: 'account_balance_wallet' },
  salary: { ios: 'briefcase.fill', android: 'work' },
  freelance: { ios: 'laptopcomputer', android: 'laptop' },
  business: { ios: 'storefront.fill', android: 'store' },
  scholarship: { ios: 'graduationcap.fill', android: 'school' },
  gifts: { ios: 'gift.fill', android: 'redeem' },
  otherIncome: { ios: 'ellipsis.circle.fill', android: 'payments' },
} as const;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
  weight?: SymbolViewProps['weight'];
  style?: SymbolViewProps['style'];
};

export function Icon({ name, size = 20, color = 'textSecondary', weight, style }: IconProps) {
  const colors = useThemeColors();
  const symbol = ICONS[name];

  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={colors[color]}
      weight={weight}
      style={style}
    />
  );
}
