import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

import { colors, radii, spacing } from '@/theme';

export type ChipTone = 'default' | 'income' | 'expense';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  tone?: ChipTone;
};

export function Chip({ label, active = false, onPress, icon, tone = 'default' }: ChipProps) {
  const activeColor =
    tone === 'income' ? colors.income : tone === 'expense' ? colors.expense : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active ? { backgroundColor: activeColor, borderColor: activeColor } : styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={15} color={active ? 'textInverse' : 'textSecondary'} />
      ) : null}
      <AppText variant="captionStrong" color={active ? 'textInverse' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
});
