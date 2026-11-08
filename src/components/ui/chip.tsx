import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { radii, spacing, useThemeColors } from '@/theme';

export type ChipTone = 'default' | 'income' | 'expense';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  tone?: ChipTone;
};

export function Chip({ label, active = false, onPress, icon, tone = 'default' }: ChipProps) {
  const colors = useThemeColors();
  const activeBackground = tone === 'income'
    ? colors.incomeSoft
    : tone === 'expense'
      ? colors.expenseSoft
      : colors.primarySoft;
  const activeText = tone === 'income' ? 'income' : tone === 'expense' ? 'expense' : 'text';
  const activeBorder = tone === 'income' ? colors.income : tone === 'expense' ? colors.expense : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active ? { backgroundColor: activeBackground, borderColor: activeBorder } : [styles.inactive, { backgroundColor: colors.surface, borderColor: colors.border }],
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={15} color={active ? activeText : 'textSecondary'} />
      ) : null}
      <AppText variant="captionStrong" color={active ? activeText : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inactive: {
  },
  pressed: {
    opacity: 0.75,
  },
});
